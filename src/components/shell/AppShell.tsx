'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { SectionTabs } from '@/components/shell/SectionTabs';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/cx';
import { signOutAction } from '@/server/auth/actions';
import {
  NAVIGATION,
  sectionForPath,
  sectionHref,
} from '@/components/shell/navigation';

export interface AppShellProps {
  children: ReactNode;
  initials: string;
  fullName: string;
  roleName: string;
  accountName: string;
}

export function AppShell({
  children,
  initials,
  fullName,
  roleName,
  accountName,
}: AppShellProps) {
  const pathname = usePathname();
  const section = sectionForPath(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink-1">
      <header data-print="hide" className="flex h-13 flex-none items-center gap-5 border-b border-line-2 bg-surface px-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-2 text-lg font-semibold tracking-[-0.015em]"
        >
          <span aria-hidden className="size-5 rounded-2 bg-accent" />
          PlanFlow
        </Link>

        <nav aria-label="Sections" className="flex h-full gap-0.5">
          {NAVIGATION.map((entry) => {
            const current = entry.id === section.id;
            return (
              <Link
                key={entry.id}
                href={sectionHref(entry)}
                aria-current={current ? 'page' : undefined}
                className={cx(
                  'flex h-full items-center border-b-2 px-3.5 text-sm font-medium whitespace-nowrap',
                  current
                    ? 'border-accent text-ink-1'
                    : 'border-transparent text-ink-3 hover:text-ink-1',
                )}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>

        <span className="flex-1" />

        <Button size="sm">
          Nantes Atlantis
          <span aria-hidden className="text-[10px] text-ink-3">
            ▾
          </span>
        </Button>
        <ThemeToggle />
        <span
          className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-ink"
          title={`${fullName} · ${roleName}`}
        >
          <span aria-hidden>{initials}</span>
          <span className="sr-only">{`${fullName}, ${roleName}`}</span>
        </span>
        <form action={signOutAction}>
          <Button size="sm" type="submit">
            Déconnexion
          </Button>
        </form>
      </header>

      {/*
        Colonne centrale de **largeur fixe**, pas fluide.

        Une largeur qui suit la fenêtre fait bouger les colonnes du planning
        d'un poste à l'autre : la même semaine ne se lit pas au même endroit sur
        deux écrans, et l'œil doit se réorienter à chaque ouverture. Une largeur
        arrêtée rend la page reconnaissable, et laisse la fenêtre défiler
        horizontalement plutôt que de comprimer la grille.
      */}
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex min-h-full w-[1280px] flex-col">
          <div className="px-6 pt-5">
            <SectionTabs section={section} pathname={pathname} />
          </div>

          {children}

          <p
            data-print="hide"
            className="mt-auto border-t border-line-1 px-6 py-4 text-micro leading-relaxed text-ink-3"
          >
            Instance auto-hébergée · {accountName}
          </p>
        </div>
      </main>
    </div>
  );
}
