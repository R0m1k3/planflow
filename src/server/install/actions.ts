'use server';

import { Prisma } from '@prisma/client';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  installationProblem,
  normaliseInstallation,
  type InstallationForm,
} from '@/domain/install/rules';
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  signIn,
} from '@/server/auth/session';
import {
  hashOwnerPassword,
  installAccount,
  INSTALLATION_ID,
} from '@/server/install/install';
import { isInstalled, markInstalled } from '@/server/install/state';
import { unscoped } from '@/server/tenant';

export interface InstallState {
  error?: string;
}

function read(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value : '';
}

/**
 * Première installation — PLAN.md §5.
 *
 * La seule action de l'application qui s'exécute sans session, et la seule qui
 * crée un propriétaire. Deux garde-fous, et non un :
 *
 *  1. Un refus explicite si l'instance est déjà installée, pour donner un
 *     message lisible plutôt qu'une erreur de contrainte.
 *  2. L'écriture du marqueur **dans la même transaction** que la création du
 *     compte. C'est celui-là qui protège vraiment : deux requêtes simultanées
 *     sur une instance vierge passent toutes deux le premier contrôle, puis se
 *     disputent une clé primaire — la perdante annule tout son travail au lieu
 *     de poser un second propriétaire.
 */
export async function installAction(
  _previous: InstallState,
  formData: FormData,
): Promise<InstallState> {
  if (await isInstalled()) {
    return {
      error:
        'Cette instance est déjà installée. Connectez-vous, ou faites-vous inviter par son administrateur.',
    };
  }

  const form: InstallationForm = {
    companyName: read(formData, 'companyName'),
    locationName: read(formData, 'locationName'),
    timezone: read(formData, 'timezone'),
    firstName: read(formData, 'firstName'),
    lastName: read(formData, 'lastName'),
    email: read(formData, 'email'),
    password: read(formData, 'password'),
    passwordConfirmation: read(formData, 'passwordConfirmation'),
  };

  const problem = installationProblem(form);
  if (problem) return { error: problem };

  const data = normaliseInstallation(form);

  // Avant la transaction : argon2 est délibérément lent, et le faire tourner
  // une connexion ouverte l'immobiliserait sans rien y gagner.
  const passwordHash = await hashOwnerPassword(data.password);

  try {
    await unscoped().$transaction(async (tx) => {
      const instance = await installAccount(tx, form, passwordHash);
      await tx.installation.create({
        data: { id: INSTALLATION_ID, accountId: instance.accountId },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        error:
          'Cette instance vient d’être installée par ailleurs. Rechargez la page pour vous connecter.',
      };
    }
    // Le détail part au journal du serveur, pas à l'écran : il peut contenir le
    // schéma de la base, et cet écran est ouvert sans authentification.
    console.error('[installation] échec', error);
    return {
      error:
        'L’installation a échoué. Le journal du serveur en donne la raison ; rien n’a été enregistré.',
    };
  }

  markInstalled();

  // Ouvrir la session par le chemin ordinaire plutôt que d'en fabriquer une :
  // le verrouillage après échecs, le second facteur et la révocation vivent
  // tous là, et une session posée à côté échapperait à ces règles.
  const requestHeaders = await headers();
  const session = await signIn({
    email: data.email,
    password: data.password,
    ip: requestHeaders.get('x-forwarded-for'),
    userAgent: requestHeaders.get('user-agent'),
  });

  if (!session.ok) {
    // L'installation, elle, a réussi : renvoyer vers la connexion plutôt que
    // laisser croire le contraire.
    redirect('/connexion');
  }

  (await cookies()).set(SESSION_COOKIE, session.token, {
    ...SESSION_COOKIE_OPTIONS,
    expires: session.expiresAt,
  });

  // Le rôle propriétaire donne accès aux rémunérations et à la distribution des
  // droits : le layout applicatif exigera aussitôt un second facteur. C'est
  // voulu — c'est le compte le plus exposé de l'instance.
  redirect('/');
}
