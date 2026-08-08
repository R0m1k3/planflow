import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { MfaChallengeForm } from '@/app/(auth)/connexion/verification/MfaChallengeForm';
import { pendingChallenge, SESSION_COOKIE } from '@/server/auth/session';

export const metadata = { title: 'Vérification · PlanFlow' };
export const dynamic = 'force-dynamic';

/**
 * Second facteur, à la connexion.
 *
 * La session existe déjà mais ne résout aucun acteur : elle ne porte que ce
 * défi, et expire d'elle-même en dix minutes.
 */
export default async function VerificationPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const challenge = token ? await pendingChallenge(token) : null;

  // Sans défi en cours, il n'y a rien à vérifier : ou la session est pleine, ou
  // elle a expiré. Dans les deux cas la page de connexion tranche.
  if (!challenge) redirect('/connexion');

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span aria-hidden className="size-6 rounded-2 bg-accent" />
          <span className="text-xl font-semibold tracking-[-0.015em]">
            PlanFlow
          </span>
        </div>

        <div className="rounded-3 border border-line-1 bg-surface p-6 shadow-e1">
          <h1 className="text-lg font-semibold">Vérification</h1>
          <p className="mt-1 mb-5 text-sm text-ink-2">
            Saisissez le code affiché par votre application
            d’authentification pour {challenge.email}.
          </p>
          <MfaChallengeForm />
        </div>
      </div>
    </main>
  );
}
