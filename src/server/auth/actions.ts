'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
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

  redirect('/');
}

export async function signOutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await signOut(token);
  store.delete(SESSION_COOKIE);
  redirect('/connexion');
}
