import { cx } from '@/lib/cx';

export type AbsenceKind = 'cp' | 'rtt' | 'maladie' | 'sans-solde' | 'attente';

const KINDS: Record<AbsenceKind, { bg: string; ink: string; edge: string }> = {
  cp: {
    bg: 'var(--color-info-soft)',
    ink: 'var(--color-info-soft-ink)',
    edge: 'var(--color-info)',
  },
  rtt: {
    bg: 'var(--color-accent-soft)',
    ink: 'var(--color-accent-soft-ink)',
    edge: 'var(--color-accent)',
  },
  maladie: {
    bg: 'var(--color-surface-3)',
    ink: 'var(--color-ink-2)',
    edge: 'var(--color-line-3)',
  },
  'sans-solde': {
    bg: 'var(--color-surface-2)',
    ink: 'var(--color-ink-2)',
    edge: 'var(--color-line-3)',
  },
  attente: {
    bg: 'var(--color-warn-soft)',
    ink: 'var(--color-warn-soft-ink)',
    edge: 'var(--color-warn)',
  },
};

export interface AbsenceBarProps {
  kind: AbsenceKind;
  label: string;
  /** Durée déjà formatée, ex. « 5 j ». */
  duration: string;
  /** Index du premier jour couvert, 0 = lundi. */
  startDay: number;
  /** Nombre de jours couverts. */
  span: number;
  /** Nombre de colonnes de la grille. */
  columns?: number;
  className?: string;
}

/**
 * Barre d'absence continue sur plusieurs jours.
 *
 * Positionnée en pourcentage de la largeur de grille plutôt qu'en colonnes CSS :
 * la barre chevauche les cellules au lieu de s'y insérer, ce qui laisse voir
 * qu'une absence est une période continue et non une suite de jours isolés.
 */
export function AbsenceBar({
  kind,
  label,
  duration,
  startDay,
  span,
  columns = 7,
  className,
}: AbsenceBarProps) {
  const tone = KINDS[kind];

  return (
    <div
      className={cx(
        'pointer-events-none absolute z-10 flex items-center gap-2 overflow-hidden rounded-2 px-2 py-0.5 text-micro font-medium',
        className,
      )}
      style={{
        left: `calc(100% / ${columns} * ${startDay} + 3px)`,
        width: `calc(100% / ${columns} * ${span} - 6px)`,
        background: tone.bg,
        color: tone.ink,
        border: `1px solid ${tone.edge}`,
      }}
    >
      <span className="truncate">{label}</span>
      <span className="tnum ml-auto shrink-0 opacity-80">{duration}</span>
    </div>
  );
}
