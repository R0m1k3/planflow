import { redirect } from 'next/navigation';

import {
  authorize,
  type Actor,
  type ResourceRef,
} from '@/domain/access/authorize';
import type { PermissionCode } from '@/domain/access/permissions';
import { currentSession, type SessionContext } from '@/server/auth/session';
import { withTenant, type ScopedClient } from '@/server/tenant';

/**
 * Contexte d'exécution d'une requête authentifiée.
 *
 * Toute lecture et toute écriture métier passent par ici. Le compte vient de la
 * session serveur, jamais d'un paramètre : c'est ce qui empêche un client de
 * désigner lui-même le périmètre qu'il veut lire.
 */

export async function requireSession(): Promise<SessionContext> {
  const session = await currentSession();
  if (!session) redirect('/connexion');
  return session;
}

/**
 * Exécute une lecture dans le périmètre de la session.
 *
 * `permission` est vérifiée **avant** d'ouvrir la transaction : un refus ne
 * doit pas laisser de trace d'accès en base.
 */
export async function query<T>(
  permission: PermissionCode,
  fn: (db: ScopedClient, actor: Actor) => Promise<T>,
  resource?: ResourceRef,
): Promise<T> {
  const session = await requireSession();
  authorize(session.actor, permission, resource);
  return withTenant(session.actor.accountId, (db) => fn(db, session.actor));
}

/**
 * Exécute une mutation dans le périmètre de la session.
 *
 * Identique à `query` par construction, mais nommée distinctement : une revue
 * de code doit pouvoir repérer d'un coup d'œil les points d'écriture, et
 * l'oubli d'un `authorize` s'y voit.
 */
export async function mutate<T>(
  permission: PermissionCode,
  fn: (db: ScopedClient, actor: Actor) => Promise<T>,
  resource?: ResourceRef,
): Promise<T> {
  return query(permission, fn, resource);
}
