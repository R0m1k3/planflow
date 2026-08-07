import type { PermissionCode } from '@/domain/access/permissions';

/**
 * Autorisation par capacités — PLAN.md §3.2.
 *
 * Point d'entrée unique. Deux règles qui ne se négocient pas :
 *
 * 1. La vérification a lieu **avant tout effet**, côté serveur. Masquer un
 *    bouton est un confort, pas une sécurité : la mutation reste appelable.
 * 2. On teste une **capacité**, jamais un nom de rôle. Les rôles sont
 *    configurables par le client ; un écran qui teste `role === 'manager'`
 *    casse le jour où quelqu'un renomme le rôle ou en crée un cinquième.
 */

export interface Scope {
  /** Accès à tous les établissements du compte. */
  allLocations: boolean;
  locationIds: string[];
  teamIds: string[];
}

export interface Actor {
  membershipId: string;
  accountId: string;
  userId: string | null;
  roleKey: string;
  permissions: ReadonlySet<string>;
  scope: Scope;
}

/** Ressource visée, quand la capacité seule ne suffit pas à décider. */
export interface ResourceRef {
  accountId?: string;
  locationId?: string;
  teamId?: string;
  /** Membership concerné, pour distinguer « ses » données de celles d'autrui. */
  membershipId?: string;
}

export class AuthorizationError extends Error {
  readonly permission: string;

  constructor(permission: string, detail?: string) {
    super(
      detail
        ? `Capacité « ${permission} » requise : ${detail}`
        : `Capacité « ${permission} » requise`,
    );
    this.name = 'AuthorizationError';
    this.permission = permission;
  }
}

/** Le périmètre couvre-t-il la ressource visée ? */
export function inScope(actor: Actor, resource?: ResourceRef): boolean {
  if (!resource) return true;

  if (resource.accountId && resource.accountId !== actor.accountId) {
    return false;
  }

  if (actor.scope.allLocations) return true;

  if (resource.locationId) {
    return actor.scope.locationIds.includes(resource.locationId);
  }

  if (resource.teamId) {
    return actor.scope.teamIds.includes(resource.teamId);
  }

  return true;
}

export function can(
  actor: Actor,
  permission: PermissionCode,
  resource?: ResourceRef,
): boolean {
  if (!actor.permissions.has(permission)) return false;
  return inScope(actor, resource);
}

/**
 * Variante qui lève. À préférer dans les Server Actions : oublier de traiter le
 * `false` d'un `can()` laisse passer la mutation, alors qu'une exception
 * interrompt tout.
 */
export function authorize(
  actor: Actor,
  permission: PermissionCode,
  resource?: ResourceRef,
): void {
  if (!actor.permissions.has(permission)) {
    throw new AuthorizationError(permission);
  }
  if (!inScope(actor, resource)) {
    throw new AuthorizationError(
      permission,
      'la ressource est hors du périmètre du compte ou de l’établissement',
    );
  }
}

/**
 * Choisit entre la capacité « sur soi » et « sur autrui ».
 *
 * Un salarié voit ses propres compteurs sans détenir le droit de voir ceux des
 * autres — l'audit relève explicitement ces deux droits séparés.
 */
export function canForMember(
  actor: Actor,
  ownPermission: PermissionCode,
  othersPermission: PermissionCode,
  targetMembershipId: string,
): boolean {
  if (targetMembershipId === actor.membershipId) {
    return actor.permissions.has(ownPermission);
  }
  return actor.permissions.has(othersPermission);
}
