'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cx } from '@/lib/cx';

/**
 * Onglets de la fiche salarié.
 *
 * Chaque onglet est une **route**, pas un état de composant : une fiche
 * s'envoie par lien, se rouvre au même endroit, et le retour arrière ramène à
 * l'onglet précédent plutôt qu'à la liste.
 */

const TABS = [
  { segment: '', label: 'Informations personnelles' },
  { segment: 'contrats', label: 'Contrats' },
  { segment: 'planification', label: 'Planification et accès' },
  { segment: 'absences', label: 'Congés et Absences' },
  { segment: 'documents', label: 'Documents' },
] as const;

export function MemberTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/equipe/${id}`;

  return (
    <nav
      aria-label="Sections de la fiche"
      className="flex gap-1 overflow-x-auto rounded-3 border border-line-1 bg-surface p-1.5"
    >
      {TABS.map((tab) => {
        const href = tab.segment ? `${base}/${tab.segment}` : base;
        const active = tab.segment
          ? pathname.startsWith(href)
          : pathname === base;

        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap',
              'transition-colors duration-[var(--d-1)] ease-organic',
              active
                ? 'bg-surface-3 text-ink-1'
                : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
