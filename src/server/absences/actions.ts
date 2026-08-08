'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError, can } from '@/domain/access/authorize';
import {
  countAbsenceDays,
  findAbsenceOverlaps,
  respectsNotice,
} from '@/domain/absences/count';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
import type { ScopedClient } from '@/server/tenant';

/**
 * Écritures d'absences — PLAN.md §7.1 et §7.2.
 *
 * Deux invariants gouvernent ce fichier :
 *
 * 1. **Le décompte est figé à la décision.** Le calendrier de l'établissement
 *    peut changer après coup ; un droit acquis ne doit pas bouger avec lui.
 * 2. **Le registre ne se réécrit pas.** Annuler une absence acceptée n'efface
 *    pas la prise : cela écrit une contre-passation. Le solde revient au même
 *    chiffre, l'histoire reste lisible.
 */

export interface AbsenceActionState {
  error?: string;
  ok?: boolean;
  warning?: string;
}

class ValidationError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const requestInput = z.object({
  membershipId: z.string().min(1),
  absenceTypeId: z.string().min(1),
  startDate: z.string().regex(ISO_DATE, 'Date de début invalide'),
  endDate: z.string().regex(ISO_DATE, 'Date de fin invalide'),
  startHalfDay: z.boolean(),
  endHalfDay: z.boolean(),
  comment: z.string().trim().max(500).optional(),
});

/** Contexte de décompte d'un salarié : jours fériés et rythme contractuel. */
async function countingContextFor(db: ScopedClient, membershipId: string) {
  const contract = await db.userContract.findFirst({
    where: { membershipId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  });

  const holidays = contract
    ? await db.holiday.findMany({
        where: { locationId: contract.locationId },
        select: { localDate: true },
      })
    : [];

  return {
    contract,
    context: {
      holidays: holidays.map((holiday) =>
        holiday.localDate.toISOString().slice(0, 10),
      ),
      // Le rythme réel se déduira du planning au lot suivant ; à défaut, la
      // semaine standard, qui est le cas de la quasi-totalité des contrats.
      basis: 'OUVRABLES' as const,
      workingWeekdays: [1, 2, 3, 4, 5, 6],
    },
  };
}

export async function requestTimeOffAction(
  _previous: AbsenceActionState,
  formData: FormData,
): Promise<AbsenceActionState> {
  const parsed = requestInput.safeParse({
    membershipId: formData.get('membershipId'),
    absenceTypeId: formData.get('absenceTypeId'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    startHalfDay: formData.get('startHalfDay') === 'on',
    endHalfDay: formData.get('endHalfDay') === 'on',
    comment: formData.get('comment') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  let warning: string | undefined;

  try {
    await mutate('timeoff.request', async (db, actor) => {
      // Demander pour autrui suppose la capacité de décider : un salarié ne
      // pose pas les congés d'un collègue.
      if (
        parsed.data.membershipId !== actor.membershipId &&
        !can(actor, 'timeoff.decide')
      ) {
        throw new AuthorizationError('timeoff.decide');
      }

      if (parsed.data.endDate < parsed.data.startDate) {
        throw new ValidationError(
          'La date de fin précède la date de début. Rappel : la date de fin est le **dernier jour d’absence**, pas la date de reprise.',
        );
      }

      const absenceType = await db.absenceType.findUnique({
        where: { id: parsed.data.absenceTypeId },
      });
      if (!absenceType) throw new ValidationError("Type d'absence inconnu.");

      const existing = await db.timeOff.findMany({
        where: {
          membershipId: parsed.data.membershipId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
        select: { id: true, startDate: true, endDate: true },
      });

      const overlaps = findAbsenceOverlaps(
        { startDate: parsed.data.startDate, endDate: parsed.data.endDate },
        existing.map((entry) => ({
          id: entry.id,
          startDate: entry.startDate.toISOString().slice(0, 10),
          endDate: entry.endDate.toISOString().slice(0, 10),
        })),
      );
      if (overlaps.length > 0) {
        throw new ValidationError(
          'Une absence couvre déjà tout ou partie de cette période.',
        );
      }

      const today = new Date().toISOString().slice(0, 10);
      if (
        !respectsNotice(
          { startDate: parsed.data.startDate, endDate: parsed.data.endDate },
          today,
          absenceType.minNoticeDays,
        )
      ) {
        // Avertir plutôt qu'interdire : un manager peut accepter une demande
        // hors délai, et le préavis n'est pas une règle de sécurité.
        warning = `Préavis de ${absenceType.minNoticeDays} jours non respecté.`;
      }

      const { contract, context } = await countingContextFor(
        db,
        parsed.data.membershipId,
      );
      const counted = countAbsenceDays(
        {
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate,
          startHalfDay: parsed.data.startHalfDay,
          endHalfDay: parsed.data.endHalfDay,
        },
        context,
      );

      if (counted.total === 0) {
        throw new ValidationError(
          'Cette période ne contient aucun jour décomptable : jours fériés ou non travaillés uniquement.',
        );
      }

      // Sans jour férié enregistré sur la période, le décompte les compte comme
      // travaillés — et le salarié perd un jour sans que rien ne le signale.
      // Mieux vaut le dire que laisser croire à un décompte complet.
      const year = parsed.data.startDate.slice(0, 4);
      const knownHolidays = context.holidays.filter((date) =>
        date.startsWith(year),
      );
      if (knownHolidays.length === 0) {
        warning = [
          warning,
          `Aucun jour férié n'est enregistré pour ${year} : le décompte les compte comme travaillés.`,
        ]
          .filter(Boolean)
          .join(' ');
      }

      const created = await db.timeOff.create({
        data: {
          membershipId: parsed.data.membershipId,
          userContractId: contract?.id ?? null,
          absenceTypeId: parsed.data.absenceTypeId,
          startDate: new Date(`${parsed.data.startDate}T00:00:00Z`),
          endDate: new Date(`${parsed.data.endDate}T00:00:00Z`),
          startHalfDay: parsed.data.startHalfDay,
          endHalfDay: parsed.data.endHalfDay,
          countedDays: counted.total,
          comment: parsed.data.comment ?? null,
          requestedBy: actor.membershipId,
        } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'timeoff.request',
        entityType: 'TimeOff',
        entityId: created.id,
        after: {
          membershipId: parsed.data.membershipId,
          type: absenceType.code,
          from: parsed.data.startDate,
          to: parsed.data.endDate,
          days: counted.total,
        },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de poser cette absence.");
  }

  revalidatePath('/conges');
  return warning ? { ok: true, warning } : { ok: true };
}

const decisionInput = z.object({
  timeOffId: z.string().min(1),
  accept: z.boolean(),
  comment: z.string().trim().max(500).optional(),
});

/**
 * Accepte ou refuse une demande.
 *
 * L'acceptation écrit au registre : le solde bouge parce qu'une écriture a été
 * posée, jamais parce qu'un champ a été décrémenté.
 */
export async function decideTimeOffAction(
  _previous: AbsenceActionState,
  formData: FormData,
): Promise<AbsenceActionState> {
  const parsed = decisionInput.safeParse({
    timeOffId: formData.get('timeOffId'),
    accept: formData.get('accept') === 'true',
    comment: formData.get('comment') || undefined,
  });

  if (!parsed.success) return { error: 'Demande introuvable.' };

  try {
    await mutate('timeoff.decide', async (db, actor) => {
      const timeOff = await db.timeOff.findUnique({
        where: { id: parsed.data.timeOffId },
        include: { absenceType: true },
      });
      if (!timeOff) throw new AuthorizationError('timeoff.decide');
      if (timeOff.status !== 'PENDING') {
        throw new ValidationError('Cette demande a déjà été traitée.');
      }

      if (parsed.data.accept) {
        // Le contrôle est refait en transaction : entre la demande et la
        // décision, un autre congé a pu être accepté sur la même période.
        const others = await db.timeOff.findMany({
          where: {
            membershipId: timeOff.membershipId,
            status: 'ACCEPTED',
            id: { not: timeOff.id },
          },
          select: { id: true, startDate: true, endDate: true },
        });
        const overlaps = findAbsenceOverlaps(
          {
            startDate: timeOff.startDate.toISOString().slice(0, 10),
            endDate: timeOff.endDate.toISOString().slice(0, 10),
          },
          others.map((entry) => ({
            id: entry.id,
            startDate: entry.startDate.toISOString().slice(0, 10),
            endDate: entry.endDate.toISOString().slice(0, 10),
          })),
        );
        if (overlaps.length > 0) {
          throw new ValidationError(
            'Une autre absence acceptée recouvre désormais cette période.',
          );
        }
      }

      await db.timeOff.update({
        where: { id: timeOff.id },
        data: {
          status: parsed.data.accept ? 'ACCEPTED' : 'DECLINED',
          decidedBy: actor.membershipId,
          decidedAt: new Date(),
          decisionComment: parsed.data.comment ?? null,
        },
      });

      if (parsed.data.accept) {
        await writeTaken(db, timeOff, actor.membershipId);
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: parsed.data.accept ? 'timeoff.accept' : 'timeoff.decline',
        entityType: 'TimeOff',
        entityId: timeOff.id,
        before: { status: timeOff.status },
        after: {
          status: parsed.data.accept ? 'ACCEPTED' : 'DECLINED',
          days: timeOff.countedDays?.toString() ?? null,
        },
        reason: parsed.data.comment ?? null,
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de décider de cette demande.");
  }

  revalidatePath('/conges');
  return { ok: true };
}

/**
 * Annule une absence.
 *
 * Sur une absence acceptée, la prise est **contre-passée** et non effacée : le
 * solde revient au même chiffre, et l'histoire reste lisible pour qui devra
 * l'expliquer.
 */
export async function cancelTimeOffAction(
  _previous: AbsenceActionState,
  formData: FormData,
): Promise<AbsenceActionState> {
  const timeOffId = String(formData.get('timeOffId') ?? '');
  if (!timeOffId) return { error: 'Demande introuvable.' };

  try {
    await mutate('timeoff.request', async (db, actor) => {
      const timeOff = await db.timeOff.findUnique({
        where: { id: timeOffId },
        include: { absenceType: true },
      });
      if (!timeOff) throw new AuthorizationError('timeoff.request');

      const isOwn = timeOff.membershipId === actor.membershipId;
      if (!isOwn && !can(actor, 'timeoff.decide')) {
        throw new AuthorizationError('timeoff.decide');
      }
      if (timeOff.status === 'CANCELLED') {
        throw new ValidationError('Cette absence est déjà annulée.');
      }

      if (timeOff.status === 'ACCEPTED') {
        await reverseTaken(db, timeOff, actor.membershipId);
      }

      await db.timeOff.update({
        where: { id: timeOff.id },
        data: { status: 'CANCELLED' },
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'timeoff.cancel',
        entityType: 'TimeOff',
        entityId: timeOff.id,
        before: { status: timeOff.status },
        after: { status: 'CANCELLED' },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit d'annuler cette absence.");
  }

  revalidatePath('/conges');
  return { ok: true };
}

const adjustInput = z.object({
  membershipId: z.string().min(1),
  counterType: z.enum([
    'PAID_LEAVE',
    'RTT',
    'COMPENSATORY_REST',
    'MODULATION',
    'OVERTIME',
  ]),
  quantity: z.coerce.number().refine((value) => value !== 0, {
    message: 'Un ajustement de zéro ne corrige rien.',
  }),
  reason: z.string().trim().min(1, 'Justification obligatoire').max(500),
});

/**
 * Ajustement manuel d'un compteur.
 *
 * La justification est **obligatoire** et refusée si vide. Un ajustement sans
 * motif ne vaut pas mieux qu'une absence de trace : il laisse un écart que
 * personne ne saura expliquer six mois plus tard.
 */
export async function adjustCounterAction(
  _previous: AbsenceActionState,
  formData: FormData,
): Promise<AbsenceActionState> {
  const parsed = adjustInput.safeParse({
    membershipId: formData.get('membershipId'),
    counterType: formData.get('counterType'),
    quantity: formData.get('quantity'),
    reason: formData.get('reason') ?? '',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('counters.adjust', async (db, actor) => {
      const counter = await ensureCounter(
        db,
        parsed.data.membershipId,
        parsed.data.counterType,
      );

      await db.ledgerOperation.create({
        data: {
          counterId: counter.id,
          kind: 'ADJUSTMENT',
          quantity: parsed.data.quantity,
          unit: 'DAY',
          effectiveDate: new Date(new Date().toISOString().slice(0, 10)),
          sourceType: 'MANUAL',
          reason: parsed.data.reason,
          createdBy: actor.membershipId,
        } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'counter.adjust',
        entityType: 'Counter',
        entityId: counter.id,
        after: {
          quantity: parsed.data.quantity,
          counterType: parsed.data.counterType,
        },
        reason: parsed.data.reason,
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit d'ajuster un compteur.");
  }

  revalidatePath('/conges');
  return { ok: true };
}

/** Compteur de la période d'acquisition courante, créé au besoin. */
async function ensureCounter(
  db: ScopedClient,
  membershipId: string,
  counterType:
    | 'PAID_LEAVE'
    | 'RTT'
    | 'COMPENSATORY_REST'
    | 'MODULATION'
    | 'OVERTIME',
) {
  // Période d'acquisition des congés payés : 1er juin → 31 mai, usage
  // dominant en France. Le paramétrer relève du registre §12.7.
  const now = new Date();
  const year = now.getUTCMonth() >= 5 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const start = new Date(`${year}-06-01T00:00:00Z`);
  const end = new Date(`${year + 1}-05-31T00:00:00Z`);

  const existing = await db.counter.findFirst({
    where: {
      membershipId,
      counterType,
      acquisitionPeriodStart: start,
    },
  });
  if (existing) return existing;

  return db.counter.create({
    data: {
      membershipId,
      counterType,
      acquisitionPeriodStart: start,
      acquisitionPeriodEnd: end,
    } as never,
  });
}

interface TimeOffWithType {
  id: string;
  membershipId: string;
  countedDays: { toString(): string } | null;
  startDate: Date;
  absenceType: { code: string; isPaid: boolean; countsAsWorkTime: boolean };
}

/** Écrit la prise au registre du compteur correspondant. */
async function writeTaken(
  db: ScopedClient,
  timeOff: TimeOffWithType,
  actorMembershipId: string,
): Promise<void> {
  const counterType = counterTypeFor(timeOff.absenceType.code);
  // Une absence sans compteur — maladie, sans solde — ne consomme rien : elle
  // s'affiche au planning et part en paie, sans toucher un solde de congés.
  if (!counterType) return;

  const counter = await ensureCounter(db, timeOff.membershipId, counterType);
  const days = Number(timeOff.countedDays?.toString() ?? '0');

  await db.ledgerOperation.create({
    data: {
      counterId: counter.id,
      kind: 'TAKEN',
      quantity: -days,
      unit: 'DAY',
      effectiveDate: timeOff.startDate,
      sourceType: 'TIMEOFF',
      sourceId: timeOff.id,
      createdBy: actorMembershipId,
    } as never,
  });
}

/** Contre-passe la prise, sans la supprimer. */
async function reverseTaken(
  db: ScopedClient,
  timeOff: TimeOffWithType,
  actorMembershipId: string,
): Promise<void> {
  const original = await db.ledgerOperation.findFirst({
    where: { sourceType: 'TIMEOFF', sourceId: timeOff.id, kind: 'TAKEN' },
  });
  if (!original) return;

  const already = await db.ledgerOperation.findFirst({
    where: { reversesId: original.id },
  });
  if (already) return;

  await db.ledgerOperation.create({
    data: {
      counterId: original.counterId,
      kind: 'REGULARISATION',
      // Signe opposé, date du jour : antidater masquerait la correction dans
      // les soldes déjà communiqués.
      quantity: -Number(original.quantity.toString()),
      unit: original.unit,
      effectiveDate: new Date(new Date().toISOString().slice(0, 10)),
      sourceType: 'TIMEOFF',
      sourceId: timeOff.id,
      reason: 'Annulation de l’absence',
      reversesId: original.id,
      createdBy: actorMembershipId,
    } as never,
  });
}

/**
 * Compteur consommé par un type d'absence.
 *
 * Volontairement restreint : seuls les congés payés et les RTT consomment un
 * solde. Un arrêt maladie ne se décompte d'aucun compteur — l'y imputer
 * priverait le salarié de congés auxquels il a droit.
 */
function counterTypeFor(
  code: string,
): 'PAID_LEAVE' | 'RTT' | 'COMPENSATORY_REST' | null {
  if (code === 'CP') return 'PAID_LEAVE';
  if (code === 'RTT') return 'RTT';
  if (code === 'RC') return 'COMPENSATORY_REST';
  return null;
}

function toState(error: unknown, denied: string): AbsenceActionState {
  if (error instanceof ValidationError) return { error: error.message };
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
