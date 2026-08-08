'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { hoursView } from '@/domain/hours/states';
import { zonedDate, zonedInstant } from '@/domain/planning/week';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
import { assertPeriodOpen, PeriodLockedError } from '@/server/payroll/periods';

/**
 * Saisie des heures réelles — PLAN.md §7.3.
 *
 * Sans pointeuse, c'est le manager qui saisit. Deux règles encadrent cette
 * saisie :
 *
 * 1. **Toute correction conserve valeur avant, valeur après, motif, auteur et
 *    date.** Sans motif, une correction est indistinguable d'une erreur.
 * 2. **La validation qualifie, elle ne conditionne pas le paiement.** Valider
 *    ou non ne change pas ce qui part en paie ; c'est le réalisé qui compte.
 */

export interface HoursActionState {
  error?: string;
  ok?: boolean;
}

class ValidationError extends Error {}

const HOUR = /^([01]\d|2[0-3]):([0-5]\d)$/;

const actualInput = z.object({
  shiftId: z.string().min(1),
  start: z.string().regex(HOUR, 'Heure de début invalide').or(z.literal('')),
  end: z.string().regex(HOUR, 'Heure de fin invalide').or(z.literal('')),
  breakMinutes: z.string().optional(),
  reason: z.string().trim().max(500).optional(),
});

export async function saveActualHoursAction(
  _previous: HoursActionState,
  formData: FormData,
): Promise<HoursActionState> {
  const parsed = actualInput.safeParse({
    shiftId: formData.get('shiftId'),
    start: formData.get('start') ?? '',
    end: formData.get('end') ?? '',
    breakMinutes: formData.get('breakMinutes') || undefined,
    reason: formData.get('reason') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('hours.edit_actual', async (db, actor) => {
      const shift = await db.shift.findUnique({
        where: { id: parsed.data.shiftId },
        include: { schedule: true },
      });
      if (!shift) throw new AuthorizationError('hours.edit_actual');

      const location = await db.location.findUnique({
        where: { id: shift.schedule.locationId },
        select: { id: true, timezone: true },
      });
      if (!location) throw new AuthorizationError('hours.edit_actual');

      const localDate = zonedDate(shift.startAt, location.timezone);
      await assertPeriodOpen(db, location.id, [localDate]);

      const before = hoursView({
        startAt: shift.startAt,
        endAt: shift.endAt,
        breakMinutes: shift.breakMinutes,
        actualStartAt: shift.actualStartAt,
        actualEndAt: shift.actualEndAt,
        actualBreakMinutes: shift.actualBreakMinutes,
        isValidated: shift.isValidated,
      });

      // Vider les deux champs efface le réalisé : le prévu reprend force de
      // vérité, ce qui est un retour en arrière légitime après une saisie
      // erronée.
      const clearing = !parsed.data.start && !parsed.data.end;
      if (!clearing && (!parsed.data.start || !parsed.data.end)) {
        throw new ValidationError(
          'Renseignez le début **et** la fin : une saisie partielle produirait une durée fantaisiste.',
        );
      }

      let actualStartAt: Date | null = null;
      let actualEndAt: Date | null = null;

      if (!clearing) {
        actualStartAt = zonedInstant(
          localDate,
          parsed.data.start,
          location.timezone,
        );
        actualEndAt = zonedInstant(localDate, parsed.data.end, location.timezone);
        // Fin avant début = créneau de nuit, comme au planning.
        if (actualEndAt <= actualStartAt) {
          actualEndAt = new Date(actualEndAt.getTime() + 86_400_000);
        }
      }

      const actualBreakMinutes =
        clearing || parsed.data.breakMinutes === undefined
          ? null
          : Math.max(0, Math.min(600, Number(parsed.data.breakMinutes) || 0));

      await db.shift.update({
        where: { id: shift.id },
        data: {
          actualStartAt,
          actualEndAt,
          actualBreakMinutes,
          version: { increment: 1 },
        },
      });

      const after = hoursView({
        startAt: shift.startAt,
        endAt: shift.endAt,
        breakMinutes: shift.breakMinutes,
        actualStartAt,
        actualEndAt,
        actualBreakMinutes,
        isValidated: shift.isValidated,
      });

      // Une correction d'heures déjà saisies exige un motif ; une première
      // saisie n'en exige pas — il n'y a rien à corriger.
      if (before.hasActual && !parsed.data.reason) {
        throw new ValidationError(
          'Modifier des heures déjà saisies exige un motif.',
        );
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'hours.actual.update',
        entityType: 'Shift',
        entityId: shift.id,
        before: {
          actualMinutes: before.actualMinutes,
          hasActual: before.hasActual,
        },
        after: {
          actualMinutes: after.actualMinutes,
          hasActual: after.hasActual,
          deltaMinutes: after.deltaMinutes,
        },
        reason: parsed.data.reason ?? null,
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de saisir des heures.");
  }

  revalidatePath('/rapports/heures');
  return { ok: true };
}

const validateInput = z.object({
  shiftIds: z.array(z.string().min(1)).min(1),
  validate: z.boolean(),
});

/**
 * Valide ou dévalide des heures.
 *
 * **Sans effet sur la paie.** La validation qualifie une ligne — vue et
 * acceptée par un responsable — mais des heures accomplies partent en paie
 * qu'elles soient validées ou non.
 */
export async function validateHoursAction(
  _previous: HoursActionState,
  formData: FormData,
): Promise<HoursActionState> {
  const parsed = validateInput.safeParse({
    shiftIds: formData.getAll('shiftIds').map(String).filter(Boolean),
    validate: formData.get('validate') !== 'false',
  });

  if (!parsed.success) return { error: 'Aucune ligne sélectionnée.' };

  try {
    await mutate('hours.validate', async (db, actor) => {
      const shifts = await db.shift.findMany({
        where: { id: { in: parsed.data.shiftIds } },
        include: { schedule: true },
      });
      if (shifts.length === 0) throw new ValidationError('Lignes introuvables.');

      for (const shift of shifts) {
        const location = await db.location.findUnique({
          where: { id: shift.schedule.locationId },
          select: { id: true, timezone: true },
        });
        if (!location) continue;
        await assertPeriodOpen(db, location.id, [
          zonedDate(shift.startAt, location.timezone),
        ]);
      }

      await db.shift.updateMany({
        where: { id: { in: parsed.data.shiftIds } },
        data: {
          isValidated: parsed.data.validate,
          validatedAt: parsed.data.validate ? new Date() : null,
          validatedBy: parsed.data.validate ? actor.membershipId : null,
        },
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: parsed.data.validate ? 'hours.validate' : 'hours.invalidate',
        entityType: 'Shift',
        entityId: parsed.data.shiftIds[0] as string,
        after: {
          count: parsed.data.shiftIds.length,
          validated: parsed.data.validate,
        },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de valider des heures.");
  }

  revalidatePath('/rapports/heures');
  return { ok: true };
}

function toState(error: unknown, denied: string): HoursActionState {
  if (error instanceof ValidationError) return { error: error.message };
  if (error instanceof PeriodLockedError) return { error: error.message };
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
