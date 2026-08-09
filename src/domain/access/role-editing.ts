import type { Actor } from '@/domain/access/authorize';

/**
 * Garde-fous de l'édition des rôles — PLAN.md §5.
 *
 * Un écran qui distribue les droits est celui par lequel on prend le contrôle
 * d'une application. Deux dangers, opposés, et il faut se protéger des deux :
 *
 * - **l'escalade** — s'accorder une capacité qu'on n'a pas ;
 * - **le verrouillage** — retirer la dernière capacité qui permettait encore de
 *   revenir en arrière, et fermer les réglages à tout le monde.
 */

/** Capacité sans laquelle plus personne ne peut redistribuer les droits. */
export const ROLE_ADMIN_CAPABILITY = 'settings.roles.manage';

/** Capacité qui confère le niveau propriétaire, et se délègue à part. */
export const OWNER_LEVEL_CAPABILITY = 'role_config.assign_owner_level';

export type EditRefusal =
  | 'ESCALATION'
  | 'OWNER_LEVEL'
  | 'LAST_ADMIN'
  | 'SYSTEM_ROLE'
  | 'DUPLICATE_KEY'
  | 'ROLE_IN_USE'
  | 'NOT_FOUND';

export const REFUSAL_MESSAGES: Record<EditRefusal, string> = {
  ESCALATION:
    'Vous ne pouvez pas accorder une capacité que vous ne détenez pas vous-même.',
  OWNER_LEVEL:
    'Le niveau propriétaire ne se délègue que par un propriétaire.',
  LAST_ADMIN:
    'Ce retrait fermerait la gestion des droits à tout le monde : au moins un rôle doit conserver « Gérer les rôles ».',
  SYSTEM_ROLE:
    'Un rôle système ne se supprime pas : le code et le semis y font référence par sa clé.',
  DUPLICATE_KEY: 'Un rôle porte déjà ce nom.',
  ROLE_IN_USE:
    'Ce rôle est encore attribué. Réaffectez ses membres avant de le supprimer.',
  NOT_FOUND: 'Rôle introuvable.',
};

export interface GrantContext {
  actor: Actor;
  /** Capacités que le rôle portera après enregistrement. */
  next: ReadonlySet<string>;
  /** Capacités qu'il portait avant. */
  previous: ReadonlySet<string>;
}

/**
 * Refus d'escalade.
 *
 * On ne peut accorder que ce qu'on détient. Sans cette règle, la première
 * personne autorisée à éditer un rôle s'accorderait l'accès aux rémunérations
 * en trois clics — et le catalogue de capacités ne servirait plus à rien.
 *
 * Retirer reste permis même sur une capacité qu'on n'a pas : réduire un droit
 * n'a jamais élargi le sien.
 */
export function escalationRefusal({
  actor,
  next,
  previous,
}: GrantContext): EditRefusal | null {
  const added = [...next].filter((code) => !previous.has(code));

  for (const code of added) {
    if (code === OWNER_LEVEL_CAPABILITY && !actor.permissions.has(code)) {
      return 'OWNER_LEVEL';
    }
    if (!actor.permissions.has(code)) return 'ESCALATION';
  }

  return null;
}

export interface LockoutContext {
  /** Rôles du compte avec leurs capacités, **après** l'enregistrement envisagé. */
  rolesAfter: ReadonlyArray<{ id: string; permissions: ReadonlySet<string> }>;
}

/**
 * Refus de verrouillage.
 *
 * Compté après coup, sur l'ensemble des rôles : ce qui compte n'est pas que
 * *ce* rôle garde la capacité, mais qu'au moins un la conserve. Sans cela, une
 * organisation pourrait s'enfermer dehors, et le seul recours serait une
 * intervention en base.
 */
export function lockoutRefusal({
  rolesAfter,
}: LockoutContext): EditRefusal | null {
  const remaining = rolesAfter.filter((role) =>
    role.permissions.has(ROLE_ADMIN_CAPABILITY),
  );
  return remaining.length === 0 ? 'LAST_ADMIN' : null;
}

/** Clé technique d'un rôle créé par le client. */
export function slugifyRoleKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
