'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { findOverlaps, validateContract } from '@/domain/contracts/rules';
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
  lastName: z.string().trim().min(1, 'Nom requis').max(80),
  employeeNumber: z.string().trim().min(1, 'Matricule requis').max(40),
  /** Vide = salarié géré sans accès applicatif. */
  email: z.string().trim().email('Adresse invalide').or(z.literal('')),
});

/**
 * Crée un salarié.
 *
 * Un salarié **sans compte utilisateur** doit rester créable : la plupart des
 * équipes de vente ne se connectent jamais à l'outil, et exiger une adresse
 * électronique les rendrait impossibles à planifier ou à déclarer.
 */
export async function createEmployeeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = employeeInput.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    employeeNumber: formData.get('employeeNumber'),
    email: formData.get('email') ?? '',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('members.create', async (db, actor) => {
      const role = await db.role.findFirst({ where: { key: 'employee' } });
      if (!role) throw new Error('Rôle « employee » introuvable.');

      const existing = await db.membership.findFirst({
        where: { employeeNumber: parsed.data.employeeNumber },
      });
      if (existing) {
        throw new ValidationError('Ce matricule est déjà utilisé.');
      }

      const created = await db.membership.create({
        data: {
          roleId: role.id,
          employeeNumber: parsed.data.employeeNumber,
          status: parsed.data.email ? 'INVITED' : 'ACTIVE',
        } as never,
      });

      await db.employeeProfile.create({
        data: {
          membershipId: created.id,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          personalEmail: parsed.data.email || null,
        } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'membership.create',
        entityType: 'Membership',
        entityId: created.id,
        after: {
          employeeNumber: created.employeeNumber,
          hasAccount: Boolean(parsed.data.email),
        },
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de créer un salarié." };
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
