import { redirect } from 'next/navigation';

import { SignInForm } from '@/app/(auth)/connexion/SignInForm';
import { currentSession } from '@/server/auth/session';

export const metadata = { title: 'Connexion · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function ConnexionPage() {
  if (await currentSession()) redirect('/');

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
          <h1 className="text-lg font-semibold">Connexion</h1>
          <p className="mt-1 mb-5 text-sm text-ink-2">
            Accédez à vos plannings et à votre équipe.
          </p>
          <SignInForm />
        </div>

        <p className="mt-4 text-center text-micro text-ink-3">
          Instance auto-hébergée · Maison Rivage
        </p>
      </div>
    </main>
  );
}
