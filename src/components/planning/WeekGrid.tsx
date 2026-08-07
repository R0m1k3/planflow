import { AbsenceBar } from '@/components/planning/AbsenceBar';
import { CounterStrip } from '@/components/planning/CounterStrip';
import { ShiftChip } from '@/components/planning/ShiftChip';
import { computeWeekCounters } from '@/domain/counters/week';
import { cx } from '@/lib/cx';
import {
  fullName,
  initials,
  timeRange,
  type DemoWeekRow,
} from '@/lib/demo/types';

export interface WeekGridProps {
  days: readonly string[];
  rows: DemoWeekRow[];
  unassignedRow?: DemoWeekRow;
}

/**
 * Grille hebdomadaire : lignes salariés × sept jours.
 *
 * Le samedi et le dimanche portent un fond distinct. Ce n'est pas décoratif :
 * en commerce de détail, ce sont les jours à contreparties — dimanche du maire
 * majoré et repos compensateur — et les distinguer d'un coup d'œil évite de les
 * planifier par inadvertance.
 */
export function WeekGrid({ days, rows, unassignedRow }: WeekGridProps) {
  return (
    <div className="overflow-x-auto rounded-3 border border-line-1 bg-surface">
      <div className="min-w-[1040px]">
        <GridHeader days={days} />
        {unassignedRow ? <Row row={unassignedRow} days={days} /> : null}
        {rows.map((row) => (
          <Row key={row.employee.id} row={row} days={days} />
        ))}
      </div>
    </div>
  );
}

function GridHeader({ days }: { days: readonly string[] }) {
  return (
    <div className="sticky top-0 z-20 flex border-b border-line-2 bg-surface-2">
      <div className="w-64 flex-none border-r border-line-1 px-3 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
        Salarié
      </div>
      <div className="grid flex-1 grid-cols-7">
        {days.map((day, index) => (
          <div
            key={day}
            className={cx(
              'border-r border-line-1 px-2 py-2 text-center text-xs font-semibold last:border-r-0',
              index > 4 ? 'bg-surface-3 text-ink-2' : 'text-ink-1',
            )}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ row, days }: { row: DemoWeekRow; days: readonly string[] }) {
  const counters = computeWeekCounters(row.counters);
  const name = row.unassigned ? 'Non assigné' : fullName(row.employee);

  return (
    <div
      className={cx(
        'flex border-b border-line-1 last:border-b-0',
        row.unassigned && 'bg-surface-2',
      )}
    >
      <div className="w-64 flex-none border-r border-line-1 px-3 py-2">
        <div className="flex items-center gap-2">
          {row.unassigned ? (
            <span
              aria-hidden
              className="flex size-6 items-center justify-center rounded-full border border-dashed border-line-3 text-micro text-ink-3"
            >
              ?
            </span>
          ) : (
            <span
              aria-hidden
              className="flex size-6 items-center justify-center rounded-full bg-surface-3 text-micro font-semibold text-ink-2"
            >
              {initials(row.employee)}
            </span>
          )}
          <span className="min-w-0">
            <span
              className={cx(
                'block truncate text-sm font-medium',
                row.unassigned ? 'text-ink-3' : 'text-ink-1',
              )}
            >
              {name}
            </span>
            <span className="block truncate text-micro text-ink-3">
              {row.employee.job}
            </span>
          </span>
        </div>
        <CounterStrip
          counters={counters}
          forfaitJours={row.employee.forfaitJours ?? false}
          unassigned={row.unassigned ?? false}
          className="mt-1"
        />
      </div>

      <div className="relative grid flex-1 grid-cols-7">
        {row.absence ? (
          <AbsenceBar
            kind={row.absence.kind}
            label={row.absence.label}
            duration={`${row.absence.span} j`}
            startDay={row.absence.startDay}
            span={row.absence.span}
            className="top-1.5"
          />
        ) : null}

        {days.map((day, index) => {
          const shifts = row.days[index] ?? [];
          return (
            <div
              key={day}
              className={cx(
                'flex min-h-[var(--row-h)] flex-col gap-1 border-r border-line-1 p-1 last:border-r-0',
                index > 4 && 'bg-surface-2',
                row.absence &&
                  index >= row.absence.startDay &&
                  index < row.absence.startDay + row.absence.span &&
                  'pt-7',
              )}
            >
              {shifts.map((shift, position) => (
                <ShiftChip
                  key={`${day}-${position}`}
                  poste={shift.poste}
                  time={timeRange(shift)}
                  state={shift.state ?? 'published'}
                  {...(shift.delta ? { delta: shift.delta } : {})}
                  {...(shift.alert ? { alert: shift.alert } : {})}
                  {...(shift.breakMinutes
                    ? { breakMinutes: shift.breakMinutes }
                    : {})}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
