import { prisma } from '@/server/db';
import { env } from '@/lib/env';

/**
 * Vérifie que la base est configurée pour que la RLS s'applique réellement.
 *
 * **Un superutilisateur PostgreSQL contourne toute politique de sécurité au
 * niveau ligne, y compris avec FORCE.** Connecter l'application avec un tel
 * compte désactive silencieusement la seconde couche d'isolation : les
 * requêtes continuent de fonctionner, les tests applicatifs passent, et rien
 * n'indique que la protection a disparu.
 *
 * C'est exactement le genre de mauvaise configuration qu'on ne découvre qu'en
 * lisant les données d'un autre client. D'où ce contrôle au démarrage.
 */

export interface TenantGuardResult {
  ok: boolean;
  isSuperuser: boolean;
  bypassRls: boolean;
  message?: string;
}

export async function checkTenantIsolation(): Promise<TenantGuardResult> {
  const rows = await prisma.$queryRaw<
    Array<{ usesuper: boolean; usebypassrls: boolean }>
  >`SELECT usesuper, usebypassrls FROM pg_user WHERE usename = current_user`;

  const row = rows[0];
  if (!row) {
    return {
      ok: false,
      isSuperuser: false,
      bypassRls: false,
      message: 'Impossible de déterminer les privilèges du compte de connexion.',
    };
  }

  const ok = !row.usesuper && !row.usebypassrls;

  return {
    ok,
    isSuperuser: row.usesuper,
    bypassRls: row.usebypassrls,
    ...(ok
      ? {}
      : {
          message:
            'Le compte de connexion contourne la row-level security ' +
            `(superutilisateur : ${row.usesuper}, bypassrls : ${row.usebypassrls}). ` +
            "L'isolation multi-tenant ne repose plus que sur la couche applicative. " +
            'Créer un rôle dédié : CREATE ROLE planflow_app LOGIN NOSUPERUSER NOBYPASSRLS.',
        }),
  };
}

/**
 * Refuse de démarrer en production sur une base mal configurée.
 *
 * En développement, un avertissement suffit : la base locale est souvent créée
 * avec un compte administrateur, et bloquer rendrait la mise en route pénible
 * sans rien protéger.
 */
export async function assertTenantIsolation(): Promise<void> {
  const result = await checkTenantIsolation();
  if (result.ok) return;

  const message = `Isolation multi-tenant affaiblie — ${result.message}`;

  if (env.NODE_ENV === 'production') {
    throw new Error(message);
  }

  console.warn(`⚠ ${message}`);
}
