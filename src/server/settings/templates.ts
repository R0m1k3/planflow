'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { referencedFields, unknownFields } from '@/domain/documents/template';
import { recordAudit } from '@/server/audit';
import { mutate, query } from '@/server/context';

/**
 * Modèles de documents — PLAN.md §9, réglage « /reglages/modeles-documents ».
 *
 * L'écran valide les variables **à l'enregistrement**, pas à la génération. Un
 * modèle qui cite `{{salarie.salire}}` doit être refusé par l'administrateur
 * qui l'écrit, pas découvert par le gestionnaire qui tente d'éditer une
 * attestation devant le salarié qui attend.
 */

export interface TemplateRow {
  id: string;
  name: string;
  bodyHtml: string;
  fields: string[];
  archivedAt: Date | null;
  createdAt: Date;
  /** Pièces déjà générées depuis ce modèle. */
  documentCount: number;
}

export async function listTemplates(
  includeArchived = false,
): Promise<TemplateRow[]> {
  return query('settings.access', async (db) => {
    const templates = await db.documentTemplate.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: { name: 'asc' },
    });

    const counts = await db.document.groupBy({
      by: ['templateId'],
      _count: { _all: true },
    });
    const byId = new Map(
      counts.map((row) => [row.templateId, row._count._all] as const),
    );

    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      bodyHtml: template.bodyHtml,
      fields: Array.isArray(template.availableFields)
        ? (template.availableFields as string[])
        : [],
      archivedAt: template.archivedAt,
      createdAt: template.createdAt,
      documentCount: byId.get(template.id) ?? 0,
    }));
  });
}

export interface ActionState {
  error?: string;
  ok?: boolean;
}

class DuplicateTemplate extends Error {}

const templateInput = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(160),
  bodyHtml: z.string().trim().min(1, 'Corps requis').max(50_000),
});

/** Refuse un corps citant une variable que l'application ne sait pas résoudre. */
function rejectUnknownFields(bodyHtml: string): string | null {
  const unknown = unknownFields(bodyHtml);
  if (unknown.length === 0) return null;
  return `Variables inconnues : ${unknown.join(', ')}. Utilisez la liste ci-contre.`;
}

export async function createTemplateAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = templateInput.safeParse({
    name: formData.get('name'),
    bodyHtml: formData.get('bodyHtml'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const rejected = rejectUnknownFields(parsed.data.bodyHtml);
  if (rejected) return { error: rejected };

  try {
    await mutate('settings.templates.manage', async (db, actor) => {
      const existing = await db.documentTemplate.findFirst({
        where: { name: parsed.data.name },
      });
      if (existing) throw new DuplicateTemplate();

      const created = await db.documentTemplate.create({
        data: {
          name: parsed.data.name,
          bodyHtml: parsed.data.bodyHtml,
          // Les variables citées sont figées à l'enregistrement : elles
          // documentent ce que le modèle exige du dossier, et servent à
          // prévenir avant génération plutôt qu'à échouer pendant.
          availableFields: referencedFields(parsed.data.bodyHtml) as never,
        } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'document_template.create',
        entityType: 'DocumentTemplate',
        entityId: created.id,
        after: { name: created.name },
      });
    });
  } catch (error) {
    if (error instanceof DuplicateTemplate) {
      return { error: 'Un modèle porte déjà ce nom.' };
    }
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les modèles." };
    }
    throw error;
  }

  revalidatePath('/reglages/modeles-documents');
  return { ok: true };
}

const updateInput = templateInput.extend({ id: z.string().min(1) });

export async function updateTemplateAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateInput.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    bodyHtml: formData.get('bodyHtml'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const rejected = rejectUnknownFields(parsed.data.bodyHtml);
  if (rejected) return { error: rejected };

  try {
    await mutate('settings.templates.manage', async (db, actor) => {
      const before = await db.documentTemplate.findUnique({
        where: { id: parsed.data.id },
      });
      if (!before) throw new AuthorizationError('settings.templates.manage');

      await db.documentTemplate.update({
        where: { id: before.id },
        data: {
          name: parsed.data.name,
          bodyHtml: parsed.data.bodyHtml,
          availableFields: referencedFields(parsed.data.bodyHtml) as never,
        },
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'document_template.update',
        entityType: 'DocumentTemplate',
        entityId: before.id,
        before: { name: before.name },
        after: { name: parsed.data.name },
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les modèles." };
    }
    throw error;
  }

  revalidatePath('/reglages/modeles-documents');
  return { ok: true };
}

export async function archiveTemplateAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const restore = formData.get('restore') === '1';
  if (!id) return;

  await mutate('settings.templates.manage', async (db, actor) => {
    const before = await db.documentTemplate.findUnique({ where: { id } });
    if (!before) return;

    // Archiver, pas supprimer : une pièce déjà remise garde son `templateId`,
    // et perdre le modèle rendrait inexplicable la forme d'un acte signé.
    const archivedAt = restore ? null : new Date();
    await db.documentTemplate.update({ where: { id }, data: { archivedAt } });

    await recordAudit(db, {
      actorMembershipId: actor.membershipId,
      action: restore
        ? 'document_template.restore'
        : 'document_template.archive',
      entityType: 'DocumentTemplate',
      entityId: id,
      before: { archivedAt: before.archivedAt },
      after: { archivedAt: archivedAt?.toISOString() ?? null },
    });
  });

  revalidatePath('/reglages/modeles-documents');
}
