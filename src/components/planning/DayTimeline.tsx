import { posteShort, posteTokens } from '@/lib/design/postes';
import { cx } from '@/lib/cx';
import type { DayLane } from '@/server/planning/queries';

/** « 09:00 » depuis des minutes après minuit ; 25 h devient 01:00. */
function clock(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export type { DayLane };

export interface DayTimelineProps {
  lanes: DayLane[];
  /** Amplitude affichée, en heures locales. */
  fromHour: number;
  toHour: number;
}

/**
 * Vue jour : une chronologie horizontale par salarié.
 *
 * Là où la vue semaine répond à « qui travaille combien », celle-ci répond à
 * « qui est présent à 14 h » — d'où la bande d'effectif sous l'échelle, qui
 * rend les creux de couverture visibles sans avoir à lire chaque ligne.
 */
export function DayTimeline({ lanes, fromHour, toHour }: DayTimelineProps) {
  const span = toHour - fromHour;
  const hours = Array.from({ length: span + 1 }, (_, i) => fromHour + i);

  const coverage = hours.slice(0, -1).map((hour) => {
    const start = hour * 60;
    const end = start + 60;
    return lanes.filter(
      (lane) =>
        !lane.unassigned &&
        lane.shifts.some(
          (shift) => shift.startMinutes < end && shift.endMinutes > start,
        ),
    ).length;
  });
  const peak = Math.max(1, ...coverage);

  const offset = (minutes: number) =>
    `${((minutes - fromHour * 60) / (span * 60)) * 100}%`;

  return (
    <div className="overflow-x-auto rounded-3 border border-line-1 bg-surface">
      <div className="min-w-[980px]">
        <div className="flex border-b border-line-2 bg-surface-2">
          <div className="w-56 flex-none border-r border-line-1 px-3 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
            Salarié
          </div>
          <div className="relative flex-1">
            {hours.map((hour) => (
              <span
                key={hour}
                className="tnum absolute top-2 -translate-x-1/2 text-micro text-ink-3"
                style={{ left: offset(hour * 60) }}
              >
                {String(hour).padStart(2, '0')}h
              </span>
            ))}
            <div className="h-9" />
          </div>
        </div>

        <div className="flex border-b border-line-1 bg-surface-2/60">
          <div className="w-56 flex-none border-r border-line-1 px-3 py-1.5 text-micro text-ink-2">
            Effectif présent
          </div>
          <div className="flex flex-1">
            {coverage.map((count, index) => (
              <div
                key={hours[index]}
                className="flex flex-1 items-end justify-center border-r border-line-1 py-1 last:border-r-0"
                title={`${count} présent${count > 1 ? 's' : ''} à ${String(hours[index]).padStart(2, '0')} h`}
              >
                <span
                  className="tnum w-full rounded-1 text-center text-micro font-semibold"
                  style={{
                    background:
                      count === 0
                        ? 'var(--color-danger-soft)'
                        : 'var(--color-accent-soft)',
                    color:
                      count === 0
                        ? 'var(--color-danger-soft-ink)'
                        : 'var(--color-accent-soft-ink)',
                    opacity: count === 0 ? 1 : 0.35 + (count / peak) * 0.65,
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {lanes.map((lane) => (
          <div
            key={lane.id}
            className={cx(
              'flex border-b border-line-1 last:border-b-0',
              lane.unassigned && 'bg-surface-2',
            )}
          >
            <div className="flex w-56 flex-none items-center gap-2 border-r border-line-1 px-3 py-2">
              <span
                aria-hidden
                className={cx(
                  'flex size-6 flex-none items-center justify-center rounded-full text-micro font-semibold',
                  lane.unassigned
                    ? 'border border-dashed border-line-3 text-ink-3'
                    : 'bg-surface-3 text-ink-2',
                )}
              >
                {lane.initials}
              </span>
              <span className="min-w-0">
                <span
                  className={cx(
                    'block truncate text-sm font-medium',
                    lane.unassigned ? 'text-ink-3' : 'text-ink-1',
                  )}
                >
                  {lane.name}
                </span>
                <span className="block truncate text-micro text-ink-3">
                  {lane.job}
                </span>
              </span>
            </div>

            <div className="relative min-h-[var(--row-h)] flex-1">
              {hours.slice(1, -1).map((hour) => (
                <span
                  key={hour}
                  aria-hidden
                  className="absolute inset-y-0 w-px bg-line-1"
                  style={{ left: offset(hour * 60) }}
                />
              ))}

              {lane.shifts.map((shift) => {
                const tokens = posteTokens(shift.poste);
                const ghost = shift.state === 'unassigned';
                return (
                  <div
                    key={shift.id}
                    className="absolute top-1 bottom-1 flex items-center gap-1.5 overflow-hidden rounded-2 px-2 text-micro"
                    style={{
                      left: offset(shift.startMinutes),
                      width: `calc(${offset(shift.endMinutes)} - ${offset(shift.startMinutes)})`,
                      background: ghost ? 'transparent' : tokens.bg,
                      color: ghost ? 'var(--color-ink-2)' : tokens.fg,
                      border: ghost
                        ? `1px dashed ${tokens.edge}`
                        : '1px solid transparent',
                    }}
                    title={`${posteShort(shift.poste)} · ${clock(shift.startMinutes)}–${clock(shift.endMinutes)}`}
                  >
                    <span className="font-semibold tracking-wide">
                      {posteShort(shift.poste)}
                    </span>
                    <span className="tnum truncate opacity-90">
                      {clock(shift.startMinutes)}–{clock(shift.endMinutes)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
