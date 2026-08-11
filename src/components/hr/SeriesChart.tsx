import { cx } from '@/lib/cx';

/**
 * Histogramme mensuel, en HTML.
 *
 * Pas de bibliothèque de graphiques : douze barres et une échelle ne justifient
 * pas 90 ko de dépendance, et la CSP interdit de toute façon toute origine
 * tierce. Le tableau reste la source — le graphique n'est qu'une lecture rapide
 * posée devant lui.
 *
 * **La hauteur ne porte jamais l'information seule** : chaque barre affiche sa
 * valeur, et l'ensemble est doublé d'un tableau lisible au lecteur d'écran.
 */

export interface SeriesPoint {
  label: string;
  value: number | null;
  /** Libellé affiché sous la barre — le mois abrégé. */
  short: string;
}

export function SeriesChart({
  points,
  format,
  tone = 'accent',
}: {
  points: SeriesPoint[];
  format: (value: number) => string;
  tone?: 'accent' | 'warn' | 'info';
}) {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
  const max = values.length > 0 ? Math.max(...values) : 0;

  const bar = {
    accent: 'bg-accent',
    warn: 'bg-warn',
    info: 'bg-info',
  }[tone];

  return (
    <div
      className="flex items-end gap-1.5 overflow-x-auto px-4 py-4"
      role="presentation"
    >
      {points.map((point) => {
        // Une valeur nulle n'est pas zéro : un taux non calculable sur un
        // effectif vide ne doit pas se dessiner comme une absence de mouvement.
        const height =
          point.value === null || max === 0
            ? 0
            : Math.max(2, Math.round((point.value / max) * 120));

        return (
          <div
            key={point.label}
            className="flex min-w-[3.25rem] flex-1 flex-col items-center gap-1"
          >
            <span className="tnum text-micro text-ink-2">
              {point.value === null ? '—' : format(point.value)}
            </span>
            <div
              className={cx(
                'w-full rounded-t-2',
                point.value === null ? 'bg-surface-3' : bar,
              )}
              style={{ height: `${height}px` }}
            />
            <span className="text-micro text-ink-3">{point.short}</span>
          </div>
        );
      })}
    </div>
  );
}
