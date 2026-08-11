'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { isPosteCode } from '@/lib/design/postes';
import { recordAudit } from '@/server/audit';
import { mutate, query } from '@/server/context';

/**
 * Étiquettes de planning — PLAN.md §9, réglage « /reglages/etiquettes ».
 *
 * L'étiquette est le poste coloré de la grille. Sa teinte vient de la palette
 * catégorielle, jamais d'une couleur libre : douze teintes calculées pour
 * rester distinguables en vision daltonienne, et un code affiché avec le bloc
 * pour que la couleur ne porte jamais l'information seule.
 */

export interface LabelRow {
  id: string;
  code: string;
  name: string;
  paletteKey: string;
  position: number;
  archivedAt: Date | null;
  /** Créneaux qui la portent — une étiquette utilisée ne se supprime pas. */
  shiftCount: number;
}

export async function listLabels(includeArchived = false): Promise<LabelRow[]> {
  return query('settings.access', async (db) => {
    const labels = await db.label.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: [{ position: 'asc' }, { code: 'asc' }],
    });

    const counts = await db.shift.groupBy({
      by: ['labelId'],
      _count: { _all: true },
    });
    const byId = new Map(
      counts.map((row) => [row.labelId, row._count._all] as const),
    );

    return labels.map((label) => ({
      id: label.id,
      code: label.code,
      name: label.name,
      paletteKey: label.paletteKey,
      position: label.position,
      archivedAt: label.archivedAt,
      shiftCount: byId.get(label.id) ?? 0,
    }));
  });
}

export interface ActionState {
  error?: string;
  ok?: boolean;
}

class DuplicateLabel extends Error {}

const labelInput = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Code requis')
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, 'Lettres, chiffres et tirets seulement'),
  name: z.string().trim().min(1, 'Nom requis').max(120),
  paletteKey: z.string().refine(isPosteCode, 'Teinte inconnue'),
});

export async function createLabelAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = labelInput.safeParse({
    code: formData.get('code'),
    name: formData.get('name'),
    paletteKey: formData.get('paletteKey'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const code = parsed.data.code.toLowerCase();

  try {
    await mutate('planning.labels.manage', async (db, actor) => {
      const existing = await db.label.findFirst({ where: { code } });
      if (existing && existing.archivedAt === null) throw new DuplicateLabel();

      if (existing) {
        await db.label.update({
          where: { id: existing.id },
          data: {
            archivedAt: null,
            name: parsed.data.name,
            paletteKey: parsed.data.paletteKey,
          },
        });
        await recordAudit(db, {
          actorMembershipId: actor.membershipId,
          action: 'label.restore',
          entityType: 'Label',
          entityId: existing.id,
          before: { archivedAt: existing.archivedAt, name: existing.name },
          after: { archivedAt: null, name: parsed.data.name },
        });
        return;
      }

      const position = await db.label.count();
      const created = await db.label.create({
        data: {
          code,
          name: parsed.data.name,
          paletteKey: parsed.data.paletteKey,
          position,
        } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'label.create',
        entityType: 'Label',
        entityId: created.id,
        after: {
          code: created.code,
          name: created.name,
          paletteKey: created.paletteKey,
        },
      });
    });
  } catch (error) {
    if (error instanceof DuplicateLabel) {
      return { error: 'Ce code d’étiquette est déjà pris.' };
    }
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les étiquettes." };
    }
    throw error;
  }

  revalidatePath('/reglages/etiquettes');
  revalidatePath('/planning/etiquettes');
  return { ok: true };
}

const updateInput = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Nom requis').max(120),
  paletteKey: z.string().refine(isPosteCode, 'Teinte inconnue'),
});

export async function updateLabelAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateInput.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    paletteKey: formData.get('paletteKey'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('planning.labels.manage', async (db, actor) => {
      const before = await db.label.findUnique({ where: { id: parsed.data.id } });
      if (!before) throw new AuthorizationError('planning.labels.manage');

      await db.label.update({
        where: { id: before.id },
        data: { name: parsed.data.name, paletteKey: parsed.data.paletteKey },
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'label.update',
        entityType: 'Label',
        entityId: before.id,
        before: { name: before.name, paletteKey: before.paletteKey },
        after: { name: parsed.data.name, paletteKey: parsed.data.paletteKey },
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les étiquettes." };
    }
    throw error;
  }

  revalidatePath('/reglages/etiquettes');
  revalidatePath('/planning/etiquettes');
  return { ok: true };
}

export async function archiveLabelAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const restore = formData.get('restore') === '1';
  if (!id) return;

  await mutate('planning.labels.manage', async (db, actor) => {
    const before = await db.label.findUnique({ where: { id } });
    if (!before) return;

    // Archiver, pas supprimer : les créneaux passés portent cette étiquette et
    // les rapports d'heures s'y adossent. Une suppression laisserait des
    // semaines closes sans poste lisible.
    const archivedAt = restore ? null : new Date();
    await db.label.update({ where: { id }, data: { archivedAt } });

    await recordAudit(db, {
      actorMembershipId: actor.membershipId,
      action: restore ? 'label.restore' : 'label.archive',
      entityType: 'Label',
      entityId: id,
      before: { archivedAt: before.archivedAt },
      after: { archivedAt: archivedAt?.toISOString() ?? null },
    });
  });

  revalidatePath('/reglages/etiquettes');
  revalidatePath('/planning/etiquettes');
}
