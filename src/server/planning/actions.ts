'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  PUBLICATION_INTENT_FIELD,
  PUBLISH_INTENT,
} from '@/domain/planning/publication';
import { AuthorizationError, can, type Actor } from '@/domain/access/authorize';
import { shiftMinutes } from '@/domain/counters/week';
import {
  parseWeekParam,
  weekBounds,
  weekDates,
  zonedClock,
  zonedDate,
  zonedInstant,
} from '@/domain/planning/week';
import {
  breakTotals,
  normaliseBreaks,
  BreakError,
  type BreakInput,
} from '@/domain/planning/breaks';
import { shiftAssignedMessage } from '@/domain/email/message';
import { recordAudit } from '@/server/audit';
import { sendEmail } from '@/server/email/mailer';
import { evaluateAround, evaluateSchedule } from '@/server/compliance/evaluate';
import { mutate } from '@/server/context';
import { assertPeriodOpen, PeriodLockedError } from '@/server/payroll/periods';
import type { ScopedClient } from '@/server/tenant';

/**
 * Écritures du planning.
 *
 * Deux règles gouvernent ce fichier :
 *
 * 1. **Les instants font foi.** Le formulaire envoie une date civile et deux
 *    heures locales ; ils sont convertis en instants dans le fuseau de
 *    l'établissement avant toute écriture. `localDate` n'est qu'un cache de
 *    regroupement, jamais une source de vérité.
 * 2. **Publier est une décision, la modifier ensuite en est une autre.**
 *    Toucher à une semaine publiée exige une capacité distincte : un salarié a
 *    organisé sa semaine sur ce qu'il a lu.
 */

export interface PlanningActionState {
  error?: string;
  ok?: boolean;
}

class ValidationError extends Error {}

const HOUR = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const shiftInput = z.object({
  teamId: z.string().min(1),
  week: z.string().min(1),
  membershipId: z.string().optional(),
  /**
   * Jours à créer, un créneau par jour.
   *
   * Un même horaire se répète d'un jour à l'autre bien plus souvent qu'il ne
   * varie : ressaisir cinq fois « 9 h–17 h, pause 30 » est le geste le plus
   * répété de la semaine, et le plus exposé à la faute de frappe.
   */
  localDates: z
    .array(z.string().regex(ISO_DATE, 'Date invalide'))
    .min(1, 'Sélectionnez au moins un jour')
    .max(7),
  start: z.string().regex(HOUR, 'Heure de début invalide'),
  end: z.string().regex(HOUR, 'Heure de fin invalide'),
  breakMinutes: z.coerce.number().int().min(0).max(600).default(0),
  mealCount: z.coerce.number().int().min(0).max(5).default(0),
  labelId: z.string().optional(),
  note: z.string().trim().max(500).optional(),
  notify: z.boolean().default(false),
});

/**
 * Pauses saisies dans le formulaire.
 *
 * Trois champs répétés, lus par position : la ligne *n* est faite du n-ième
 * `breakDuration`, du n-ième `breakStart` et de la n-ième case `breakPaid`. Une
 * case non cochée n'étant pas envoyée, la valeur de `breakPaid` porte l'index
 * de sa ligne plutôt qu'un simple « on ».
 */
function readBreaks(formData: FormData): Array<Partial<BreakInput>> {
  const durations = formData.getAll('breakDuration').map(String);
  const starts = formData.getAll('breakStart').map(String);
  const labels = formData.getAll('breakLabel').map(String);
  const paid = new Set(formData.getAll('breakPaid').map(String));

  return durations.map((duration, index) => {
    if (duration.trim() === '') return {};
    const start = starts[index]?.trim();
    return {
      durationMinutes: Number(duration),
      startMinutes: start ? Number(start) : null,
      isPaid: paid.has(String(index)),
      label: labels[index]?.trim() || null,
    };
  });
}

async function loadTeamContext(db: ScopedClient, teamId: string) {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, locationId: true },
  });
  if (!team) throw new AuthorizationError('planning.create');

  const location = await db.location.findUnique({
    where: { id: team.locationId },
    select: { id: true, timezone: true },
  });
  if (!location) throw new AuthorizationError('planning.create');

  return { team, location };
}

/**
 * Crée ou remplace la semaine de l'équipe.
 *
 * `upsert` plutôt que `create` : la semaine naît au premier créneau posé, et
 * deux managers qui commencent la même semaine en même temps ne doivent pas
 * produire deux enregistrements — la contrainte d'unicité s'en charge.
 */
async function ensureSchedule(
  db: ScopedClient,
  teamId: string,
  locationId: string,
  isoYear: number,
  isoWeek: number,
) {
  return db.weeklySchedule.upsert({
    where: { teamId_isoYear_isoWeek: { teamId, isoYear, isoWeek } },
    update: {},
    create: { teamId, locationId, isoYear, isoWeek } as never,
  });
}

export async function createShiftAction(
  _previous: PlanningActionState,
  formData: FormData,
): Promise<PlanningActionState> {
  // Les cases de répétition portent le même nom : la case du jour ouvert est
  // cochée d'office, si bien qu'un envoi sans répétition renvoie exactement une
  // date. Le repli sur `localDate` couvre le formulaire d'un client qui aurait
  // désactivé JavaScript.
  const checked = formData.getAll('localDates').map(String).filter(Boolean);
  const single = String(formData.get('localDate') ?? '');
  const localDates = checked.length > 0 ? [...new Set(checked)] : single ? [single] : [];

  const parsed = shiftInput.safeParse({
    teamId: formData.get('teamId'),
    week: formData.get('week'),
    membershipId: formData.get('membershipId') || undefined,
    localDates,
    start: formData.get('start'),
    end: formData.get('end'),
    breakMinutes: formData.get('breakMinutes') || 0,
    mealCount: formData.get('mealCount') || 0,
    labelId: formData.get('labelId') || undefined,
    note: formData.get('note') || undefined,
    notify: formData.get('notify') === 'on',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const rawBreaks = readBreaks(formData);

  const week = parseWeekParam(parsed.data.week);
  if (!week) return { error: 'Semaine invalide.' };

  try {
    await mutate('planning.create', async (db, actor) => {
      const { team, location } = await loadTeamContext(db, parsed.data.teamId);

      // Un mois transmis au cabinet ne se modifie pas par inadvertance : le
      // contrôle passe **avant** toute écriture, et porte sur tous les jours
      // demandés — répéter sur cinq jours ne doit pas en glisser un dans une
      // période close.
      await assertPeriodOpen(db, location.id, parsed.data.localDates);

      const schedule = await ensureSchedule(
        db,
        team.id,
        location.id,
        week.isoYear,
        week.isoWeek,
      );

      if (schedule.status === 'PUBLISHED') {
        assertMayEditPublished(actor);
      }

      const { from, to } = weekBounds(week, location.timezone);

      // Les envois sont **différés à la fin de la transaction**. Écrire un
      // courriel au fil des créneaux enverrait des avis pour des jours qu'un
      // refus sur le dernier jour finirait par annuler — un salarié prévenu
      // d'un créneau qui n'existe pas.
      const notifications: Array<{
        membershipId: string;
        localDate: string;
        start: string;
        end: string;
      }> = [];

      // La répétition est **tout ou rien**. Un jour refusé annule la
      // transaction entière : une répétition à demi appliquée laisserait un
      // planning que personne n'a voulu, et qu'il faudrait défaire à la main
      // pour le refaire.
      for (const localDate of parsed.data.localDates) {
        const startAt = zonedInstant(
          localDate,
          parsed.data.start,
          location.timezone,
        );
        let endAt = zonedInstant(localDate, parsed.data.end, location.timezone);
        // Fin avant début = créneau de nuit : il finit le lendemain. Le refuser
        // interdirait de planifier un inventaire 22 h–02 h.
        if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86_400_000);

        // Les pauses détaillées font foi quand il y en a ; le champ « total »
        // reste le repli du formulaire réduit. Deux sources pour la même
        // valeur, mais une seule gagne, et elle est explicite.
        const span = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
        const breaks = normaliseBreaks(rawBreaks, span);
        const totals =
          breaks.length > 0
            ? breakTotals(breaks)
            : { breakMinutes: parsed.data.breakMinutes, paidBreakMinutes: 0 };

        const worked = shiftMinutes(startAt, endAt, totals.breakMinutes);
        if (worked <= 0) {
          throw new ValidationError(
            'La pause dépasse la durée du créneau — rien ne serait travaillé.',
          );
        }

        if (startAt < from || startAt >= to) {
          throw new ValidationError(
            'Un des jours demandés ne commence pas dans la semaine affichée.',
          );
        }

        if (parsed.data.membershipId) {
          await assertNoOverlap(
            db,
            parsed.data.membershipId,
            startAt,
            endAt,
            null,
          );
        }

        const created = await db.shift.create({
          data: {
            weeklyScheduleId: schedule.id,
            membershipId: parsed.data.membershipId ?? null,
            localDate: new Date(`${localDate}T00:00:00Z`),
            startAt,
            endAt,
            breakMinutes: totals.breakMinutes,
            paidBreakMinutes: totals.paidBreakMinutes,
            mealCount: parsed.data.mealCount,
            labelId: parsed.data.labelId ?? null,
            note: parsed.data.note ?? null,
          } as never,
        });

        for (const [position, entry] of breaks.entries()) {
          await db.shiftBreak.create({
            data: {
              shiftId: created.id,
              startMinutes: entry.startMinutes,
              durationMinutes: entry.durationMinutes,
              isPaid: entry.isPaid,
              label: entry.label,
              position,
            } as never,
          });
        }

        if (parsed.data.notify && created.membershipId) {
          notifications.push({
            membershipId: created.membershipId,
            localDate,
            start: parsed.data.start,
            end: parsed.data.end,
          });
        }

        await recordAudit(db, {
          actorMembershipId: actor.membershipId,
          action: 'planning.shift.create',
          entityType: 'Shift',
          entityId: created.id,
          after: {
            teamId: team.id,
            membershipId: created.membershipId,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            minutes: worked,
            mealCount: created.mealCount,
          },
        });
      }

      await assertNoBlocking(db, schedule.id);

      // Après le dernier contrôle : un créneau bloquant annule la transaction,
      // et l'avis ne doit pas partir pour un planning qui n'a pas été écrit.
      for (const notice of notifications) {
        await notifyShiftAssigned(db, notice, team.name);
      }
    });
  } catch (error) {
    return toState(error, 'Vous ne pouvez pas créer de créneau ici.');
  }

  revalidatePath('/planning/semaine');
  return { ok: true };
}

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/**
 * Prévient un salarié qu'un créneau lui a été posé.
 *
 * L'échec n'interrompt pas : un serveur SMTP indisponible ne doit pas empêcher
 * de planifier. `sendEmail` journalise l'échec, et le journal d'envois répond à
 * « je n'ai rien reçu » mieux qu'une transaction annulée.
 *
 * Un salarié sans compte n'a pas d'adresse : il est prévenu par le planning
 * affiché, comme aujourd'hui.
 */
async function notifyShiftAssigned(
  db: ScopedClient,
  notice: { membershipId: string; localDate: string; start: string; end: string },
  teamName: string,
): Promise<void> {
  const membership = await db.membership.findUnique({
    where: { id: notice.membershipId },
    include: { user: { select: { email: true, firstName: true } } },
  });
  if (!membership?.user?.email) return;

  const day = dayFormat.format(new Date(`${notice.localDate}T00:00:00Z`));

  await sendEmail(
    db,
    shiftAssignedMessage(membership.user.email, {
      firstName: membership.user.firstName,
      day,
      start: notice.start,
      end: notice.end,
      teamName,
    }),
    'SHIFT_ASSIGNED',
    membership.id,
  );
}

const moveInput = z.object({
  shiftId: z.string().min(1),
  membershipId: z.string().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  start: z.string().regex(HOUR, 'Heure de début invalide'),
  end: z.string().regex(HOUR, 'Heure de fin invalide'),
  breakMinutes: z.coerce.number().int().min(0).max(600).default(0),
  mealCount: z.coerce.number().int().min(0).max(5).default(0),
  // Modifiables à la correction comme à la création : une étiquette posée de
  // travers se corrigeait jusqu'ici en supprimant le créneau pour le refaire,
  // ce qui perdait sa validation et son historique.
  labelId: z.string().optional(),
  note: z.string().trim().max(500).optional(),
});

export async function updateShiftAction(
  _previous: PlanningActionState,
  formData: FormData,
): Promise<PlanningActionState> {
  const parsed = moveInput.safeParse({
    shiftId: formData.get('shiftId'),
    membershipId: formData.get('membershipId') || undefined,
    localDate: formData.get('localDate'),
    start: formData.get('start'),
    end: formData.get('end'),
    breakMinutes: formData.get('breakMinutes') || 0,
    mealCount: formData.get('mealCount') || 0,
    labelId: formData.get('labelId') || undefined,
    note: formData.get('note') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const rawBreaks = readBreaks(formData);

  try {
    await mutate('planning.edit', async (db, actor) => {
      const shift = await db.shift.findUnique({
        where: { id: parsed.data.shiftId },
        include: { schedule: true },
      });
      if (!shift) throw new AuthorizationError('planning.edit');

      const location = await db.location.findUnique({
        where: { id: shift.schedule.locationId },
        select: { timezone: true },
      });
      if (!location) throw new AuthorizationError('planning.edit');

      if (shift.schedule.status === 'PUBLISHED') {
        assertMayEditPublished(actor);
      }

      await assertPeriodOpen(db, shift.schedule.locationId, [
        shift.localDate.toISOString().slice(0, 10),
        parsed.data.localDate,
      ]);

      const startAt = zonedInstant(
        parsed.data.localDate,
        parsed.data.start,
        location.timezone,
      );
      let endAt = zonedInstant(
        parsed.data.localDate,
        parsed.data.end,
        location.timezone,
      );
      if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86_400_000);

      const span = Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
      const breaks = normaliseBreaks(rawBreaks, span);
      const totals =
        breaks.length > 0
          ? breakTotals(breaks)
          : { breakMinutes: parsed.data.breakMinutes, paidBreakMinutes: 0 };

      if (shiftMinutes(startAt, endAt, totals.breakMinutes) <= 0) {
        throw new ValidationError(
          'La pause dépasse la durée du créneau — rien ne serait travaillé.',
        );
      }

      const membershipId = parsed.data.membershipId ?? null;
      if (membershipId) {
        await assertNoOverlap(db, membershipId, startAt, endAt, shift.id);
      }

      await db.shift.update({
        where: { id: shift.id },
        data: {
          membershipId,
          localDate: new Date(`${parsed.data.localDate}T00:00:00Z`),
          startAt,
          endAt,
          breakMinutes: totals.breakMinutes,
          paidBreakMinutes: totals.paidBreakMinutes,
          mealCount: parsed.data.mealCount,
          labelId: parsed.data.labelId ?? null,
          note: parsed.data.note ?? null,
          version: { increment: 1 },
        },
      });

      // Les pauses sont **remplacées**, pas fusionnées. Le formulaire porte
      // l'état voulu au complet ; rapprocher ligne à ligne inventerait une
      // identité que la saisie n'a pas, et ferait survivre une pause retirée.
      await db.shiftBreak.deleteMany({ where: { shiftId: shift.id } });
      for (const [position, entry] of breaks.entries()) {
        await db.shiftBreak.create({
          data: {
            shiftId: shift.id,
            startMinutes: entry.startMinutes,
            durationMinutes: entry.durationMinutes,
            isPaid: entry.isPaid,
            label: entry.label,
            position,
          } as never,
        });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'planning.shift.update',
        entityType: 'Shift',
        entityId: shift.id,
        before: {
          membershipId: shift.membershipId,
          startAt: shift.startAt.toISOString(),
          endAt: shift.endAt.toISOString(),
        },
        after: {
          membershipId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        },
      });

      await assertNoBlocking(db, shift.weeklyScheduleId);
    });
  } catch (error) {
    return toState(error, 'Vous ne pouvez pas modifier ce créneau.');
  }

  revalidatePath('/planning/semaine');
  return { ok: true };
}

export async function deleteShiftAction(
  _previous: PlanningActionState,
  formData: FormData,
): Promise<PlanningActionState> {
  const shiftId = String(formData.get('shiftId') ?? '');
  if (!shiftId) return { error: 'Créneau introuvable.' };

  try {
    await mutate('planning.delete', async (db, actor) => {
      const shift = await db.shift.findUnique({
        where: { id: shiftId },
        include: { schedule: true },
      });
      if (!shift) throw new AuthorizationError('planning.delete');

      if (shift.schedule.status === 'PUBLISHED') {
        assertMayEditPublished(actor);
      }

      await assertPeriodOpen(db, shift.schedule.locationId, [
        shift.localDate.toISOString().slice(0, 10),
      ]);

      // La trace est écrite **avant** la suppression : après, l'identifiant ne
      // désigne plus rien, et l'état supprimé serait perdu.
      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'planning.shift.delete',
        entityType: 'Shift',
        entityId: shift.id,
        before: {
          membershipId: shift.membershipId,
          startAt: shift.startAt.toISOString(),
          endAt: shift.endAt.toISOString(),
        },
      });

      await db.shift.delete({ where: { id: shift.id } });

      // Supprimer ne peut pas créer d'incohérence, mais peut en résoudre une :
      // la semaine et ses voisines sont réévaluées pour que les badges
      // disparaissent avec le créneau.
      await evaluateAround(db, shift.weeklyScheduleId);
    });
  } catch (error) {
    return toState(error, 'Vous ne pouvez pas supprimer ce créneau.');
  }

  revalidatePath('/planning/semaine');
  return { ok: true };
}

const publishInput = z.object({
  teamId: z.string().min(1),
  week: z.string().min(1),
  expectedVersion: z.coerce.number().int().min(0),
  /** Justification exigée dès qu'une alerte non acquittée subsiste. */
  acknowledgement: z.string().trim().max(500).optional(),
});

/**
 * Publier et dépublier par une **seule** action, l'intention venant du
 * formulaire.
 *
 * Passer tantôt l'une tantôt l'autre à `useActionState` selon l'état paraît
 * naturel et ne fonctionne pas : le formulaire cesse de suivre le changement
 * d'action, et un bouton « Dépublier » finit par republier — sans message
 * d'erreur, puisque l'action exécutée réussit.
 *
 * Mesuré sur trois envois consécutifs, en lisant l'en-tête `Next-Action` :
 *
 *     1er envoi   next-action: 60b8097e   (dépublier)  → brouillon
 *     2e  envoi   next-action: 6012d40f   (publier)    → publiée
 *     3e  envoi   next-action: 6012d40f   (publier)    → publiée
 *
 * L'intention voyage donc avec le bouton, `name`/`value` sur le déclencheur :
 * un champ caché serait remis à sa valeur d'origine par la réinitialisation
 * que React applique après chaque action, un bouton ne l'est jamais.
 */
export async function setWeekPublicationAction(
  _previous: PlanningActionState,
  formData: FormData,
): Promise<PlanningActionState> {
  return setPublication(
    formData,
    formData.get(PUBLICATION_INTENT_FIELD) === PUBLISH_INTENT,
  );
}

const duplicateInput = z.object({
  teamId: z.string().min(1),
  /** Semaine à copier. */
  source: z.string().min(1),
  /** Semaine de destination. */
  target: z.string().min(1),
});

/**
 * Duplique une semaine vers une autre.
 *
 * C'est le geste le plus fréquent du métier : les plannings de commerce se
 * répètent d'une semaine à l'autre, à quelques ajustements près. La copie
 * reporte les créneaux **jour à jour** — le lundi source devient le lundi
 * cible — et recalcule les instants dans le fuseau de l'établissement, sans
 * quoi une copie franchissant un changement d'heure décalerait tout d'une
 * heure.
 *
 * La destination doit être **vide** : écraser silencieusement le travail de
 * quelqu'un d'autre est pire que refuser.
 */
export async function duplicateWeekAction(
  _previous: PlanningActionState,
  formData: FormData,
): Promise<PlanningActionState> {
  const parsed = duplicateInput.safeParse({
    teamId: formData.get('teamId'),
    source: formData.get('source'),
    target: formData.get('target'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const source = parseWeekParam(parsed.data.source);
  const target = parseWeekParam(parsed.data.target);
  if (!source || !target) return { error: 'Semaine invalide.' };
  if (source.isoYear === target.isoYear && source.isoWeek === target.isoWeek) {
    return { error: 'La semaine source et la semaine cible sont identiques.' };
  }

  let copied = 0;

  try {
    await mutate('planning.duplicate', async (db, actor) => {
      const { team, location } = await loadTeamContext(db, parsed.data.teamId);

      const from = await db.weeklySchedule.findUnique({
        where: {
          teamId_isoYear_isoWeek: {
            teamId: team.id,
            isoYear: source.isoYear,
            isoWeek: source.isoWeek,
          },
        },
      });
      if (!from) {
        throw new ValidationError("La semaine à copier n'existe pas.");
      }

      const shifts = await db.shift.findMany({
        where: { weeklyScheduleId: from.id },
      });
      if (shifts.length === 0) {
        throw new ValidationError('La semaine à copier ne contient aucun créneau.');
      }

      const to = await ensureSchedule(
        db,
        team.id,
        location.id,
        target.isoYear,
        target.isoWeek,
      );

      const existing = await db.shift.count({
        where: { weeklyScheduleId: to.id },
      });
      if (existing > 0) {
        throw new ValidationError(
          'La semaine de destination contient déjà des créneaux. Videz-la avant de dupliquer.',
        );
      }

      const sourceDates = weekDates(source);
      const targetDates = weekDates(target);
      const dayOf = new Map(sourceDates.map((date, index) => [date, index]));

      for (const shift of shifts) {
        const column = dayOf.get(zonedDate(shift.startAt, location.timezone));
        if (column === undefined) continue;

        const targetDate = targetDates[column] as string;
        // Report par heure locale, pas par décalage de sept jours : entre
        // mars et avril, sept jours d'écart ne redonnent pas la même heure.
        const startClock = zonedClock(shift.startAt, location.timezone);
        const endClock = zonedClock(shift.endAt, location.timezone);

        const startAt = zonedInstant(targetDate, startClock, location.timezone);
        let endAt = zonedInstant(targetDate, endClock, location.timezone);
        if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86_400_000);

        await db.shift.create({
          data: {
            weeklyScheduleId: to.id,
            membershipId: shift.membershipId,
            localDate: new Date(`${targetDate}T00:00:00Z`),
            startAt,
            endAt,
            breakMinutes: shift.breakMinutes,
            labelId: shift.labelId,
            note: shift.note,
          } as never,
        });
        copied += 1;
      }

      await assertNoBlocking(db, to.id);

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'planning.week.duplicate',
        entityType: 'WeeklySchedule',
        entityId: to.id,
        after: {
          teamId: team.id,
          from: `${source.isoYear}-W${source.isoWeek}`,
          to: `${target.isoYear}-W${target.isoWeek}`,
          shifts: copied,
        },
      });
    });
  } catch (error) {
    return toState(error, 'Vous ne pouvez pas dupliquer cette semaine.');
  }

  revalidatePath('/planning/semaine');
  return { ok: true };
}

/**
 * Publie ou dépublie la semaine d'une **équipe**.
 *
 * Le verrou optimiste porte sur `version` : deux managers sur la même grille
 * est le cas normal, pas l'exception. Sans lui, le second écraserait la
 * décision du premier sans que personne ne le voie (PLAN.md §3.4).
 */
async function setPublication(
  formData: FormData,
  publish: boolean,
): Promise<PlanningActionState> {
  const parsed = publishInput.safeParse({
    teamId: formData.get('teamId'),
    week: formData.get('week'),
    expectedVersion: formData.get('expectedVersion') ?? 0,
    acknowledgement: formData.get('acknowledgement') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const week = parseWeekParam(parsed.data.week);
  if (!week) return { error: 'Semaine invalide.' };

  try {
    await mutate(publish ? 'planning.publish' : 'planning.unpublish', async (db, actor) => {
      const { team, location } = await loadTeamContext(db, parsed.data.teamId);
      const schedule = await ensureSchedule(
        db,
        team.id,
        location.id,
        week.isoYear,
        week.isoWeek,
      );

      if (publish) {
        const count = await db.shift.count({
          where: { weeklyScheduleId: schedule.id },
        });
        if (count === 0) {
          throw new ValidationError(
            'Cette semaine ne contient aucun créneau : rien à publier.',
          );
        }

        // Contrôle complet du périmètre publié, pas seulement des créneaux
        // touchés depuis la dernière saisie : publier est l'engagement.
        await evaluateSchedule(db, schedule.id);
        await acknowledgeBeforePublishing(
          db,
          schedule.id,
          actor.membershipId,
          parsed.data.acknowledgement ?? null,
        );
      }

      const updated = await db.weeklySchedule.updateMany({
        where: { id: schedule.id, version: parsed.data.expectedVersion },
        data: {
          status: publish ? 'PUBLISHED' : 'DRAFT',
          publishedAt: publish ? new Date() : null,
          publishedBy: publish ? actor.membershipId : null,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new ValidationError(
          'Cette semaine a été modifiée entre-temps. Rechargez la page avant de recommencer.',
        );
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: publish ? 'planning.publish' : 'planning.unpublish',
        entityType: 'WeeklySchedule',
        entityId: schedule.id,
        before: { status: schedule.status, version: schedule.version },
        after: {
          status: publish ? 'PUBLISHED' : 'DRAFT',
          teamId: team.id,
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
        },
      });
    });
  } catch (error) {
    return toState(
      error,
      publish
        ? 'Vous ne pouvez pas publier cette semaine.'
        : 'Vous ne pouvez pas dépublier cette semaine.',
    );
  }

  revalidatePath('/planning/semaine');
  return { ok: true };
}



/**
 * Publier malgré une alerte suppose de l'assumer.
 *
 * Un `BLOCKING` interdit la publication : c'est une incohérence, pas un choix.
 * Un `WARNING` reste franchissable, mais la justification est enregistrée sur
 * chaque constat et laisse une entrée d'audit — c'est ce qui distingue une
 * dérogation assumée d'une alerte ignorée.
 */
async function acknowledgeBeforePublishing(
  db: ScopedClient,
  scheduleId: string,
  actorMembershipId: string,
  reason: string | null,
): Promise<void> {
  const blocking = await db.complianceViolation.findFirst({
    where: { weeklyScheduleId: scheduleId, severity: 'BLOCKING' },
    select: { message: true },
  });
  if (blocking) {
    throw new ValidationError(
      `Publication impossible — ${blocking.message}`,
    );
  }

  const pending = await db.complianceViolation.findMany({
    where: {
      weeklyScheduleId: scheduleId,
      severity: 'WARNING',
      acknowledgedAt: null,
    },
    select: { id: true, ruleCode: true, message: true },
  });
  if (pending.length === 0) return;

  if (!reason) {
    throw new ValidationError(
      `${pending.length} alerte${pending.length > 1 ? 's' : ''} de convention non justifiée${pending.length > 1 ? 's' : ''} : ${pending[0]?.message ?? ''} Indiquez un motif pour publier malgré tout.`,
    );
  }

  const now = new Date();
  await db.complianceViolation.updateMany({
    where: { id: { in: pending.map((entry) => entry.id) } },
    data: {
      acknowledgedBy: actorMembershipId,
      acknowledgedAt: now,
      acknowledgementReason: reason,
    },
  });

  await recordAudit(db, {
    actorMembershipId,
    action: 'planning.alert.acknowledge',
    entityType: 'WeeklySchedule',
    entityId: scheduleId,
    after: {
      acknowledged: pending.length,
      rules: pending.map((entry) => entry.ruleCode).join(', '),
    },
    reason,
  });
}

/**
 * Réévalue la semaine touchée et ses voisines, et refuse l'enregistrement si un
 * constat bloquant apparaît.
 *
 * Les `BLOCKING` sont des incohérences de données — chevauchement, créneau
 * pendant une absence — pas des arbitrages d'organisation. La transaction est
 * annulée : mieux vaut refuser une saisie que garder en base un planning dont
 * les heures se comptent deux fois.
 */
async function assertNoBlocking(
  db: ScopedClient,
  scheduleId: string,
): Promise<void> {
  await evaluateAround(db, scheduleId);

  const blocking = await db.complianceViolation.findFirst({
    where: { weeklyScheduleId: scheduleId, severity: 'BLOCKING' },
    select: { message: true },
  });

  if (blocking) throw new ValidationError(blocking.message);
}

/**
 * Deux créneaux qui se chevauchent pour le même salarié sont impossibles dans
 * la réalité, et compteraient deux fois en heures. Le contrôle est en base et
 * en transaction — un contrôle côté formulaire ne survit pas à deux managers
 * qui planifient en même temps.
 */
async function assertNoOverlap(
  db: ScopedClient,
  membershipId: string,
  startAt: Date,
  endAt: Date,
  ignoreShiftId: string | null,
): Promise<void> {
  const clash = await db.shift.findFirst({
    where: {
      membershipId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(ignoreShiftId ? { id: { not: ignoreShiftId } } : {}),
    },
    select: { id: true },
  });

  if (clash) {
    throw new ValidationError(
      'Ce salarié a déjà un créneau qui recouvre cette plage.',
    );
  }
}

/**
 * Une semaine publiée n'est pas gelée, mais la toucher est une seconde
 * décision : le salarié a organisé sa semaine sur ce qu'il a lu. D'où une
 * capacité distincte de `planning.edit`, que le rôle manager n'a pas par
 * défaut.
 */
function assertMayEditPublished(actor: Actor): void {
  if (!can(actor, 'planning.edit_published')) {
    throw new ValidationError(
      'Cette semaine est publiée. Dépubliez-la, ou demandez le droit de modifier une semaine publiée.',
    );
  }
}

function toState(error: unknown, denied: string): PlanningActionState {
  if (error instanceof ValidationError) return { error: error.message };
  // Une pause mal saisie se corrige dans le formulaire : le message dit
  // laquelle et pourquoi, plutôt qu'un refus général.
  if (error instanceof BreakError) return { error: error.message };
  // Le verrou de période porte son propre message, qui explique la sortie :
  // déverrouiller, ou régulariser sur la période suivante.
  if (error instanceof PeriodLockedError) return { error: error.message };
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
