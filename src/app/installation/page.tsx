import { redirect } from 'next/navigation';

import { InstallForm } from '@/app/installation/InstallForm';
import { isInstalled } from '@/server/install/state';

export const metadata = { title: 'Installation · PlanFlow' };
export const dynamic = 'force-dynamic';

/**
 * Première installation — PLAN.md §5.
 *
 * Après `prisma migrate deploy`, une instance neuve a le schéma et rien
 * d'autre : aucun compte, aucun utilisateur, personne pour se connecter. Le
 * seed ne comble pas ce trou — il installe une démonstration et refuse de
 * tourner en production, à raison.
 *
 * Cet écran est donc le seul de l'application à s'ouvrir sans session. Il se
 * referme définitivement dès qu'il a servi.
 */
export default async function InstallationPage() {
  if (await isInstalled()) redirect('/connexion');

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span aria-hidden className="size-6 rounded-2 bg-accent" />
          <span className="text-xl font-semibold tracking-[-0.015em]">
            PlanFlow
          </span>
        </div>

        <div className="rounded-3 border border-line-1 bg-surface p-6 shadow-e1">
          <h1 className="text-lg font-semibold">Première installation</h1>
          <p className="mt-1 mb-5 text-sm text-ink-2">
            Cette instance est vierge. Créez votre entreprise et le compte qui
            l’administrera — cet écran ne se rouvrira pas.
          </p>

          <InstallForm />
        </div>

        <p className="mt-4 text-center text-micro text-ink-3">
          Le compte créé ici détient tous les droits. Un second facteur vous sera
          demandé dès la première connexion.
        </p>
      </div>
    </main>
  );
}
