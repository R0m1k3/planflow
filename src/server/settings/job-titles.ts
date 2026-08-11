'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { recordAudit } from '@/server/audit';
import { mutate, query } from '@/server/context';

/**
 * Emplois — PLAN.md §9, réglage « /reglages/emplois ».
 *
 * L'emploi est la qualification portée par le contrat, et il figure au registre
 * unique du personnel. Il est donc **archivé, jamais supprimé** : un emploi
 * effacé rendrait illisible un contrat clos dont la conservation court encore.
 */

export interface JobTitleRow {
  id: string;
  name: string;
  archivedAt: Date | null;
  /** Contrats qui s'y rattachent — un emploi porté n'est pas un doublon à purger. */
  contractCount: number;
}

export async function listJobTitles(
  includeArchived = false,
): Promise<JobTitleRow[]> {
  return query('settings.access', async (db) => {
    const titles = await db.jobTitle.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: { name: 'asc' },
    });

    const counts = await db.userContract.groupBy({
      by: ['jobTitleId'],
      _count: { _all: true },
    });

    const byId = new Map(
      counts.map((row) => [row.jobTitleId, row._count._all] as const),
    );

    return titles.map((title) => ({
      id: title.id,
      name: title.name,
      archivedAt: title.archivedAt,
      contractCount: byId.get(title.id) ?? 0,
    }));
  });
}

export interface ActionState {
  error?: string;
  ok?: boolean;
}

const nameInput = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
});

export async function createJobTitleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = nameInput.safeParse({ name: formData.get('name') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('settings.jobtitles.manage', async (db, actor) => {
      // Un emploi archivé porte le même nom qu'un emploi à recréer : on le
      // réveille plutôt que d'échouer sur la contrainte d'unicité, sans quoi le
      // nom deviendrait définitivement inutilisable.
      const existing = await db.jobTitle.findFirst({
        where: { name: parsed.data.name },
      });

      if (existing && existing.archivedAt === null) {
        throw new DuplicateJobTitle();
      }

      if (existing) {
        await db.jobTitle.update({
          where: { id: existing.id },
          data: { archivedAt: null },
        });
        await recordAudit(db, {
          actorMembershipId: actor.membershipId,
          action: 'job_title.restore',
          entityType: 'JobTitle',
          entityId: existing.id,
          before: { archivedAt: existing.archivedAt },
          after: { archivedAt: null },
        });
        return;
      }

      const created = await db.jobTitle.create({
        data: { name: parsed.data.name } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'job_title.create',
        entityType: 'JobTitle',
        entityId: created.id,
        after: { name: created.name },
      });
    });
  } catch (error) {
    if (error instanceof DuplicateJobTitle) {
      return { error: 'Cet emploi existe déjà.' };
    }
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les emplois." };
    }
    throw error;
  }

  revalidatePath('/reglages/emplois');
  return { ok: true };
}

class DuplicateJobTitle extends Error {}

const renameInput = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Nom requis').max(120),
});

export async function renameJobTitleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = renameInput.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('settings.jobtitles.manage', async (db, actor) => {
      const before = await db.jobTitle.findUnique({
        where: { id: parsed.data.id },
      });
      if (!before) throw new AuthorizationError('settings.jobtitles.manage');

      const clash = await db.jobTitle.findFirst({
        where: { name: parsed.data.name, id: { not: before.id } },
      });
      if (clash) throw new DuplicateJobTitle();

      await db.jobTitle.update({
        where: { id: before.id },
        data: { name: parsed.data.name },
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'job_title.rename',
        entityType: 'JobTitle',
        entityId: before.id,
        before: { name: before.name },
        after: { name: parsed.data.name },
      });
    });
  } catch (error) {
    if (error instanceof DuplicateJobTitle) {
      return { error: 'Un autre emploi porte déjà ce nom.' };
    }
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les emplois." };
    }
    throw error;
  }

  revalidatePath('/reglages/emplois');
  return { ok: true };
}

export async function archiveJobTitleAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const restore = formData.get('restore') === '1';
  if (!id) return;

  await mutate('settings.jobtitles.manage', async (db, actor) => {
    const before = await db.jobTitle.findUnique({ where: { id } });
    if (!before) return;

    const archivedAt = restore ? null : new Date();
    await db.jobTitle.update({ where: { id }, data: { archivedAt } });

    await recordAudit(db, {
      actorMembershipId: actor.membershipId,
      action: restore ? 'job_title.restore' : 'job_title.archive',
      entityType: 'JobTitle',
      entityId: id,
      before: { archivedAt: before.archivedAt },
      after: { archivedAt: archivedAt?.toISOString() ?? null },
    });
  });

  revalidatePath('/reglages/emplois');
}
