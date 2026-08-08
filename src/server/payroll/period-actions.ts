'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { monthDates, parseMonthParam } from '@/domain/planning/month';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
import { computeSnapshots } from '@/server/payroll/periods';

/**
 * Cycle de vie d'une période de paie — PLAN.md §4.6.
 *
 * Trois actions, trois exigences distinctes :
 *
 * - **Verrouiller** fige les instantanés et ferme la période aux mutations.
 * - **Déverrouiller** rouvre, exige une justification et périme tout export
 *   déjà produit. La péremption est déduite de `generatedAt < unlockedAt` —
 *   jamais stockée, pour que la trace d'export reste append-only.
 * - **Supprimer** reste possible sur une période verrouillée, avec une
 *   capacité dédiée et une trace conservant le périmètre supprimé.
 */

export interface PeriodActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

class ValidationError extends Error {}

const createInput = z.object({
  locationId: z.string().min(1),
  month: z.string().min(1),
  label: z.string().trim().max(80).optional(),
});

export async function createPeriodAction(
  _previous: PeriodActionState,
  formData: FormData,
): Promise<PeriodActionState> {
  const parsed = createInput.safeParse({
    locationId: formData.get('locationId'),
    month: formData.get('month'),
    label: formData.get('label') || undefined,
  });
  if (!parsed.success) return { error: 'Période invalide.' };

  const month = parseMonthParam(parsed.data.month);
  if (!month) return { error: 'Période invalide.' };

  try {
    await mutate(
      'payroll.period.create',
      async (db, actor) => {
        const dates = monthDates(month);
        const startDate = new Date(`${dates[0]}T00:00:00Z`);
        const endDate = new Date(`${dates[dates.length - 1]}T00:00:00Z`);

        const existing = await db.payPeriod.findFirst({
          where: {
            locationId: parsed.data.locationId,
            startDate,
            endDate,
            kind: 'MAIN',
          },
        });
        if (existing) {
          throw new ValidationError('Cette période existe déjà.');
        }

        const { monthLabel } = await import('@/domain/planning/month');
        const created = await db.payPeriod.create({
          data: {
            locationId: parsed.data.locationId,
            label: parsed.data.label || monthLabel(month),
            startDate,
            endDate,
            kind: 'MAIN',
          } as never,
        });

        await recordAudit(db, {
          actorMembershipId: actor.membershipId,
          action: 'payroll.period.create',
          entityType: 'PayPeriod',
          entityId: created.id,
          after: { label: created.label, from: dates[0], to: dates.at(-1) },
        });
      },
      { locationId: parsed.data.locationId },
    );
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de créer une période.");
  }

  revalidatePath('/paie/periodes');
  return { ok: true };
}

const lockInput = z.object({
  periodId: z.string().min(1),
  expectedVersion: z.coerce.number().int().min(0),
});

export async function lockPeriodAction(
  _previous: PeriodActionState,
  formData: FormData,
): Promise<PeriodActionState> {
  const parsed = lockInput.safeParse({
    periodId: formData.get('periodId'),
    expectedVersion: formData.get('expectedVersion') ?? 0,
  });
  if (!parsed.success) return { error: 'Période introuvable.' };

  let written = 0;

  try {
    await mutate('payroll.period.lock', async (db, actor) => {
      const period = await db.payPeriod.findUnique({
        where: { id: parsed.data.periodId },
      });
      if (!period) throw new AuthorizationError('payroll.period.lock');
      if (period.status === 'LOCKED') {
        throw new ValidationError('Cette période est déjà verrouillée.');
      }

      const start = period.startDate.toISOString().slice(0, 10);
      written = await computeSnapshots(
        db,
        period.id,
        {
          year: Number(start.slice(0, 4)),
          month: Number(start.slice(5, 7)),
        },
        period.locationId,
      );

      const updated = await db.payPeriod.updateMany({
        where: { id: period.id, version: parsed.data.expectedVersion },
        data: {
          status: 'LOCKED',
          lockedAt: new Date(),
          lockedBy: actor.membershipId,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        throw new ValidationError(
          'Cette période a été modifiée entre-temps. Rechargez la page.',
        );
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'payroll.period.lock',
        entityType: 'PayPeriod',
        entityId: period.id,
        before: { status: period.status },
        after: { status: 'LOCKED', snapshots: written },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de verrouiller une période.");
  }

  revalidatePath('/paie/periodes');
  revalidatePath('/paie');
  return {
    ok: true,
    message: `${written} instantané${written > 1 ? 's' : ''} figé${written > 1 ? 's' : ''}.`,
  };
}

const unlockInput = z.object({
  periodId: z.string().min(1),
  expectedVersion: z.coerce.number().int().min(0),
  reason: z.string().trim().min(1, 'Justification obligatoire').max(500),
});

/**
 * Déverrouille une période.
 *
 * La justification est **obligatoire** : rouvrir une période périme les
 * fichiers déjà transmis au cabinet, et six mois plus tard personne ne saura
 * pourquoi le mois de juillet a été rouvert.
 */
export async function unlockPeriodAction(
  _previous: PeriodActionState,
  formData: FormData,
): Promise<PeriodActionState> {
  const parsed = unlockInput.safeParse({
    periodId: formData.get('periodId'),
    expectedVersion: formData.get('expectedVersion') ?? 0,
    reason: formData.get('reason') ?? '',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  let staleExports = 0;

  try {
    await mutate('payroll.period.unlock', async (db, actor) => {
      const period = await db.payPeriod.findUnique({
        where: { id: parsed.data.periodId },
      });
      if (!period) throw new AuthorizationError('payroll.period.unlock');
      if (period.status !== 'LOCKED') {
        throw new ValidationError('Cette période n’est pas verrouillée.');
      }

      const now = new Date();
      const updated = await db.payPeriod.updateMany({
        where: { id: period.id, version: parsed.data.expectedVersion },
        data: {
          status: 'OPEN',
          unlockedAt: now,
          unlockedBy: actor.membershipId,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        throw new ValidationError(
          'Cette période a été modifiée entre-temps. Rechargez la page.',
        );
      }

      // Rien n'est écrit sur les exports : leur péremption se déduit de la date
      // de déverrouillage. On les compte seulement pour le dire à l'écran.
      staleExports = await db.payrollExport.count({
        where: { payPeriodId: period.id, generatedAt: { lt: now } },
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'payroll.period.unlock',
        entityType: 'PayPeriod',
        entityId: period.id,
        before: { status: 'LOCKED' },
        after: { status: 'OPEN', staleExports },
        reason: parsed.data.reason,
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de déverrouiller une période.");
  }

  revalidatePath('/paie/periodes');
  revalidatePath('/paie');
  return {
    ok: true,
    message:
      staleExports > 0
        ? `${staleExports} export${staleExports > 1 ? 's' : ''} désormais périmé${staleExports > 1 ? 's' : ''} : le fichier transmis ne correspond plus aux données.`
        : 'Période rouverte aux modifications.',
  };
}

export async function deletePeriodAction(
  _previous: PeriodActionState,
  formData: FormData,
): Promise<PeriodActionState> {
  const periodId = String(formData.get('periodId') ?? '');
  const confirmation = String(formData.get('confirm') ?? '');
  if (!periodId) return { error: 'Période introuvable.' };

  try {
    await mutate('payroll.period.delete', async (db, actor) => {
      const period = await db.payPeriod.findUnique({
        where: { id: periodId },
      });
      if (!period) throw new AuthorizationError('payroll.period.delete');

      // Confirmation explicite : supprimer une période verrouillée efface les
      // instantanés sur lesquels un export a pu être bâti.
      if (confirmation !== period.label) {
        throw new ValidationError(
          `Pour confirmer, saisissez le libellé exact de la période : « ${period.label} ».`,
        );
      }

      const snapshots = await db.payPeriodSnapshot.count({
        where: { payPeriodId: period.id },
      });

      // La trace est écrite **avant** la suppression : après, l'identifiant ne
      // désigne plus rien.
      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'payroll.period.delete',
        entityType: 'PayPeriod',
        entityId: period.id,
        before: {
          label: period.label,
          from: period.startDate.toISOString().slice(0, 10),
          to: period.endDate.toISOString().slice(0, 10),
          status: period.status,
          snapshots,
        },
        reason: `Suppression de la période « ${period.label} »`,
      });

      await db.payPeriod.delete({ where: { id: period.id } });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de supprimer une période.");
  }

  revalidatePath('/paie/periodes');
  return { ok: true };
}

function toState(error: unknown, denied: string): PeriodActionState {
  if (error instanceof ValidationError) return { error: error.message };
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
