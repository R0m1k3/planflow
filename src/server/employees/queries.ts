import { cache } from 'react';

import { can } from '@/domain/access/authorize';
import {
  invitationState,
  type InvitationState,
} from '@/domain/access/invitation';
import { decryptOptional } from '@/server/crypto';
import { query } from '@/server/context';

/**
 * Lecture des dossiers salariés.
 *
 * `members.salary.view` ne masque pas seulement l'affichage : la rémunération
 * n'est **pas chargée** quand la capacité manque. Un champ absent de la réponse
 * ne peut pas fuiter par le HTML, un journal ou une erreur — contrairement à un
 * champ chargé puis caché à l'écran.
 */

export interface EmployeeListRow {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  /** Téléphone du dossier : la colonne « Mobile » de l'annuaire. */
  phone: string | null;
  status: string;
  hasAccount: boolean;
  roleName: string;
  contract: {
    type: string;
    label: string;
    since: Date;
    trialEndDate: Date | null;
    forfaitJours: boolean;
  } | null;
  locationName: string | null;
  teamName: string | null;
  invitationState: InvitationState | null;
}

/**
 * Critères de l'annuaire.
 *
 * Tous facultatifs, et tous appliqués **en base** plutôt qu'après lecture :
 * un effectif de plusieurs centaines de dossiers ne se filtre pas en mémoire à
 * chaque affichage.
 */
export interface EmployeeFilters {
  /** Prénom, nom ou matricule. */
  q?: string;
  locationId?: string;
  roleId?: string;
  contractType?: string;
  /** `active` par défaut : un archivé n'a rien à faire dans l'effectif courant. */
  presence?: 'active' | 'archived' | 'all';
  sort?: 'name' | 'number';
}

export interface EmployeeDirectory {
  rows: EmployeeListRow[];
  /** De quoi peupler les listes déroulantes, sans seconde requête à l'écran. */
  locations: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  contractTypes: Array<{ value: string; label: string }>;
  /** Effectif total, avant filtres : « 12 sur 87 » se lit autrement que « 12 ». */
  total: number;
}

const CONTRACT_LABELS: Record<string, string> = {
  APPRENTISSAGE: 'Apprentissage',
  CDD: 'CDD',
  CDI: 'CDI',
  DIRIGEANT_ASSIMILE_SALARIE: 'Dirigeant assimilé salarié',
  DIRIGEANT_NON_SALARIE: 'Dirigeant non salarié',
  EXTRA: 'Extra',
  INTERIM: 'Intérim',
  STAGIAIRE: 'Stagiaire',
  SAISONNIER: 'Saisonnier',
};

export function contractLabel(type: string): string {
  return CONTRACT_LABELS[type] ?? type;
}

export async function listEmployees(
  filters: EmployeeFilters = {},
): Promise<EmployeeDirectory> {
  return query('members.view', async (db) => {
    const now = new Date();
    const search = filters.q?.trim();

    // Un archivé n'appartient plus à l'effectif : il faut le demander.
    const presence =
      filters.presence === 'all'
        ? {}
        : filters.presence === 'archived'
          ? { archivedAt: { not: null } }
          : { archivedAt: null };

    // L'établissement et le type de contrat sont portés par le contrat en
    // cours, pas par le membership : le filtre passe donc par la relation.
    const contractFilter =
      filters.locationId || filters.contractType
        ? {
            contracts: {
              some: {
                status: 'ACTIVE' as const,
                ...(filters.locationId
                  ? { locationId: filters.locationId }
                  : {}),
                ...(filters.contractType
                  ? { contractType: filters.contractType as never }
                  : {}),
              },
            },
          }
        : {};

    const searchFilter = search
      ? {
          OR: [
            { employeeNumber: { contains: search, mode: 'insensitive' as const } },
            {
              profile: {
                is: {
                  OR: [
                    { firstName: { contains: search, mode: 'insensitive' as const } },
                    { lastName: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const where = {
      ...presence,
      ...contractFilter,
      ...searchFilter,
      ...(filters.roleId ? { roleId: filters.roleId } : {}),
    };

    const [memberships, total, locations, roles] = await Promise.all([
      db.membership.findMany({
        where,
        include: {
          profile: {
            select: { firstName: true, lastName: true, phone: true },
          },
          user: { select: { email: true } },
          role: { select: { name: true } },
          teams: {
            select: {
              isPrimary: true,
              team: { select: { name: true } },
            },
          },
          contracts: {
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
          invitations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { expiresAt: true, acceptedAt: true, revokedAt: true },
          },
        },
        orderBy: { employeeNumber: 'asc' },
      }),
      db.membership.count({ where: { archivedAt: null } }),
      db.location.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.role.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const locationIds = [
      ...new Set(
        memberships
          .flatMap((membership) => membership.contracts)
          .map((contract) => contract.locationId),
      ),
    ];
    const contractLocations = await db.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true },
    });
    const locationNames = new Map(
      contractLocations.map((entry) => [entry.id, entry.name]),
    );

    const rows: EmployeeListRow[] = memberships.map((membership) => {
      const contract = membership.contracts[0];
      const team =
        membership.teams.find((entry) => entry.isPrimary) ??
        membership.teams[0];
      const invitation = membership.invitations[0];

      return {
        id: membership.id,
        employeeNumber: membership.employeeNumber,
        firstName: membership.profile?.firstName ?? '',
        lastName: membership.profile?.lastName ?? membership.employeeNumber,
        email: membership.user?.email ?? null,
        phone: membership.profile?.phone ?? null,
        status: membership.status,
        hasAccount: membership.userId !== null,
        roleName: membership.role.name,
        contract: contract
          ? {
              type: contract.contractType,
              label: contractLabel(contract.contractType),
              since: contract.startDate,
              trialEndDate: contract.trialEndDate,
              forfaitJours: contract.workTimeArrangement === 'FORFAIT_JOURS',
            }
          : null,
        locationName: contract
          ? (locationNames.get(contract.locationId) ?? null)
          : null,
        teamName: team?.team.name ?? null,
        invitationState: invitation ? invitationState(invitation, now) : null,
      };
    });

    // Le tri par nom se fait ici : trier en base sur le nom du dossier
    // demanderait une jointure ordonnée, et « Étienne » se range après
    // « Etchegaray » pour Postgres, avant pour un lecteur français.
    if (filters.sort !== 'number') {
      rows.sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
          'fr',
        ),
      );
    }

    return {
      rows,
      locations,
      roles,
      contractTypes: Object.entries(CONTRACT_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
      total,
    };
  });
}

/**
 * Dossier personnel tel qu'il est saisi.
 *
 * Les trois champs chiffrés sont regroupés à part : ils ne sont pas seulement
 * masqués à l'affichage quand la capacité manque, ils sont **absents** de la
 * réponse, et l'écran de saisie qui les porte n'est alors pas rendu du tout.
 * Un formulaire affiché vide renverrait des champs vides, et effacerait ce
 * qu'il n'avait pas le droit de lire.
 */
export interface EmployeeProfileDetail {
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  birthPlace: string | null;
  nationality: string | null;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  personalEmail: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  /** Chiffrés au repos, déchiffrés seulement pour qui a le droit de les lire. */
  sensitive: {
    socialSecurityNumber: string | null;
    iban: string | null;
    bic: string | null;
  } | null;
}

export interface EmployeeDetail extends EmployeeListRow {
  /** Ce que porte le bandeau de la fiche, au-dessus des onglets. */
  headline: {
    jobTitle: string | null;
    lineManagerName: string | null;
    contractEnd: Date | null;
  };
  profile: EmployeeProfileDetail | null;
  contracts: Array<{
    id: string;
    type: string;
    label: string;
    startDate: Date;
    endDate: Date | null;
    trialEndDate: Date | null;
    weeklyHours: string;
    forfaitJours: boolean;
    forfaitDaysPerYear: string | null;
    forfaitAgreementRef: string | null;
    isModulated: boolean;
    classification: string | null;
    coefficient: string | null;
    locationName: string | null;
    status: string;
    endReason: string | null;
    /** Absent quand `members.salary.view` manque. */
    monthlySalary: string | null;
    amendments: Array<{
      id: string;
      effectiveDate: Date;
      reason: string | null;
      changes: unknown;
    }>;
  }>;
  canSeeSalary: boolean;
  canInvite: boolean;
  canEdit: boolean;
  /** Dernière invitation émise, quel que soit son sort. */
  invitation: {
    state: InvitationState;
    email: string;
    expiresAt: Date;
    createdAt: Date;
  } | null;
}

/**
 * Mémorisé le temps d'une requête : la fiche est désormais un gabarit à
 * onglets, et le gabarit comme l'onglet ont besoin du même dossier. Sans cela,
 * chaque affichage le lirait deux fois.
 */
export const getEmployee = cache(async function getEmployee(
  id: string,
): Promise<EmployeeDetail | null> {
  return query('members.view', async (db, actor) => {
    const canSeeSalary = can(actor, 'members.salary.view');
    const canSeeDocuments = can(actor, 'members.documents.view');

    const membership = await db.membership.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        role: { select: { name: true } },
        profile: true,
        teams: {
          select: { isPrimary: true, team: { select: { name: true } } },
        },
        contracts: {
          orderBy: { startDate: 'desc' },
          include: {
            amendments: { orderBy: { effectiveDate: 'desc' } },
          },
        },
      },
    });

    if (!membership) return null;

    const active = membership.contracts.find(
      (contract) => contract.status === 'ACTIVE',
    );

    // Tous les établissements portés par l'historique, et pas seulement celui
    // du contrat en cours : un contrat terminé ailleurs reste à lire.
    const contractLocations = await db.location.findMany({
      where: {
        id: {
          in: [
            ...new Set(membership.contracts.map((entry) => entry.locationId)),
          ],
        },
      },
      select: { id: true, name: true },
    });
    const locationNames = new Map(
      contractLocations.map((entry) => [entry.id, entry.name]),
    );
    const location = active
      ? { name: locationNames.get(active.locationId) ?? null }
      : null;

    // L'emploi est porté par le contrat, pas par le dossier : il change par
    // avenant, et c'est l'avenant qui fait foi devant l'inspection.
    const jobTitle = active?.jobTitleId
      ? await db.jobTitle.findUnique({
          where: { id: active.jobTitleId },
          select: { name: true },
        })
      : null;

    const lineManager = membership.lineManagerId
      ? await db.membership.findUnique({
          where: { id: membership.lineManagerId },
          select: {
            employeeNumber: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        })
      : null;

    // La plus récente, pas la seule en attente : « invitation expirée le 3 »
    // est une information utile, et la masquer laisserait croire qu'aucune
    // n'a jamais été envoyée.
    const lastInvitation = await db.invitation.findFirst({
      where: { membershipId: membership.id },
      orderBy: { createdAt: 'desc' },
      select: {
        email: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    return {
      id: membership.id,
      employeeNumber: membership.employeeNumber,
      firstName: membership.profile?.firstName ?? '',
      lastName: membership.profile?.lastName ?? membership.employeeNumber,
      email: membership.user?.email ?? null,
      phone: membership.profile?.phone ?? null,
      status: membership.status,
      hasAccount: membership.userId !== null,
      roleName: membership.role.name,
      locationName: location?.name ?? null,
      teamName:
        (
          membership.teams.find((entry) => entry.isPrimary) ??
          membership.teams[0]
        )?.team.name ?? null,
      invitationState: lastInvitation
        ? invitationState(lastInvitation, new Date())
        : null,
      contract: active
        ? {
            type: active.contractType,
            label: contractLabel(active.contractType),
            since: active.startDate,
            trialEndDate: active.trialEndDate,
            forfaitJours: active.workTimeArrangement === 'FORFAIT_JOURS',
          }
        : null,
      headline: {
        jobTitle: jobTitle?.name ?? null,
        lineManagerName: lineManager
          ? `${lineManager.profile?.firstName ?? ''} ${lineManager.profile?.lastName ?? lineManager.employeeNumber}`.trim()
          : null,
        contractEnd: active?.endDate ?? null,
      },
      profile: membership.profile
        ? {
            firstName: membership.profile.firstName,
            lastName: membership.profile.lastName,
            birthDate: membership.profile.birthDate,
            birthPlace: membership.profile.birthPlace,
            nationality: membership.profile.nationality,
            addressLine1: membership.profile.addressLine1,
            postalCode: membership.profile.postalCode,
            city: membership.profile.city,
            country: membership.profile.country,
            phone: membership.profile.phone,
            personalEmail: membership.profile.personalEmail,
            emergencyContactName: membership.profile.emergencyContactName,
            emergencyContactPhone: membership.profile.emergencyContactPhone,
            // Le NIR, l'IBAN et le BIC ne sont déchiffrés que pour un profil
            // habilité — sinon le bloc entier reste absent de la réponse.
            sensitive: canSeeDocuments
              ? {
                  socialSecurityNumber: decryptOptional(
                    membership.profile.socialSecurityNumberEnc,
                  ),
                  iban: decryptOptional(membership.profile.ibanEnc),
                  bic: decryptOptional(membership.profile.bicEnc),
                }
              : null,
          }
        : null,
      contracts: membership.contracts.map((contract) => ({
        id: contract.id,
        type: contract.contractType,
        label: contractLabel(contract.contractType),
        startDate: contract.startDate,
        endDate: contract.endDate,
        trialEndDate: contract.trialEndDate,
        weeklyHours: contract.weeklyHours.toString(),
        forfaitJours: contract.workTimeArrangement === 'FORFAIT_JOURS',
        forfaitDaysPerYear: contract.forfaitDaysPerYear?.toString() ?? null,
        forfaitAgreementRef: contract.forfaitAgreementRef,
        isModulated: contract.isModulated,
        classification: contract.classification,
        coefficient: contract.coefficient,
        locationName: locationNames.get(contract.locationId) ?? null,
        status: contract.status,
        endReason: contract.endReason,
        monthlySalary: canSeeSalary
          ? (contract.monthlySalary?.toString() ?? null)
          : null,
        amendments: contract.amendments.map((amendment) => ({
          id: amendment.id,
          effectiveDate: amendment.effectiveDate,
          reason: amendment.reason,
          changes: amendment.changes,
        })),
      })),
      canSeeSalary,
      canInvite: can(actor, 'members.invite'),
      canEdit: can(actor, 'members.edit'),
      invitation: lastInvitation
        ? {
            state: invitationState(lastInvitation, new Date()),
            email: lastInvitation.email,
            expiresAt: lastInvitation.expiresAt,
            createdAt: lastInvitation.createdAt,
          }
        : null,
    };
  });
});

/**
 * Établissements où poser un contrat.
 *
 * Une liste à part de celle des réglages : ouvrir un contrat n'exige pas
 * d'administrer les établissements, et emprunter `settings.access` fermerait
 * la création à un gestionnaire de paie qui n'a rien à y administrer.
 */
export const listContractLocations = cache(
  async function listContractLocations(): Promise<
    Array<{ id: string; name: string }>
  > {
    return query('members.contract.create', async (db) =>
      db.location.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    );
  },
);

/** Rattachement et périmètre — onglet « Planification et accès ». */
export interface MemberPlacement {
  /** Établissement porté par le contrat en cours. Il ne se change qu'en avenant. */
  contractLocationName: string | null;
  teams: Array<{ id: string; name: string; locationName: string; isPrimary: boolean }>;
  /** Vrai quand le périmètre couvre tout le compte, ouvertures futures comprises. */
  allLocations: boolean;
  scopedLocations: string[];
  scopedTeams: string[];
}

export const getMemberPlacement = cache(async function getMemberPlacement(
  id: string,
): Promise<MemberPlacement | null> {
  return query('members.view', async (db) => {
    const membership = await db.membership.findUnique({
      where: { id },
      select: {
        contracts: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
          select: { locationId: true },
        },
        teams: {
          select: {
            isPrimary: true,
            team: {
              select: {
                id: true,
                name: true,
                location: { select: { name: true } },
              },
            },
          },
        },
        scopes: {
          select: {
            allLocations: true,
            location: { select: { name: true } },
            team: { select: { name: true } },
          },
        },
      },
    });

    if (!membership) return null;

    const contractLocationId = membership.contracts[0]?.locationId;
    const contractLocation = contractLocationId
      ? await db.location.findUnique({
          where: { id: contractLocationId },
          select: { name: true },
        })
      : null;

    return {
      contractLocationName: contractLocation?.name ?? null,
      teams: membership.teams.map((member) => ({
        id: member.team.id,
        name: member.team.name,
        locationName: member.team.location.name,
        isPrimary: member.isPrimary,
      })),
      allLocations: membership.scopes.some((scope) => scope.allLocations),
      scopedLocations: [
        ...new Set(
          membership.scopes
            .map((scope) => scope.location?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ],
      scopedTeams: [
        ...new Set(
          membership.scopes
            .map((scope) => scope.team?.name)
            .filter((name): name is string => Boolean(name)),
        ),
      ],
    };
  });
});
