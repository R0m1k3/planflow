'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import {
  isActive,
  placeholderHref,
  type NavSection,
} from '@/components/shell/navigation';
import { cx } from '@/lib/cx';

/**
 * Entrées de la section courante, en onglets.
 *
 * Elles vivaient dans une barre latérale. Deux raisons de l'avoir retirée :
 * elle rognait la largeur utile au moment précis où la grille de planning en
 * manque, et elle donnait à la navigation deux grammaires — des onglets sur la
 * fiche salarié, une liste verticale ailleurs. Une seule grammaire se retient ;
 * deux se cherchent.
 *
 * Une entrée sans `href` désigne un écran du périmètre qui n'est pas encore
 * construit. Elle reste affichée et mène à un écran d'attente qui le dit : la
 * masquer ferait croire le produit plus étroit qu'il n'est visé, et la laisser
 * inerte ferait croire la navigation cassée.
 */
export function SectionTabs({
  section,
  pathname,
}: {
  section: NavSection;
  pathname: string;
}) {
  if (section.items.length === 0) return null;

  return (
    // Les onglets **passent à la ligne**, ils ne défilent pas. Une barre de
    // défilement horizontale cache la moitié des entrées derrière un geste que
    // rien n'annonce : on ne sait pas ce qu'on ne voit pas. Deux rangées
    // prennent seize pixels de plus et montrent tout.
    <nav
      aria-label={`Section ${section.label}`}
      data-print="hide"
      className="flex flex-wrap gap-1 rounded-3 border border-line-1 bg-surface p-1.5"
    >
      {section.items.map((item) => {
        const current = item.href ? isActive(item.href, pathname) : false;

        return (
          <Link
            key={item.id}
            href={item.href ?? placeholderHref(item.label)}
            aria-current={current ? 'page' : undefined}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap',
              'transition-colors duration-[var(--d-1)] ease-organic',
              current
                ? 'bg-surface-3 text-ink-1'
                : item.href
                  ? 'text-ink-2 hover:bg-surface-2 hover:text-ink-1'
                  : 'text-ink-3 hover:bg-surface-2',
            )}
          >
            {item.label}
            {item.badge ? (
              <Badge subtle tone="neutral">
                {item.badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
