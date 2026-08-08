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

export async function listEmployees(): Promise<EmployeeListRow[]> {
  return query('members.view', async (db) => {
    const memberships = await db.membership.findMany({
      where: { archivedAt: null },
      include: {
        profile: { select: { firstName: true, lastName: true } },
        user: { select: { email: true } },
        role: { select: { name: true } },
        contracts: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { employeeNumber: 'asc' },
    });

    const locationIds = [
      ...new Set(
        memberships
          .flatMap((membership) => membership.contracts)
          .map((contract) => contract.locationId),
      ),
    ];
    const locations = await db.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true },
    });
    const locationNames = new Map(locations.map((l) => [l.id, l.name]));

    return memberships.map((membership) => {
      const contract = membership.contracts[0];
      return {
        id: membership.id,
        employeeNumber: membership.employeeNumber,
        firstName: membership.profile?.firstName ?? '',
        lastName: membership.profile?.lastName ?? membership.employeeNumber,
        email: membership.user?.email ?? null,
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
      };
    });
  });
}

export interface EmployeeDetail extends EmployeeListRow {
  profile: {
    birthDate: Date | null;
    city: string | null;
    phone: string | null;
    personalEmail: string | null;
    /** Chiffré au repos, déchiffré seulement pour qui a le droit de le lire. */
    socialSecurityNumber: string | null;
    iban: string | null;
  } | null;
  contracts: Array<{
    id: string;
    type: string;
    label: string;
    startDate: Date;
    endDate: Date | null;
    weeklyHours: string;
    forfaitJours: boolean;
    forfaitDaysPerYear: string | null;
    status: string;
    /** Absent quand `members.salary.view` manque. */
    monthlySalary: string | null;
    amendments: Array<{ id: string; effectiveDate: Date; reason: string | null }>;
  }>;
  canSeeSalary: boolean;
  canInvite: boolean;
  /** Dernière invitation émise, quel que soit son sort. */
  invitation: {
    state: InvitationState;
    email: string;
    expiresAt: Date;
    createdAt: Date;
  } | null;
}

export async function getEmployee(id: string): Promise<EmployeeDetail | null> {
  return query('members.view', async (db, actor) => {
    const canSeeSalary = can(actor, 'members.salary.view');
    const canSeeDocuments = can(actor, 'members.documents.view');

    const membership = await db.membership.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        role: { select: { name: true } },
        profile: true,
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
    const location = active
      ? await db.location.findUnique({
          where: { id: active.locationId },
          select: { name: true },
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
      status: membership.status,
      hasAccount: membership.userId !== null,
      roleName: membership.role.name,
      locationName: location?.name ?? null,
      contract: active
        ? {
            type: active.contractType,
            label: contractLabel(active.contractType),
            since: active.startDate,
            trialEndDate: active.trialEndDate,
            forfaitJours: active.workTimeArrangement === 'FORFAIT_JOURS',
          }
        : null,
      profile: membership.profile
        ? {
            birthDate: membership.profile.birthDate,
            city: membership.profile.city,
            phone: membership.profile.phone,
            personalEmail: membership.profile.personalEmail,
            // Le NIR et l'IBAN ne sont déchiffrés que pour un profil habilité.
            socialSecurityNumber: canSeeDocuments
              ? decryptOptional(membership.profile.socialSecurityNumberEnc)
              : null,
            iban: canSeeDocuments
              ? decryptOptional(membership.profile.ibanEnc)
              : null,
          }
        : null,
      contracts: membership.contracts.map((contract) => ({
        id: contract.id,
        type: contract.contractType,
        label: contractLabel(contract.contractType),
        startDate: contract.startDate,
        endDate: contract.endDate,
        weeklyHours: contract.weeklyHours.toString(),
        forfaitJours: contract.workTimeArrangement === 'FORFAIT_JOURS',
        forfaitDaysPerYear: contract.forfaitDaysPerYear?.toString() ?? null,
        status: contract.status,
        monthlySalary: canSeeSalary
          ? (contract.monthlySalary?.toString() ?? null)
          : null,
        amendments: contract.amendments.map((amendment) => ({
          id: amendment.id,
          effectiveDate: amendment.effectiveDate,
          reason: amendment.reason,
        })),
      })),
      canSeeSalary,
      canInvite: can(actor, 'members.invite'),
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
}
