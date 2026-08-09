'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { PERMISSION_CODES } from '@/domain/access/permissions';
import {
  escalationRefusal,
  lockoutRefusal,
  REFUSAL_MESSAGES,
  slugifyRoleKey,
  type EditRefusal,
} from '@/domain/access/role-editing';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';

/**
 * Édition des rôles — PLAN.md §5.
 *
 * Critère d'acceptation de WP-01 : « un rôle personnalisé créé par un client
 * modifie effectivement l'accès, sans changement de code ». C'est ce que cet
 * écran rend possible — et c'est aussi celui par lequel on prendrait le
 * contrôle de l'application, d'où les garde-fous.
 */

export interface RoleState {
  error?: string;
  ok?: boolean;
  message?: string;
}

class Refused extends Error {
  constructor(readonly refusal: EditRefusal) {
    super(REFUSAL_MESSAGES[refusal]);
  }
}

const createInput = z.object({
  name: z.string().trim().min(2, 'Nom du rôle requis').max(60),
});

export async function createRoleAction(
  _previous: RoleState,
  formData: FormData,
): Promise<RoleState> {
  const parsed = createInput.safeParse({ name: formData.get('name') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const key = slugifyRoleKey(parsed.data.name);
  if (!key) {
    return { error: 'Ce nom ne produit aucune clé utilisable. Employez des lettres.' };
  }

  try {
    await mutate('settings.roles.manage', async (db, actor) => {
      const existing = await db.role.findFirst({ where: { key } });
      if (existing) throw new Refused('DUPLICATE_KEY');

      // Créé **sans aucune capacité**. Un rôle neuf qui hériterait de celles de
      // son créateur distribuerait des droits que personne n'a demandés.
      const role = await db.role.create({
        data: { key, name: parsed.data.name, isSystem: false } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'role.create',
        entityType: 'Role',
        entityId: role.id,
        after: { key, name: parsed.data.name },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de gérer les rôles.");
  }

  revalidatePath('/reglages/roles');
  return { ok: true, message: `Rôle « ${parsed.data.name} » créé, sans aucune capacité.` };
}

/**
 * Enregistre les capacités d'un rôle.
 *
 * Les cases envoyées **remplacent** la liste : le formulaire porte l'état
 * complet, ce qui évite d'avoir à distinguer ajout et retrait côté client — et
 * ce qui rend les deux contrôles, escalade et verrouillage, calculables d'un
 * seul coup.
 */
export async function saveRolePermissionsAction(
  _previous: RoleState,
  formData: FormData,
): Promise<RoleState> {
  const roleId = String(formData.get('roleId') ?? '');
  if (!roleId) return { error: 'Rôle introuvable.' };

  const requested = new Set(
    formData
      .getAll('permission')
      .map(String)
      .filter((code) => (PERMISSION_CODES as readonly string[]).includes(code)),
  );

  try {
    await mutate('settings.roles.manage', async (db, actor) => {
      const role = await db.role.findUnique({
        where: { id: roleId },
        include: { permissions: { include: { permission: true } } },
      });
      if (!role) throw new Refused('NOT_FOUND');

      const previous = new Set(
        role.permissions.map((entry) => entry.permission.code),
      );

      const escalation = escalationRefusal({
        actor,
        next: requested,
        previous,
      });
      if (escalation) throw new Refused(escalation);

      // Le verrouillage se juge sur l'ensemble des rôles après coup : ce qui
      // compte n'est pas que *ce* rôle garde la capacité, mais qu'au moins un
      // la conserve.
      const allRoles = await db.role.findMany({
        include: { permissions: { include: { permission: true } } },
      });
      const rolesAfter = allRoles.map((other) => ({
        id: other.id,
        permissions:
          other.id === roleId
            ? requested
            : new Set(other.permissions.map((entry) => entry.permission.code)),
      }));

      const lockout = lockoutRefusal({ rolesAfter });
      if (lockout) throw new Refused(lockout);

      const permissions = await db.permission.findMany({
        where: { code: { in: [...requested] } },
        select: { id: true },
      });

      await db.rolePermission.deleteMany({ where: { roleId } });
      if (permissions.length > 0) {
        await db.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId,
            permissionId: permission.id,
          })),
        });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'role.permissions.update',
        entityType: 'Role',
        entityId: roleId,
        before: { count: previous.size, codes: [...previous].sort() },
        after: { count: requested.size, codes: [...requested].sort() },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de gérer les rôles.");
  }

  revalidatePath('/reglages/roles');
  return { ok: true, message: 'Capacités enregistrées.' };
}

export async function deleteRoleAction(
  _previous: RoleState,
  formData: FormData,
): Promise<RoleState> {
  const roleId = String(formData.get('roleId') ?? '');
  if (!roleId) return { error: 'Rôle introuvable.' };

  try {
    await mutate('settings.roles.manage', async (db, actor) => {
      const role = await db.role.findUnique({
        where: { id: roleId },
        include: { memberships: { select: { id: true }, take: 1 } },
      });
      if (!role) throw new Refused('NOT_FOUND');

      // Un rôle système est référencé par le code et par le semis : le
      // supprimer casserait la création d'un salarié.
      if (role.isSystem) throw new Refused('SYSTEM_ROLE');

      // Supprimer un rôle attribué laisserait des salariés sans capacités, donc
      // dehors, sans que personne ne l'ait décidé pour eux.
      if (role.memberships.length > 0) throw new Refused('ROLE_IN_USE');

      await db.role.delete({ where: { id: roleId } });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'role.delete',
        entityType: 'Role',
        entityId: roleId,
        before: { key: role.key, name: role.name },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de gérer les rôles.");
  }

  revalidatePath('/reglages/roles');
  return { ok: true, message: 'Rôle supprimé.' };
}

function toState(error: unknown, denied: string): RoleState {
  if (error instanceof Refused) return { error: error.message };
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
