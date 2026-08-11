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
      {/*
        Barre d'application, collante.

        Elle reste au-dessus quand la page défile : sur une grille de quatre-vingts
        lignes, revenir en haut pour changer de semaine ou d'établissement est le
        geste qu'on répète le plus.
      */}
      <header
        data-print="hide"
        className="sticky top-0 z-20 flex h-14 flex-none items-center gap-6 border-b border-line-2 bg-surface px-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-2 text-lg font-semibold tracking-[-0.02em] text-ink-1"
        >
          {/* Deux barres inégales : une semaine planifiée, pas un carré de
              couleur. La marque du produit est sa grille. */}
          <span aria-hidden className="flex h-4 items-end gap-[3px]">
            <span className="h-4 w-[3px] rounded-full bg-accent" />
            <span className="h-2.5 w-[3px] rounded-full bg-accent/55" />
            <span className="h-3.5 w-[3px] rounded-full bg-accent/80" />
          </span>
          PlanFlow
        </Link>

        <nav aria-label="Sections" className="flex h-full">
          {NAVIGATION.map((entry) => {
            const current = entry.id === section.id;
            return (
              <Link
                key={entry.id}
                href={sectionHref(entry)}
                aria-current={current ? 'page' : undefined}
                className={cx(
                  'relative flex h-full items-center px-4 text-sm whitespace-nowrap',
                  'transition-colors duration-[var(--d-2)] ease-organic',
                  // Le filet actif est en bas de la barre, à l'aplomb de
                  // l'onglet : c'est le même trait que celui qui marque la
                  // section ouverte plus bas dans la page.
                  'after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-t-full',
                  current
                    ? 'font-semibold text-ink-1 after:bg-accent'
                    : 'font-medium text-ink-3 after:bg-transparent hover:text-ink-1',
                )}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>

        <span className="flex-1" />

        <ThemeToggle />

        <span className="h-6 w-px bg-line-1" aria-hidden />

        <span
          className="flex items-center gap-2.5"
          title={`${fullName} · ${roleName}`}
        >
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-ink"
          >
            {initials}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-xs font-medium text-ink-1">{fullName}</span>
            <span className="text-micro text-ink-3">{roleName}</span>
          </span>
          <span className="sr-only">{`${fullName}, ${roleName}`}</span>
        </span>

        <form action={signOutAction}>
          <Button size="sm" variant="ghost" type="submit">
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
