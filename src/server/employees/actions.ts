'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError, can } from '@/domain/access/authorize';
import { findOverlaps, validateContract } from '@/domain/contracts/rules';
import { nextEmployeeNumber } from '@/domain/hr/civil-status';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';

export interface ActionState {
  error?: string;
  ok?: boolean;
}

const CONTRACT_TYPES = [
  'APPRENTISSAGE',
  'CDD',
  'CDI',
  'DIRIGEANT_ASSIMILE_SALARIE',
  'DIRIGEANT_NON_SALARIE',
  'EXTRA',
  'INTERIM',
  'STAGIAIRE',
  'SAISONNIER',
] as const;

const employeeInput = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis').max(80),
  /** Le nom d'usage vaut nom de naissance quand il n'est pas distinct. */
  birthName: z.string().trim().max(80),
  lastName: z.string().trim().min(1, 'Nom de famille requis').max(80),
  /** Vide = proposé par l'application, à la suite du dernier attribué. */
  employeeNumber: z.string().trim().max(40),
  birthDate: z.string().trim().max(10),
  /** Vide = salarié géré sans accès applicatif. */
  email: z.string().trim().email('Adresse invalide').or(z.literal('')),
  phone: z.string().trim().max(30),
  landline: z.string().trim().max(30),
  smsSchedules: z.boolean(),
});

/**
 * Contrat posé au moment de l'embauche.
 *
 * Facultatif dans le formulaire, mais tout ou rien une fois entamé : un
 * établissement sans date de début produirait un contrat qu'aucune règle ne
 * sait valider.
 */
const hiringContractInput = z.object({
  locationId: z.string().min(1, 'Établissement requis'),
  teamId: z.string().trim(),
  contractType: z.enum(CONTRACT_TYPES),
  startDate: z.coerce.date(),
  /** Heure de prise de poste : la DPAE la demande, la date seule n'y suffit pas. */
  startTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure de début invalide'),
  endDate: z.string().trim(),
  workTimeArrangement: z.enum(['HOURLY', 'FORFAIT_JOURS']),
  weeklyHours: z.coerce.number().min(0).max(60),
  forfaitDaysPerYear: z.coerce.number().min(0).max(400).optional(),
  forfaitAgreementRef: z.string().trim(),
  forfaitAgreedAt: z.string().trim(),
  lineManagerId: z.string().trim(),
  rttPolicyId: z.string().trim(),
});

/**
 * Crée un salarié, et l'embauche s'il y a lieu.
 *
 * Un salarié **sans compte utilisateur** doit rester créable : la plupart des
 * équipes de vente ne se connectent jamais à l'outil, et exiger une adresse
 * électronique les rendrait impossibles à planifier ou à déclarer.
 *
 * Le contrat et l'équipe sont posés dans la **même transaction** que le
 * dossier. Créés séparément, un incident au milieu laisserait un salarié sans
 * contrat — c'est-à-dire un dossier qu'aucun écran ne permettait de rattraper.
 */
export async function createEmployeeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = employeeInput.safeParse({
    firstName: formData.get('firstName'),
    birthName: formData.get('birthName') ?? '',
    lastName: formData.get('lastName'),
    employeeNumber: formData.get('employeeNumber') ?? '',
    birthDate: formData.get('birthDate') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    landline: formData.get('landline') ?? '',
    smsSchedules: formData.get('smsSchedules') === 'on',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  let birthDate: Date | null = null;
  if (parsed.data.birthDate) {
    const candidate = new Date(`${parsed.data.birthDate}T00:00:00Z`);
    if (Number.isNaN(candidate.getTime()) || candidate > new Date()) {
      return { error: 'Date de naissance invalide.' };
    }
    birthDate = candidate;
  }

  // Le contrat n'est tenté que si le formulaire l'a ouvert : créer un salarié
  // sans contrat reste légitime — un remplaçant se saisit avant que son
  // établissement soit tranché.
  const wantsContract = formData.get('withContract') === 'on';
  let contract: z.infer<typeof hiringContractInput> | null = null;
  let contractEnd: Date | null = null;
  let forfaitAgreedAt: Date | null = null;

  if (wantsContract) {
    const parsedContract = hiringContractInput.safeParse({
      locationId: formData.get('locationId') ?? '',
      teamId: formData.get('teamId') ?? '',
      contractType: formData.get('contractType') ?? 'CDI',
      startDate: formData.get('startDate'),
      startTime: formData.get('startTime') || '09:00',
      lineManagerId: formData.get('lineManagerId') ?? '',
      rttPolicyId: formData.get('rttPolicyId') ?? '',
      endDate: formData.get('endDate') ?? '',
      workTimeArrangement: formData.get('workTimeArrangement') ?? 'HOURLY',
      weeklyHours: formData.get('weeklyHours') || 35,
      forfaitDaysPerYear: formData.get('forfaitDaysPerYear') || undefined,
      forfaitAgreementRef: formData.get('forfaitAgreementRef') ?? '',
      forfaitAgreedAt: formData.get('forfaitAgreedAt') ?? '',
    });

    if (!parsedContract.success) {
      return {
        error:
          parsedContract.error.issues[0]?.message ?? 'Contrat invalide',
      };
    }

    contract = parsedContract.data;
    contractEnd = contract.endDate ? new Date(contract.endDate) : null;
    forfaitAgreedAt = contract.forfaitAgreedAt
      ? new Date(contract.forfaitAgreedAt)
      : null;

    const issues = validateContract({
      startDate: contract.startDate,
      endDate: contractEnd,
      workTimeArrangement: contract.workTimeArrangement,
      weeklyHours: contract.weeklyHours,
      forfaitDaysPerYear: contract.forfaitDaysPerYear ?? null,
      forfaitAgreementRef: contract.forfaitAgreementRef || null,
      forfaitAgreedAt,
    });

    if (issues.length > 0) {
      return { error: issues[0]?.message ?? 'Contrat invalide' };
    }
  }

  try {
    await mutate('members.create', async (db, actor) => {
      // Poser un contrat est une capacité distincte de celle de créer un
      // dossier : un gestionnaire d'annuaire n'engage pas l'entreprise.
      if (contract && !can(actor, 'members.contract.create')) {
        throw new AuthorizationError('members.contract.create');
      }

      const role = await db.role.findFirst({ where: { key: 'employee' } });
      if (!role) throw new Error('Rôle « employee » introuvable.');

      // Le matricule est proposé quand il n'est pas donné. Attribué **dans la
      // transaction**, à la suite du dernier : deux embauches simultanées ne
      // peuvent pas tomber sur le même rang, la seconde échouant sur l'unicité
      // plutôt que d'écraser la première.
      let employeeNumber = parsed.data.employeeNumber;
      if (!employeeNumber) {
        const taken = await db.membership.findMany({
          select: { employeeNumber: true },
        });
        employeeNumber = nextEmployeeNumber(
          taken.map((entry) => entry.employeeNumber),
        );
      }

      const existing = await db.membership.findFirst({
        where: { employeeNumber },
      });
      if (existing) {
        throw new ValidationError('Ce matricule est déjà utilisé.');
      }

      if (contract?.lineManagerId) {
        const manager = await db.membership.findUnique({
          where: { id: contract.lineManagerId },
          select: { id: true },
        });
        if (!manager) {
          throw new ValidationError('Responsable hiérarchique introuvable.');
        }
      }

      const created = await db.membership.create({
        data: {
          roleId: role.id,
          employeeNumber,
          status: parsed.data.email ? 'INVITED' : 'ACTIVE',
          lineManagerId: contract?.lineManagerId || null,
        } as never,
      });

      await db.employeeProfile.create({
        data: {
          membershipId: created.id,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          // Sans mention contraire, le nom de naissance est le nom d'usage :
          // laisser le champ vide obligerait à le ressaisir pour l'immense
          // majorité des dossiers, où les deux coïncident.
          birthName: parsed.data.birthName || parsed.data.lastName,
          birthDate: birthDate,
          personalEmail: parsed.data.email || null,
          phone: parsed.data.phone || null,
          landline: parsed.data.landline || null,
          smsSchedules: parsed.data.smsSchedules,
        } as never,
      });

      if (contract) {
        const location = await db.location.findUnique({
          where: { id: contract.locationId },
        });
        if (!location) {
          throw new ValidationError('Établissement introuvable.');
        }

        const openedContract = await db.userContract.create({
          data: {
            membershipId: created.id,
            locationId: location.id,
            contractType: contract.contractType,
            startDate: contract.startDate,
            startTime: contract.startTime,
            endDate: contractEnd,
            workTimeArrangement: contract.workTimeArrangement,
            weeklyHours: contract.weeklyHours,
            forfaitDaysPerYear: contract.forfaitDaysPerYear ?? null,
            forfaitAgreementRef: contract.forfaitAgreementRef || null,
            forfaitAgreedAt,
          } as never,
        });

        // Sans équipe, le salarié n'apparaît sur aucune grille : le planning
        // s'ordonne par équipe, et un rattachement omis se paie à la première
        // semaine à couvrir.
        if (contract.teamId) {
          const team = await db.team.findUnique({
            where: { id: contract.teamId },
            select: { id: true, locationId: true },
          });
          if (!team || team.locationId !== location.id) {
            throw new ValidationError(
              'Cette équipe n’appartient pas à l’établissement choisi.',
            );
          }
          await db.teamMember.create({
            data: { teamId: team.id, membershipId: created.id } as never,
          });
        }

        if (contract.rttPolicyId) {
          const policy = await db.rttPolicy.findUnique({
            where: { id: contract.rttPolicyId },
            select: { id: true, status: true },
          });
          if (!policy || policy.status !== 'ACTIVE') {
            throw new ValidationError('Politique RTT introuvable ou archivée.');
          }
          await db.rttPolicyAssignment.create({
            data: {
              rttPolicyId: policy.id,
              membershipId: created.id,
            } as never,
          });
        }

        await recordAudit(db, {
          actorMembershipId: actor.membershipId,
          action: 'contract.create',
          entityType: 'UserContract',
          entityId: openedContract.id,
          after: {
            contractType: openedContract.contractType,
            startDate: openedContract.startDate.toISOString(),
            workTimeArrangement: openedContract.workTimeArrangement,
          },
        });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'membership.create',
        entityType: 'Membership',
        entityId: created.id,
        after: {
          employeeNumber: created.employeeNumber,
          hasAccount: Boolean(parsed.data.email),
          withContract: Boolean(contract),
        },
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return {
        error:
          error.permission === 'members.contract.create'
            ? "Vous n'avez pas le droit d'ouvrir un contrat. Créez le salarié sans contrat, ou faites-le poser."
            : "Vous n'avez pas le droit de créer un salarié.",
      };
    }
    throw error;
  }

  revalidatePath('/equipe');
  return { ok: true };
}

class ValidationError extends Error {}

const contractInput = z.object({
  membershipId: z.string().min(1),
  locationId: z.string().min(1),
  contractType: z.enum(CONTRACT_TYPES),
  startDate: z.coerce.date(),
  endDate: z.string().trim().optional(),
  workTimeArrangement: z.enum(['HOURLY', 'FORFAIT_JOURS']),
  weeklyHours: z.coerce.number().min(0).max(60),
  forfaitDaysPerYear: z.coerce.number().min(0).max(400).optional(),
  forfaitAgreementRef: z.string().trim().optional(),
  forfaitAgreedAt: z.string().trim().optional(),
});

export async function createContractAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = contractInput.safeParse({
    membershipId: formData.get('membershipId'),
    locationId: formData.get('locationId'),
    contractType: formData.get('contractType'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate') ?? '',
    workTimeArrangement: formData.get('workTimeArrangement') ?? 'HOURLY',
    weeklyHours: formData.get('weeklyHours') ?? 35,
    forfaitDaysPerYear: formData.get('forfaitDaysPerYear') || undefined,
    forfaitAgreementRef: formData.get('forfaitAgreementRef') ?? '',
    forfaitAgreedAt: formData.get('forfaitAgreedAt') ?? '',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  const forfaitAgreedAt = parsed.data.forfaitAgreedAt
    ? new Date(parsed.data.forfaitAgreedAt)
    : null;

  const issues = validateContract({
    startDate: parsed.data.startDate,
    endDate,
    workTimeArrangement: parsed.data.workTimeArrangement,
    weeklyHours: parsed.data.weeklyHours,
    forfaitDaysPerYear: parsed.data.forfaitDaysPerYear ?? null,
    forfaitAgreementRef: parsed.data.forfaitAgreementRef ?? null,
    forfaitAgreedAt,
  });

  if (issues.length > 0) {
    return { error: issues[0]?.message ?? 'Contrat invalide' };
  }

  try {
    await mutate(
      'members.contract.create',
      async (db, actor) => {
        const location = await db.location.findUnique({
          where: { id: parsed.data.locationId },
        });
        if (!location) throw new AuthorizationError('members.contract.create');

        const existing = await db.userContract.findMany({
          where: {
            membershipId: parsed.data.membershipId,
            status: { in: ['ACTIVE', 'DRAFT'] },
          },
          select: { id: true, startDate: true, endDate: true },
        });

        // Deux contrats actifs qui se chevauchent produiraient un salarié
        // compté deux fois en paie. Le contrôle est fait ici, en transaction,
        // et pas seulement dans le formulaire.
        const overlaps = findOverlaps(
          { startDate: parsed.data.startDate, endDate },
          existing,
        );
        if (overlaps.length > 0) {
          throw new ValidationError(
            'Un contrat actif couvre déjà cette période pour ce salarié.',
          );
        }

        const created = await db.userContract.create({
          data: {
            membershipId: parsed.data.membershipId,
            locationId: location.id,
            contractType: parsed.data.contractType,
            startDate: parsed.data.startDate,
            endDate,
            workTimeArrangement: parsed.data.workTimeArrangement,
            weeklyHours: parsed.data.weeklyHours,
            forfaitDaysPerYear: parsed.data.forfaitDaysPerYear ?? null,
            forfaitAgreementRef: parsed.data.forfaitAgreementRef || null,
            forfaitAgreedAt,
          } as never,
        });

        await recordAudit(db, {
          actorMembershipId: actor.membershipId,
          action: 'contract.create',
          entityType: 'UserContract',
          entityId: created.id,
          after: {
            contractType: created.contractType,
            startDate: created.startDate.toISOString(),
            workTimeArrangement: created.workTimeArrangement,
          },
        });
      },
      { locationId: parsed.data.locationId },
    );
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de créer un contrat." };
    }
    throw error;
  }

  revalidatePath(`/equipe/${parsed.data.membershipId}`);
  revalidatePath('/equipe');
  return { ok: true };
}

const amendmentInput = z.object({
  contractId: z.string().min(1),
  effectiveDate: z.coerce.date(),
  reason: z.string().trim().min(1, 'Motif requis').max(300),
  weeklyHours: z.coerce.number().min(0).max(60).optional(),
});

/**
 * Enregistre un avenant.
 *
 * L'avenant **s'ajoute**, il ne remplace pas : un contrôle demande l'état du
 * contrat au moment des faits, pas son état actuel. Le contrat porte la valeur
 * courante, l'avenant garde la trace du passage.
 */
export async function createAmendmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = amendmentInput.safeParse({
    contractId: formData.get('contractId'),
    effectiveDate: formData.get('effectiveDate'),
    reason: formData.get('reason'),
    weeklyHours: formData.get('weeklyHours') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  let membershipId = '';

  try {
    await mutate('members.contract.edit', async (db, actor) => {
      const contract = await db.userContract.findUnique({
        where: { id: parsed.data.contractId },
      });
      if (!contract) throw new AuthorizationError('members.contract.edit');
      membershipId = contract.membershipId;

      const changes: Record<string, { before: unknown; after: unknown }> = {};
      if (
        parsed.data.weeklyHours !== undefined &&
        Number(contract.weeklyHours) !== parsed.data.weeklyHours
      ) {
        changes.weeklyHours = {
          before: contract.weeklyHours.toString(),
          after: parsed.data.weeklyHours,
        };
      }

      if (Object.keys(changes).length === 0) {
        throw new ValidationError('Aucune modification à enregistrer.');
      }

      const amendment = await db.amendment.create({
        data: {
          userContractId: contract.id,
          effectiveDate: parsed.data.effectiveDate,
          changes,
          reason: parsed.data.reason,
          createdBy: actor.membershipId,
        } as never,
      });

      if (parsed.data.weeklyHours !== undefined) {
        await db.userContract.update({
          where: { id: contract.id },
          data: {
            weeklyHours: parsed.data.weeklyHours,
            version: { increment: 1 },
          },
        });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'contract.amend',
        entityType: 'UserContract',
        entityId: contract.id,
        before: { weeklyHours: contract.weeklyHours.toString() },
        after: { amendmentId: amendment.id, changes },
        reason: parsed.data.reason,
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de modifier un contrat." };
    }
    throw error;
  }

  if (membershipId) revalidatePath(`/equipe/${membershipId}`);
  return { ok: true };
}

const endContractInput = z.object({
  contractId: z.string().min(1),
  endDate: z.coerce.date(),
  endReason: z.string().trim().min(1, 'Motif de fin requis').max(300),
});

/**
 * Termine un contrat.
 *
 * Le contrat n'est pas supprimé : il est **daté et clos**. Un contrôle porte
 * sur une période révolue, et effacer un contrat terminé effacerait la preuve
 * que le salarié a travaillé — ainsi que la base de son solde de tout compte.
 */
export async function endContractAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = endContractInput.safeParse({
    contractId: formData.get('contractId'),
    endDate: formData.get('endDate'),
    endReason: formData.get('endReason'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  let membershipId = '';

  try {
    await mutate('members.contract.edit', async (db, actor) => {
      const contract = await db.userContract.findUnique({
        where: { id: parsed.data.contractId },
      });
      if (!contract) throw new AuthorizationError('members.contract.edit');
      membershipId = contract.membershipId;

      if (contract.status === 'ENDED') {
        throw new ValidationError('Ce contrat est déjà terminé.');
      }
      if (parsed.data.endDate < contract.startDate) {
        throw new ValidationError(
          'La fin du contrat précède son début.',
        );
      }

      await db.userContract.update({
        where: { id: contract.id },
        data: {
          endDate: parsed.data.endDate,
          endReason: parsed.data.endReason,
          status: 'ENDED',
          version: { increment: 1 },
        },
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'contract.end',
        entityType: 'UserContract',
        entityId: contract.id,
        before: { status: contract.status, endDate: contract.endDate?.toISOString() ?? null },
        after: {
          status: 'ENDED',
          endDate: parsed.data.endDate.toISOString(),
        },
        reason: parsed.data.endReason,
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de terminer un contrat." };
    }
    throw error;
  }

  if (membershipId) {
    revalidatePath(`/equipe/${membershipId}`);
    revalidatePath('/equipe');
  }
  return { ok: true };
}
