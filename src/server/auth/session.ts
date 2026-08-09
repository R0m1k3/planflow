import { hash, verify } from '@node-rs/argon2';
import { cookies } from 'next/headers';

import type { Actor, Scope } from '@/domain/access/authorize';
import { generateToken, hashToken } from '@/server/crypto';
import { unscoped, withTenant, withUser } from '@/server/tenant';

/**
 * Sessions serveur — PLAN.md §2 (écart assumé) et matrice n° 23.
 *
 * En base plutôt qu'en jeton signé : la matrice impose de pouvoir **révoquer**
 * une session lors d'un incident. Un JWT reste valable jusqu'à expiration quoi
 * qu'on fasse, sauf à tenir une liste de révocation — c'est-à-dire à
 * reconstruire une table de sessions, en moins fiable.
 */

export const SESSION_COOKIE = 'planflow_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 h : une journée de travail.
const MAX_FAILED_ATTEMPTS = 8;
const LOCK_DURATION_MS = 15 * 60 * 1000;

/**
 * Paramètres argon2id. Les valeurs par défaut de la bibliothèque sont
 * délibérément basses ; celles-ci suivent les recommandations OWASP.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19_456, // 19 Mio
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // Une empreinte illisible est un échec d'authentification, pas une panne :
    // la remonter en erreur 500 renseignerait sur l'état du compte.
    return false;
  }
}

export interface SignInInput {
  email: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Durée d'une session en attente du second facteur.
 *
 * Elle ne donne accès à rien, mais elle atteste d'un mot de passe juste : lui
 * laisser douze heures offrirait autant de temps pour éprouver les six chiffres
 * depuis un poste laissé ouvert.
 */
const MFA_CHALLENGE_MS = 10 * 60 * 1000;

export type SignInResult =
  | {
      ok: true;
      token: string;
      expiresAt: Date;
      userId: string;
      /** Vrai quand la session attend encore le second facteur. */
      mfaPending: boolean;
    }
  | { ok: false; reason: 'invalid' | 'locked' };

export async function signIn(input: SignInInput): Promise<SignInResult> {
  const db = unscoped();
  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, reason: 'locked' };
  }

  // Vérifier une empreinte factice quand l'utilisateur n'existe pas : sans
  // cela, un compte inconnu répond nettement plus vite qu'un mot de passe
  // faux, ce qui laisse énumérer les adresses.
  const passwordHash =
    user?.passwordHash ??
    '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$0000000000000000000000000000000000000000000';

  const valid = await verifyPassword(passwordHash, input.password);

  if (!user || !user.passwordHash || !valid) {
    if (user) {
      const failed = user.failedAttempts + 1;
      await db.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: failed,
          lockedUntil:
            failed >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCK_DURATION_MS)
              : null,
        },
      });
    }
    return { ok: false, reason: 'invalid' };
  }

  const token = generateToken();
  // Le second facteur est exigé dès qu'il est enregistré, quel que soit le
  // rôle : un salarié qui a pris la peine de l'activer ne doit pas pouvoir
  // entrer sans lui.
  const mfaPending = user.mfaEnrolledAt !== null && user.mfaSecretEnc !== null;
  const expiresAt = new Date(
    Date.now() + (mfaPending ? MFA_CHALLENGE_MS : SESSION_DURATION_MS),
  );

  await db.$transaction([
    db.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        mfaSatisfied: !mfaPending,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        // La date de dernière connexion n'est posée qu'une fois les deux
        // facteurs présentés : un mot de passe juste seul n'est pas une
        // connexion.
        ...(mfaPending ? {} : { lastSignInAt: new Date() }),
      },
    }),
  ]);

  return { ok: true, token, expiresAt, userId: user.id, mfaPending };
}

export interface PendingChallenge {
  sessionId: string;
  userId: string;
  email: string;
}

/**
 * Session ouverte mais en attente du second facteur.
 *
 * Distincte de `resolveSession`, qui refuse ces sessions : l'écran de défi est
 * le seul endroit où elles ont un sens, et les confondre reviendrait à laisser
 * une session à demi ouverte circuler dans l'application.
 */
export async function pendingChallenge(
  token: string,
): Promise<PendingChallenge | null> {
  const session = await unscoped().session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true } } },
  });

  if (
    !session ||
    session.mfaSatisfied ||
    session.revokedAt ||
    session.expiresAt < new Date()
  ) {
    return null;
  }

  return {
    sessionId: session.id,
    userId: session.user.id,
    email: session.user.email,
  };
}

/** Promeut une session en attente en session pleine. */
export async function satisfyMfa(token: string): Promise<Date> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const db = unscoped();

  const session = await db.session.update({
    where: { tokenHash: hashToken(token) },
    data: { mfaSatisfied: true, expiresAt },
  });

  await db.user.update({
    where: { id: session.userId },
    data: { lastSignInAt: new Date() },
  });

  return expiresAt;
}

export async function signOut(token: string): Promise<void> {
  await unscoped().session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Révoque toutes les sessions d'un utilisateur — réponse à incident. */
export async function revokeAllSessions(
  userId: string,
  revokedBy: string,
): Promise<number> {
  const result = await unscoped().session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedBy },
  });
  return result.count;
}

export interface SessionUser {
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
  /** Un second facteur est enregistré pour ce compte. */
  mfaEnrolled: boolean;
}

export interface SessionContext {
  actor: Actor;
  sessionId: string;
  user: SessionUser;
  accountName: string;
  roleName: string;
}

/**
 * Résout la session courante en acteur autorisable.
 *
 * Le périmètre est reconstruit ici, depuis la base, à chaque requête. Le
 * transporter dans le cookie permettrait à un client de se l'élargir.
 */
export async function resolveSession(
  token: string,
): Promise<SessionContext | null> {
  const db = unscoped();

  // `Session` et `User` ne portent pas de compte : ce sont les seules tables
  // lisibles avant de savoir de quel compte il s'agit.
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  // Une session en attente du second facteur ne résout aucun acteur : elle ne
  // porte qu'un défi. C'est ici, au point de passage unique, que la garantie
  // tient — pas dans chaque écran.
  if (
    !session ||
    !session.mfaSatisfied ||
    session.revokedAt ||
    session.expiresAt < new Date()
  ) {
    return null;
  }

  // Amorçage : trouver le compte suppose de lire le rattachement, lequel est
  // filtré par compte. La porte est étroite — seules les lignes dont cet
  // utilisateur est titulaire — et ne sert qu'ici.
  const membershipId = await withUser(session.userId, async (tx) => {
    const own = await tx.membership.findFirst({
      where: { userId: session.userId, status: 'ACTIVE', archivedAt: null },
      select: { id: true, accountId: true },
    });
    return own;
  });

  if (!membershipId) return null;

  // Tout le reste passe par le périmètre du compte, comme n'importe quelle
  // lecture métier.
  return withTenant(membershipId.accountId, async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { id: membershipId.id },
      include: {
        account: { select: { name: true } },
        role: { include: { permissions: { include: { permission: true } } } },
        scopes: true,
      },
    });

    if (!membership) return null;

    const scope: Scope = {
      allLocations: membership.scopes.some((entry) => entry.allLocations),
      locationIds: membership.scopes
        .map((entry) => entry.locationId)
        .filter((id): id is string => id !== null),
      teamIds: membership.scopes
        .map((entry) => entry.teamId)
        .filter((id): id is string => id !== null),
    };

    const actor: Actor = {
      membershipId: membership.id,
      accountId: membership.accountId,
      userId: session.userId,
      roleKey: membership.role.key,
      permissions: new Set(
        membership.role.permissions.map((entry) => entry.permission.code),
      ),
      scope,
    };

    const { firstName, lastName, email } = session.user;

    return {
      actor,
      sessionId: session.id,
      user: {
        firstName,
        lastName,
        email,
        initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
        mfaEnrolled: session.user.mfaEnrolledAt !== null,
      },
      accountName: membership.account.name,
      roleName: membership.role.name,
    };
  });
}

/** Session courante depuis le cookie, ou `null`. */
export async function currentSession(): Promise<SessionContext | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return resolveSession(token);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
} as const;
