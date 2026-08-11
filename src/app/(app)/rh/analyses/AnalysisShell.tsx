import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import type { AnalyticsSeries } from '@/server/hr/analytics';

/**
 * Cadre commun aux trois analyses.
 *
 * Même en-tête, même sélecteur d'établissement, mêmes onglets : trois écrans
 * qui répondent à trois questions sur le même jeu de données n'ont pas de
 * raison de se présenter différemment.
 */

export const ANALYSES = [
  { key: 'effectifs', href: '/rh/analyses/effectifs', label: 'Effectifs' },
  { key: 'heures', href: '/rh/analyses/heures', label: 'Heures' },
  { key: 'absences', href: '/rh/analyses/absences', label: 'Absences' },
] as const;

export type AnalysisKey = (typeof ANALYSES)[number]['key'];

export function AnalysisShell({
  current,
  title,
  subtitle,
  series,
  children,
  footnote,
}: {
  current: AnalysisKey;
  title: string;
  subtitle: string;
  series: AnalyticsSeries;
  children: React.ReactNode;
  footnote: string;
}) {
  const withLocation = (href: string) =>
    series.location ? `${href}?etablissement=${series.location.id}` : href;

  return (
    <PageBody>
      <PageHeader
        title={title}
        subtitle={`${series.location?.name ?? 'Tous établissements'} · ${subtitle}`}
        actions={
          <nav aria-label="Analyses" className="flex gap-1">
            {ANALYSES.map((analysis) => (
              <Link
                key={analysis.key}
                href={withLocation(analysis.href)}
                aria-current={analysis.key === current ? 'page' : undefined}
                className={
                  analysis.key === current
                    ? 'flex h-8 items-center rounded-2 border border-line-3 bg-surface-2 px-3 text-sm font-medium text-ink-1'
                    : 'flex h-8 items-center rounded-2 px-3 text-sm text-ink-2 hover:bg-surface-2'
                }
              >
                {analysis.label}
              </Link>
            ))}
          </nav>
        }
      />

      {series.locations.length > 1 ? (
        <Card>
          <CardHeader title="Établissement" />
          <div className="flex flex-wrap gap-1 px-4 py-3">
            {series.locations.map((location) => (
              <Link
                key={location.id}
                href={`${ANALYSES.find((a) => a.key === current)?.href}?etablissement=${location.id}`}
                aria-current={
                  location.id === series.location?.id ? 'page' : undefined
                }
                className={
                  location.id === series.location?.id
                    ? 'flex h-7 items-center rounded-2 border border-line-3 bg-surface-2 px-2.5 text-xs font-medium text-ink-1'
                    : 'flex h-7 items-center rounded-2 px-2.5 text-xs text-ink-2 hover:bg-surface-2'
                }
              >
                {location.name}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      {children}

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        {footnote}
      </p>
    </PageBody>
  );
}

/** Mois abrégé, pour l'axe du graphique. « septembre 2026 » → « sept. 26 ». */
export function shortMonth(label: string): string {
  const [name, year] = label.split(' ');
  if (!name || !year) return label;
  const abbreviated = name.length > 4 ? `${name.slice(0, 4)}.` : name;
  return `${abbreviated} ${year.slice(2)}`;
}
