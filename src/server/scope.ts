import {
  AuthorizationError,
  authorize,
  type Actor,
} from '@/domain/access/authorize';
import type { PermissionCode } from '@/domain/access/permissions';
import type { ScopedClient } from '@/server/tenant';

/**
 * Périmètre d'établissement et d'équipe — appliqué aux données d'autrui.
 *
 * `query()` et `mutate()` ne vérifient que la capacité tant qu'on ne leur
 * passe pas de ressource : or la ressource n'est connue qu'une fois l'objet
 * lu, dans la transaction. Ces fonctions refont donc le contrôle à ce moment,
 * sur l'objet chargé — un identifiant forgé désignant un créneau ou un
 * salarié d'un autre établissement doit être refusé, pas seulement masqué à
 * l'écran.
 */

/** Refuse quand l'établissement ou l'équipe de l'objet chargé sort du périmètre. */
export function assertResourceInScope(
  actor: Actor,
  permission: PermissionCode,
  resource: { locationId: string; teamId?: string | null },
): void {
  authorize(actor, permission, {
    locationId: resource.locationId,
    ...(resource.teamId ? { teamId: resource.teamId } : {}),
  });
}

/**
 * Filtre des dossiers salariés visibles, à combiner à un `where` Prisma.
 *
 * Un salarié est dans le périmètre quand l'un de ses contrats porte sur un
 * établissement couvert, ou qu'il appartient à une équipe couverte. Son propre
 * dossier reste toujours lisible.
 */
export function membershipScopeWhere(actor: Actor) {
  if (actor.scope.allLocations) return {};
  return {
    OR: [
      { id: actor.membershipId },
      {
        contracts: {
          some: { locationId: { in: actor.scope.locationIds } },
        },
      },
      { teams: { some: { teamId: { in: actor.scope.teamIds } } } },
    ],
  };
}

export async function isMemberInScope(
  db: ScopedClient,
  actor: Actor,
  membershipId: string,
): Promise<boolean> {
  if (actor.scope.allLocations || membershipId === actor.membershipId) {
    return true;
  }
  const count = await db.membership.count({
    where: { AND: [{ id: membershipId }, membershipScopeWhere(actor)] },
  });
  return count > 0;
}

/** Refuse d'agir sur un salarié hors du périmètre de l'acteur. */
export async function assertMemberInScope(
  db: ScopedClient,
  actor: Actor,
  permission: PermissionCode,
  membershipId: string,
): Promise<void> {
  if (!(await isMemberInScope(db, actor, membershipId))) {
    throw new AuthorizationError(
      permission,
      'le salarié est hors du périmètre de l’établissement',
    );
  }
}
