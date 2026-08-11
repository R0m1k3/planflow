'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { isAbsenceColorKey } from '@/domain/absences/colors';
import { recordAudit } from '@/server/audit';
import { mutate, query } from '@/server/context';

/**
 * Types d'absence — PLAN.md §9, réglage « /reglages/types-absence ».
 *
 * Ce référentiel n'est pas décoratif : chaque drapeau porte une conséquence de
 * paie ou de droit.
 *
 * - `isSocialSecurity` isole maladie, maternité et accident du travail. Le
 *   journal des absences les filtre séparément, et ce sont des **données de
 *   santé** : la vue manager ne doit pas en montrer le motif (matrice n° 9).
 * - `affectsPaidLeaveAccrual` décide si la période acquiert des congés payés.
 * - `countsAsWorkTime` décide si la durée entre dans le décompte horaire, donc
 *   dans les seuils de convention.
 * - `silaeCode` est la partie `<code>` de `AB-<code>` à l'export (§8.2). Sans
 *   lui, l'export de la période **échoue** plutôt que de produire un fichier
 *   partiel — c'est voulu.
 *
 * **Autorisation.** Les mutations passent par `settings.agreement.manage` et
 * non par un code dédié : le catalogue de §5 n'en déclare pas, et ces drapeaux
 * relèvent du paramétrage conventionnel et légal, exactement ce que cette
 * capacité gouverne. Créer un code sans mandat aurait été inventer une règle.
 */

export interface AbsenceTypeRow {
  id: string;
  code: string;
  name: string;
  colorKey: string;
  isPaid: boolean;
  countsAsWorkTime: boolean;
  affectsPaidLeaveAccrual: boolean;
  isSocialSecurity: boolean;
  requiresJustification: boolean;
  minNoticeDays: number | null;
  silaeCode: string | null;
  archivedAt: Date | null;
  /** Absences saisies avec ce type — un type porté ne se supprime pas. */
  timeOffCount: number;
}

export async function listAbsenceTypes(
  includeArchived = false,
): Promise<AbsenceTypeRow[]> {
  return query('settings.access', async (db) => {
    const types = await db.absenceType.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: { code: 'asc' },
    });

    const counts = await db.timeOff.groupBy({
      by: ['absenceTypeId'],
      _count: { _all: true },
    });
    const byId = new Map(
      counts.map((row) => [row.absenceTypeId, row._count._all] as const),
    );

    return types.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      colorKey: type.colorKey,
      isPaid: type.isPaid,
      countsAsWorkTime: type.countsAsWorkTime,
      affectsPaidLeaveAccrual: type.affectsPaidLeaveAccrual,
      isSocialSecurity: type.isSocialSecurity,
      requiresJustification: type.requiresJustification,
      minNoticeDays: type.minNoticeDays,
      silaeCode: type.silaeCode,
      archivedAt: type.archivedAt,
      timeOffCount: byId.get(type.id) ?? 0,
    }));
  });
}

export interface ActionState {
  error?: string;
  ok?: boolean;
}

class DuplicateAbsenceType extends Error {}

const flags = {
  isPaid: z.coerce.boolean(),
  countsAsWorkTime: z.coerce.boolean(),
  affectsPaidLeaveAccrual: z.coerce.boolean(),
  isSocialSecurity: z.coerce.boolean(),
  requiresJustification: z.coerce.boolean(),
  minNoticeDays: z
    .union([z.literal(''), z.coerce.number().int().min(0).max(365)])
    .transform((value) => (value === '' ? null : value)),
  silaeCode: z
    .string()
    .trim()
    .max(20)
    .transform((value) => (value === '' ? null : value)),
};

const createInput = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Code requis')
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, 'Lettres, chiffres, tirets et soulignés'),
  name: z.string().trim().min(1, 'Nom requis').max(120),
  colorKey: z.string().refine(isAbsenceColorKey, 'Famille de couleur inconnue'),
  ...flags,
});

function readForm(formData: FormData) {
  return {
    code: formData.get('code'),
    name: formData.get('name'),
    colorKey: formData.get('colorKey') || 'sans-solde',
    isPaid: formData.get('isPaid') === 'on',
    countsAsWorkTime: formData.get('countsAsWorkTime') === 'on',
    affectsPaidLeaveAccrual: formData.get('affectsPaidLeaveAccrual') === 'on',
    isSocialSecurity: formData.get('isSocialSecurity') === 'on',
    requiresJustification: formData.get('requiresJustification') === 'on',
    minNoticeDays: (formData.get('minNoticeDays') ?? '') as string,
    silaeCode: (formData.get('silaeCode') ?? '') as string,
  };
}

export async function createAbsenceTypeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const code = parsed.data.code.toUpperCase();

  try {
    await mutate('settings.agreement.manage', async (db, actor) => {
      const existing = await db.absenceType.findFirst({ where: { code } });
      if (existing) throw new DuplicateAbsenceType();

      const { code: _ignored, ...rest } = parsed.data;
      const created = await db.absenceType.create({
        data: { ...rest, code } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'absence_type.create',
        entityType: 'AbsenceType',
        entityId: created.id,
        after: { code: created.code, name: created.name },
      });
    });
  } catch (error) {
    if (error instanceof DuplicateAbsenceType) {
      return { error: 'Ce code de type d’absence est déjà pris.' };
    }
    if (error instanceof AuthorizationError) {
      return {
        error: "Vous n'avez pas le droit de gérer les types d'absence.",
      };
    }
    throw error;
  }

  revalidatePath('/reglages/types-absence');
  return { ok: true };
}

const updateInput = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Nom requis').max(120),
  colorKey: z.string().refine(isAbsenceColorKey, 'Famille de couleur inconnue'),
  ...flags,
});

export async function updateAbsenceTypeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateInput.safeParse({
    ...readForm(formData),
    id: formData.get('id'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('settings.agreement.manage', async (db, actor) => {
      const { id, ...data } = parsed.data;
      const before = await db.absenceType.findUnique({ where: { id } });
      if (!before) throw new AuthorizationError('settings.agreement.manage');

      await db.absenceType.update({ where: { id }, data });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'absence_type.update',
        entityType: 'AbsenceType',
        entityId: id,
        before: {
          name: before.name,
          isPaid: before.isPaid,
          countsAsWorkTime: before.countsAsWorkTime,
          affectsPaidLeaveAccrual: before.affectsPaidLeaveAccrual,
          isSocialSecurity: before.isSocialSecurity,
          requiresJustification: before.requiresJustification,
          minNoticeDays: before.minNoticeDays,
          silaeCode: before.silaeCode,
        },
        after: data,
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        error: "Vous n'avez pas le droit de gérer les types d'absence.",
      };
    }
    throw error;
  }

  revalidatePath('/reglages/types-absence');
  revalidatePath('/absences/calendrier');
  return { ok: true };
}

export async function archiveAbsenceTypeAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const restore = formData.get('restore') === '1';
  if (!id) return;

  await mutate('settings.agreement.manage', async (db, actor) => {
    const before = await db.absenceType.findUnique({ where: { id } });
    if (!before) return;

    // Archiver, jamais supprimer : les absences passées gardent leur type, et
    // les compteurs de congés s'appuient dessus pour justifier une écriture.
    const archivedAt = restore ? null : new Date();
    await db.absenceType.update({ where: { id }, data: { archivedAt } });

    await recordAudit(db, {
      actorMembershipId: actor.membershipId,
      action: restore ? 'absence_type.restore' : 'absence_type.archive',
      entityType: 'AbsenceType',
      entityId: id,
      before: { archivedAt: before.archivedAt },
      after: { archivedAt: archivedAt?.toISOString() ?? null },
    });
  });

  revalidatePath('/reglages/types-absence');
  revalidatePath('/absences/calendrier');
}
