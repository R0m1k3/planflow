'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError, can, type Actor } from '@/domain/access/authorize';
import { shiftMinutes } from '@/domain/counters/week';
import {
  parseWeekParam,
  weekBounds,
  zonedInstant,
} from '@/domain/planning/week';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
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

const shiftInput = z.object({
  teamId: z.string().min(1),
  week: z.string().min(1),
  membershipId: z.string().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  start: z.string().regex(HOUR, 'Heure de début invalide'),
  end: z.string().regex(HOUR, 'Heure de fin invalide'),
  breakMinutes: z.coerce.number().int().min(0).max(600).default(0),
  labelId: z.string().optional(),
  note: z.string().trim().max(500).optional(),
});

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
  const parsed = shiftInput.safeParse({
    teamId: formData.get('teamId'),
    week: formData.get('week'),
    membershipId: formData.get('membershipId') || undefined,
    localDate: formData.get('localDate'),
    start: formData.get('start'),
    end: formData.get('end'),
    breakMinutes: formData.get('breakMinutes') || 0,
    labelId: formData.get('labelId') || undefined,
    note: formData.get('note') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const week = parseWeekParam(parsed.data.week);
  if (!week) return { error: 'Semaine invalide.' };

  try {
    await mutate('planning.create', async (db, actor) => {
      const { team, location } = await loadTeamContext(db, parsed.data.teamId);

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
      // Fin avant début = créneau de nuit : il finit le lendemain. Le refuser
      // interdirait de planifier un inventaire 22 h–02 h.
      if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86_400_000);

      const worked = shiftMinutes(startAt, endAt, parsed.data.breakMinutes);
      if (worked <= 0) {
        throw new ValidationError(
          'La pause dépasse la durée du créneau — rien ne serait travaillé.',
        );
      }

      const { from, to } = weekBounds(week, location.timezone);
      if (startAt < from || startAt >= to) {
        throw new ValidationError(
          "Ce créneau ne commence pas dans la semaine affichée.",
        );
      }

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

      if (parsed.data.membershipId) {
        await assertNoOverlap(db, parsed.data.membershipId, startAt, endAt, null);
      }

      const created = await db.shift.create({
        data: {
          weeklyScheduleId: schedule.id,
          membershipId: parsed.data.membershipId ?? null,
          localDate: new Date(`${parsed.data.localDate}T00:00:00Z`),
          startAt,
          endAt,
          breakMinutes: parsed.data.breakMinutes,
          labelId: parsed.data.labelId ?? null,
          note: parsed.data.note ?? null,
        } as never,
      });

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
        },
      });
    });
  } catch (error) {
    return toState(error, 'Vous ne pouvez pas créer de créneau ici.');
  }

  revalidatePath('/planning/semaine');
  return { ok: true };
}

const moveInput = z.object({
  shiftId: z.string().min(1),
  membershipId: z.string().optional(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  start: z.string().regex(HOUR, 'Heure de début invalide'),
  end: z.string().regex(HOUR, 'Heure de fin invalide'),
  breakMinutes: z.coerce.number().int().min(0).max(600).default(0),
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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

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

      if (shiftMinutes(startAt, endAt, parsed.data.breakMinutes) <= 0) {
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
          breakMinutes: parsed.data.breakMinutes,
          version: { increment: 1 },
        },
      });

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
});

export async function publishWeekAction(
  _previous: PlanningActionState,
  formData: FormData,
): Promise<PlanningActionState> {
  return setPublication(formData, true);
}

export async function unpublishWeekAction(
  _previous: PlanningActionState,
  formData: FormData,
): Promise<PlanningActionState> {
  return setPublication(formData, false);
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
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
