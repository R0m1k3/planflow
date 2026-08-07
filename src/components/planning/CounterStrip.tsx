import type { DeltaTone, WeekCountersView } from '@/domain/counters/week';
import { cx } from '@/lib/cx';

const DELTA_TONES: Record<DeltaTone, string> = {
  flat: 'text-ink-1',
  over: 'bg-warn-soft text-warn-soft-ink',
  under: 'bg-danger-soft text-danger-soft-ink',
  none: 'text-ink-3',
};

export interface CounterStripProps {
  counters: WeekCountersView;
  /** Vrai si le contrat est au forfait jours : pas de comparaison horaire. */
  forfaitJours?: boolean;
  className?: string;
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-ink-3">{label}</span>
      <span className="tnum text-ink-2">{value}</span>
    </span>
  );
}

/**
 * Les cinq compteurs d'une ligne salarié : contrat, planifié, absences, écart,
 * dimanches et repos. Rendus depuis `computeWeekCounters`, jamais recalculés
 * localement.
 */
export function CounterStrip({
  counters,
  forfaitJours = false,
  className,
}: CounterStripProps) {
  if (forfaitJours) {
    return (
      <div className={cx('flex items-center gap-2 text-micro', className)}>
        <span className="rounded-full bg-accent-soft px-1.5 py-px font-medium text-accent-soft-ink">
          Forfait jours
        </span>
        <Cell label="Rep." value={String(counters.restDays)} />
      </div>
    );
  }

  return (
    <div
      className={cx('flex flex-wrap items-center gap-x-2 gap-y-px text-micro', className)}
    >
      <Cell label="Contr." value={counters.contractLabel} />
      <span aria-hidden className="text-line-3">
        ·
      </span>
      <Cell label="Planif." value={counters.plannedLabel} />
      <span
        className={cx(
          'tnum rounded-full px-1.5 py-px font-semibold',
          DELTA_TONES[counters.tone],
        )}
        title="Écart au contrat"
      >
        {counters.deltaLabel}
      </span>
      <Cell label="Dim." value={String(counters.sundaysWorked)} />
      <Cell label="Rep." value={String(counters.restDays)} />
    </div>
  );
}
