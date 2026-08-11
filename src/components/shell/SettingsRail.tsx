'use client';

import Link from 'next/link';

import {
  isActive,
  placeholderHref,
  type NavSection,
} from '@/components/shell/navigation';
import { cx } from '@/lib/cx';

/**
 * Rail latéral des réglages — et **seulement** des réglages.
 *
 * Partout ailleurs, la section tient en une poignée d'entrées et se présente en
 * onglets, qui laissent toute la largeur au contenu. Les réglages en comptent
 * une vingtaine : en onglets, ils occuperaient trois rangées au-dessus de
 * chaque écran, et la liste changerait de forme d'une page à l'autre selon la
 * longueur des libellés.
 *
 * Une liste verticale les tient dans un ordre stable, groupés par domaine. Ce
 * n'est pas la même navigation qu'ailleurs parce que ce n'est pas le même
 * usage : on traverse les réglages, on ne fait pas d'aller-retour entre eux
 * pendant qu'on travaille.
 */

/**
 * Regroupement des entrées, dans l'ordre d'un paramétrage.
 *
 * L'identité de l'entreprise, puis ce qui organise le travail, puis ce qui le
 * paie, puis ce qui l'encadre. Un client qui installe l'instance descend la
 * liste ; c'est cet ordre-là, pas l'alphabet.
 */
const GROUPS: ReadonlyArray<{ label: string; ids: readonly string[] }> = [
  { label: 'Société', ids: ['compte', 'sites', 'convention'] },
  { label: 'Organisation', ids: ['emplois', 'etiquettes', 'types-absence'] },
  { label: 'Travail', ids: ['preferences', 'impression', 'productivite'] },
  { label: 'Paie', ids: ['paie-reglages'] },
  { label: 'Accès', ids: ['roles', 'securite', 'email'] },
  {
    label: 'Conformité',
    ids: ['registre', 'conservation', 'rgpd', 'modeles'],
  },
];

export function SettingsRail({
  section,
  pathname,
}: {
  section: NavSection;
  pathname: string;
}) {
  const byId = new Map(section.items.map((item) => [item.id, item]));

  // Une entrée ajoutée à la navigation sans être rangée dans un groupe reste
  // visible, en fin de liste : la perdre serait pire que de mal la classer.
  const grouped = new Set(GROUPS.flatMap((group) => group.ids));
  const rest = section.items.filter((item) => !grouped.has(item.id));

  const groups = [
    ...GROUPS.map((group) => ({
      label: group.label,
      items: group.ids
        .map((id) => byId.get(id))
        .filter((item) => item !== undefined),
    })),
    ...(rest.length > 0 ? [{ label: 'Autres', items: rest }] : []),
  ].filter((group) => group.items.length > 0);

  return (
    <nav
      aria-label="Réglages"
      data-print="hide"
      className="flex w-56 flex-none flex-col gap-5 pt-6 pb-4"
    >
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="eyebrow px-2.5 pb-1.5">{group.label}</p>

          {group.items.map((item) => {
            const current = item.href ? isActive(item.href, pathname) : false;

            return (
              <Link
                key={item.id}
                href={item.href ?? placeholderHref(item.label)}
                aria-current={current ? 'page' : undefined}
                className={cx(
                  'rounded-2 border-l-2 px-2.5 py-1.5 text-sm',
                  'transition-colors duration-[var(--d-2)] ease-organic',
                  current
                    ? 'border-accent bg-accent-soft font-semibold text-accent-soft-ink'
                    : item.href
                      ? 'border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink-1'
                      : 'border-transparent text-ink-3 hover:bg-surface-2',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
