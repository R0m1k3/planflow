'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { START_POINTS } from '@/domain/retention/policy';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
import { runRetentionPurge } from '@/server/retention/purge';

export interface RetentionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

const policyInput = z.object({
  objectType: z.string().trim().min(1, 'Objet requis').max(80),
  durationMonths: z.coerce
    .number()
    .int()
    .min(1, 'La durée doit valoir au moins un mois')
    .max(1200),
  startPoint: z.enum(START_POINTS),
  /**
   * Obligatoire, et c'est le point : la matrice exige que chaque durée porte sa
   * justification. Une durée sans motif est une durée qu'on ne saura pas
   * défendre le jour d'un contrôle.
   */
  justification: z
    .string()
    .trim()
    .min(10, 'Justifiez la durée : elle devra être défendue lors d’un contrôle')
    .max(500),
  effectiveFrom: z.coerce.date(),
});

export async function saveRetentionPolicyAction(
  _previous: RetentionState,
  formData: FormData,
): Promise<RetentionState> {
  const parsed = policyInput.safeParse({
    objectType: formData.get('objectType'),
    durationMonths: formData.get('durationMonths'),
    startPoint: formData.get('startPoint'),
    justification: formData.get('justification'),
    effectiveFrom: formData.get('effectiveFrom'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('settings.access', async (db, actor) => {
      const { objectType, effectiveFrom } = parsed.data;

      const existing = await db.retentionPolicy.findFirst({
        where: { objectType, effectiveFrom },
      });

      if (existing) {
        await db.retentionPolicy.update({
          where: { id: existing.id },
          data: {
            durationMonths: parsed.data.durationMonths,
            startPoint: parsed.data.startPoint,
            justification: parsed.data.justification,
          } as never,
        });
      } else {
        await db.retentionPolicy.create({ data: parsed.data as never });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'retention.policy.save',
        entityType: 'RetentionPolicy',
        entityId: existing?.id ?? objectType,
        before: existing
          ? {
              durationMonths: existing.durationMonths,
              startPoint: existing.startPoint,
            }
          : null,
        after: {
          objectType,
          durationMonths: parsed.data.durationMonths,
          startPoint: parsed.data.startPoint,
        },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de modifier les durées.");
  }

  revalidatePath('/reglages/conservation');
  return { ok: true, message: 'Durée enregistrée.' };
}

/**
 * Suspend ou lève une conservation à titre probatoire.
 *
 * Un contentieux impose de garder des pièces au-delà de leur échéance. La
 * suspension prime sur la durée, et son basculement est tracé : lever un
 * séquestre est une décision, pas un réglage.
 */
export async function toggleLegalHoldAction(
  _previous: RetentionState,
  formData: FormData,
): Promise<RetentionState> {
  const id = String(formData.get('policyId') ?? '');
  if (!id) return { error: 'Politique introuvable.' };

  let held = false;

  try {
    await mutate('settings.access', async (db, actor) => {
      const policy = await db.retentionPolicy.findUnique({ where: { id } });
      if (!policy) return;

      held = !policy.legalHold;
      await db.retentionPolicy.update({
        where: { id },
        data: { legalHold: held } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: held ? 'retention.hold.set' : 'retention.hold.release',
        entityType: 'RetentionPolicy',
        entityId: id,
        before: { legalHold: policy.legalHold },
        after: { legalHold: held },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de modifier les durées.");
  }

  revalidatePath('/reglages/conservation');
  return {
    ok: true,
    message: held
      ? 'Conservation suspendue : les pièces concernées ne seront pas purgées.'
      : 'Suspension levée.',
  };
}

/**
 * Lance la purge.
 *
 * Exposée à l'écran **et** disponible en ligne de commande pour une exécution
 * périodique : la matrice demande des purges automatiques, et un bouton qu'il
 * faut penser à presser n'en est pas une.
 */
export async function runPurgeAction(
  _previous: RetentionState,
  _formData: FormData,
): Promise<RetentionState> {
  let purged = 0;

  try {
    await mutate('settings.access', async (db, actor) => {
      const report = await runRetentionPurge(db, actor.membershipId);
      purged = report.purged;
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de lancer une purge.");
  }

  revalidatePath('/reglages/conservation');
  return {
    ok: true,
    message:
      purged === 0
        ? 'Aucune pièce échue : rien n’a été effacé.'
        : `${purged} pièce${purged > 1 ? 's' : ''} effacée${purged > 1 ? 's' : ''}.`,
  };
}

function toState(error: unknown, denied: string): RetentionState {
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
