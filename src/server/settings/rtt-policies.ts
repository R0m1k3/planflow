'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { recordAudit } from '@/server/audit';
import { mutate, query } from '@/server/context';

/**
 * Politiques de RTT — PLAN.md §9, réglage « /reglages/politiques-rtt ».
 *
 * Une politique porte un nombre de jours par an et une date de début de
 * période. Elle **se reconduit automatiquement** tant qu'elle est active ;
 * archivée, elle cesse de le faire — c'est le critère d'acceptation de WP-06.
 *
 * Les deux actions de ligne relevées à l'audit sont « Assigner des employés » et
 * « Archiver ». Pas de suppression : une politique a produit des acquisitions au
 * registre des compteurs, et l'effacer rendrait ces écritures inexplicables.
 *
 * **Autorisation.** `settings.agreement.manage`, comme les types d'absence : le
 * catalogue §5 ne déclare pas de code dédié, et un droit à RTT relève du
 * paramétrage conventionnel. Inventer une capacité aurait créé un droit sans
 * rien protéger de neuf.
 */

export interface RttPolicyRow {
  id: string;
  name: string;
  daysPerYear: string;
  /** « MM-JJ ». */
  periodStart: string;
  autoRenew: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  assignedCount: number;
  assignees: Array<{ membershipId: string; name: string }>;
}

export interface PolicyBoard {
  policies: RttPolicyRow[];
  /** Salariés assignables, pour le formulaire d'affectation. */
  candidates: Array<{ membershipId: string; name: string }>;
}

export async function getPolicyBoard(
  includeArchived = false,
): Promise<PolicyBoard> {
  return query('settings.access', async (db) => {
    const policies = await db.rttPolicy.findMany({
      where: includeArchived ? {} : { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      include: { assignments: true },
    });

    const members = await db.membership.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        employeeNumber: true,
        profile: { select: { firstName: true, lastName: true } },
      },
    });

    const nameById = new Map(
      members.map((member) => [
        member.id,
        `${member.profile?.firstName ?? ''} ${member.profile?.lastName ?? member.employeeNumber}`.trim(),
      ]),
    );

    return {
      policies: policies.map((policy) => ({
        id: policy.id,
        name: policy.name,
        daysPerYear: policy.daysPerYear.toString(),
        periodStart: policy.periodStart,
        autoRenew: policy.autoRenew,
        status: policy.status,
        assignedCount: policy.assignments.length,
        assignees: policy.assignments
          .map((assignment) => ({
            membershipId: assignment.membershipId,
            name: nameById.get(assignment.membershipId) ?? 'Salarié',
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      })),
      candidates: [...nameById.entries()]
        .map(([membershipId, name]) => ({ membershipId, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    };
  });
}

export interface ActionState {
  error?: string;
  ok?: boolean;
}

class DuplicatePolicy extends Error {}

const policyInput = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(160),
  daysPerYear: z.coerce
    .number()
    .min(0, 'Un droit négatif n’existe pas')
    .max(365, 'Un droit annuel ne dépasse pas 365 jours'),
  // « MM-JJ » plutôt qu'une date complète : la période se reconduit d'une année
  // sur l'autre, et porter un millésime obligerait à réécrire la politique
  // chaque janvier.
  periodStart: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Format attendu : MM-JJ'),
  autoRenew: z.boolean(),
});

function readForm(formData: FormData) {
  return {
    name: formData.get('name'),
    daysPerYear: formData.get('daysPerYear') ?? 0,
    periodStart: formData.get('periodStart') ?? '',
    autoRenew: formData.get('autoRenew') === 'on',
  };
}

export async function createRttPolicyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = policyInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('settings.agreement.manage', async (db, actor) => {
      const existing = await db.rttPolicy.findFirst({
        where: { name: parsed.data.name },
      });
      if (existing) throw new DuplicatePolicy();

      const created = await db.rttPolicy.create({
        data: parsed.data as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'rtt_policy.create',
        entityType: 'RttPolicy',
        entityId: created.id,
        after: {
          name: created.name,
          daysPerYear: created.daysPerYear.toString(),
          periodStart: created.periodStart,
          autoRenew: created.autoRenew,
        },
      });
    });
  } catch (error) {
    if (error instanceof DuplicatePolicy) {
      return { error: 'Une politique porte déjà ce nom.' };
    }
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les politiques." };
    }
    throw error;
  }

  revalidatePath('/reglages/politiques-rtt');
  return { ok: true };
}

export async function archiveRttPolicyAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const restore = formData.get('restore') === '1';
  if (!id) return;

  await mutate('settings.agreement.manage', async (db, actor) => {
    const before = await db.rttPolicy.findUnique({ where: { id } });
    if (!before) return;

    // Archiver arrête la reconduction ; les affectations restent en place, et
    // les jours déjà acquis restent au registre. Une politique n'efface pas ce
    // qu'elle a produit.
    const status = restore ? 'ACTIVE' : 'ARCHIVED';
    await db.rttPolicy.update({ where: { id }, data: { status } });

    await recordAudit(db, {
      actorMembershipId: actor.membershipId,
      action: restore ? 'rtt_policy.restore' : 'rtt_policy.archive',
      entityType: 'RttPolicy',
      entityId: id,
      before: { status: before.status },
      after: { status },
    });
  });

  revalidatePath('/reglages/politiques-rtt');
}

const assignInput = z.object({
  policyId: z.string().min(1),
  membershipIds: z.array(z.string().min(1)).min(1, 'Sélectionnez un salarié'),
});

export async function assignRttPolicyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = assignInput.safeParse({
    policyId: formData.get('policyId'),
    membershipIds: formData.getAll('membershipIds').map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('settings.agreement.manage', async (db, actor) => {
      const policy = await db.rttPolicy.findUnique({
        where: { id: parsed.data.policyId },
      });
      if (!policy) throw new AuthorizationError('settings.agreement.manage');
      if (policy.status === 'ARCHIVED') throw new ArchivedPolicy();

      // Le périmètre est revérifié en base : un identifiant soumis depuis le
      // formulaire pourrait désigner un salarié d'un autre compte.
      const members = await db.membership.findMany({
        where: { id: { in: parsed.data.membershipIds } },
        select: { id: true },
      });

      for (const member of members) {
        // `upsert` sur la clé composée : réassigner un salarié déjà couvert ne
        // doit ni échouer ni créer un doublon d'acquisition.
        await db.rttPolicyAssignment.upsert({
          where: {
            rttPolicyId_membershipId: {
              rttPolicyId: policy.id,
              membershipId: member.id,
            },
          },
          create: { rttPolicyId: policy.id, membershipId: member.id } as never,
          update: {},
        });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'rtt_policy.assign',
        entityType: 'RttPolicy',
        entityId: policy.id,
        after: { membershipIds: members.map((member) => member.id) },
      });
    });
  } catch (error) {
    if (error instanceof ArchivedPolicy) {
      return {
        error:
          'Cette politique est archivée : elle ne produit plus d’acquisition.',
      };
    }
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les politiques." };
    }
    throw error;
  }

  revalidatePath('/reglages/politiques-rtt');
  return { ok: true };
}

class ArchivedPolicy extends Error {}

export async function unassignRttPolicyAction(
  formData: FormData,
): Promise<void> {
  const policyId = String(formData.get('policyId') ?? '');
  const membershipId = String(formData.get('membershipId') ?? '');
  if (!policyId || !membershipId) return;

  await mutate('settings.agreement.manage', async (db, actor) => {
    const removed = await db.rttPolicyAssignment.deleteMany({
      where: { rttPolicyId: policyId, membershipId },
    });
    if (removed.count === 0) return;

    await recordAudit(db, {
      actorMembershipId: actor.membershipId,
      action: 'rtt_policy.unassign',
      entityType: 'RttPolicy',
      entityId: policyId,
      before: { membershipId },
    });
  });

  revalidatePath('/reglages/politiques-rtt');
}
