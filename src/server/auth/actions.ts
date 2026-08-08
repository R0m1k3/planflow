'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { answerChallenge } from '@/server/auth/mfa';
import {
  pendingChallenge,
  satisfyMfa,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signIn,
  signOut,
} from '@/server/auth/session';

const credentials = z.object({
  email: z.email('Adresse électronique invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export interface SignInState {
  error?: string;
}

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const requestHeaders = await headers();
  const result = await signIn({
    email: parsed.data.email,
    password: parsed.data.password,
    ip: requestHeaders.get('x-forwarded-for'),
    userAgent: requestHeaders.get('user-agent'),
  });

  if (!result.ok) {
    // Un seul message pour « compte inconnu » et « mot de passe faux » : les
    // distinguer permettrait d'énumérer les adresses du personnel.
    return {
      error:
        result.reason === 'locked'
          ? 'Compte temporairement verrouillé après plusieurs échecs. Réessayez dans quelques minutes.'
          : 'Identifiants incorrects.',
    };
  }

  (await cookies()).set(SESSION_COOKIE, result.token, {
    ...SESSION_COOKIE_OPTIONS,
    expires: result.expiresAt,
  });

  // La session existe mais ne résout aucun acteur tant que le second facteur
  // n'est pas présenté : rediriger vers l'application produirait une boucle.
  redirect(result.mfaPending ? '/connexion/verification' : '/');
}

export interface ChallengeState {
  error?: string;
}

/**
 * Éprouve le second facteur.
 *
 * L'échec ne détruit pas la session en attente : elle expire d'elle-même en dix
 * minutes, et la supprimer au premier code mal recopié renverrait ressaisir le
 * mot de passe sans motif.
 */
export async function verifyMfaAction(
  _previous: ChallengeState,
  formData: FormData,
): Promise<ChallengeState> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return { error: 'Session expirée. Reconnectez-vous.' };

  const challenge = await pendingChallenge(token);
  if (!challenge) return { error: 'Session expirée. Reconnectez-vous.' };

  const code = String(formData.get('code') ?? '');
  const result = await answerChallenge(challenge.userId, code);
  if (!result.ok) return { error: result.error };

  const expiresAt = await satisfyMfa(token);
  store.set(SESSION_COOKIE, token, {
    ...SESSION_COOKIE_OPTIONS,
    expires: expiresAt,
  });

  redirect(result.usedRecoveryCode ? '/reglages/securite' : '/');
}

export async function signOutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await signOut(token);
  store.delete(SESSION_COOKIE);
  redirect('/connexion');
}
