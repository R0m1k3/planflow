import { AbsenceBar, type AbsenceKind } from '@/components/planning/AbsenceBar';
import { CounterStrip } from '@/components/planning/CounterStrip';
import { ShiftChip } from '@/components/planning/ShiftChip';
import { isAbsenceColorKey } from '@/domain/absences/colors';
import { computeWeekCounters } from '@/domain/counters/week';
import {
  displayName,
  initialsOf,
  type BoardRow,
  type BoardShift,
} from '@/domain/planning/board';
import { cx } from '@/lib/cx';

export interface WeekGridProps {
  days: readonly string[];
  dates: readonly string[];
  rows: BoardRow[];
  unassignedRow?: BoardRow | null;
  /** Créneaux portant un constat de convention : ils prennent le liseré. */
  flaggedShiftIds?: ReadonlySet<string>;
  /** Rendu de la case d'un jour : sert à greffer l'ajout d'un créneau. */
  cellAction?: (row: BoardRow, dayIndex: number) => React.ReactNode;
  /** Rendu attaché à un créneau : suppression, édition. */
  shiftAction?: (
    shift: BoardShift,
    row: BoardRow,
    dayIndex: number,
  ) => React.ReactNode;
}

/**
 * Grille hebdomadaire : lignes salariés × sept jours.
 *
 * Le samedi et le dimanche portent un fond distinct. Ce n'est pas décoratif :
 * en commerce de détail, ce sont les jours à contreparties — dimanche du maire
 * majoré et repos compensateur — et les distinguer d'un coup d'œil évite de les
 * planifier par inadvertance.
 */
export function WeekGrid({
  days,
  dates,
  rows,
  unassignedRow,
  flaggedShiftIds,
  cellAction,
  shiftAction,
}: WeekGridProps) {
  return (
    <div className="overflow-x-auto rounded-3 border border-line-1 bg-surface">
      {/* Rôles ARIA explicites : la grille est faite de div pour la mise en
          page, mais elle se lit comme un tableau — un lecteur d'écran doit
          pouvoir annoncer « ligne Camille Ferrand, colonne mercredi ». */}
      <div role="grid" aria-label="Planning de la semaine" className="min-w-[1040px]">
        <GridHeader days={days} />
        {unassignedRow ? (
          <Row
            row={unassignedRow}
            days={days}
            dates={dates}
            {...(flaggedShiftIds ? { flaggedShiftIds } : {})}
            {...(cellAction ? { cellAction } : {})}
            {...(shiftAction ? { shiftAction } : {})}
          />
        ) : null}
        {rows.length === 0 && !unassignedRow ? (
          <p className="px-4 py-6 text-sm text-ink-3">
            Aucun salarié rattaché à cette équipe.
          </p>
        ) : null}
        {rows.map((row) => (
          <Row
            key={row.membershipId ?? 'unassigned'}
            row={row}
            days={days}
            dates={dates}
            {...(flaggedShiftIds ? { flaggedShiftIds } : {})}
            {...(cellAction ? { cellAction } : {})}
            {...(shiftAction ? { shiftAction } : {})}
          />
        ))}
      </div>
    </div>
  );
}

function GridHeader({ days }: { days: readonly string[] }) {
  return (
    <div
      role="row"
      className="sticky top-0 z-20 flex border-b border-line-2 bg-surface-2"
    >
      <div
        role="columnheader"
        className="w-64 flex-none border-r border-line-1 px-3 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase"
      >
        Salarié
      </div>
      <div className="grid flex-1 grid-cols-7">
        {days.map((day, index) => (
          <div
            role="columnheader"
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

function Row({
  row,
  days,
  dates,
  flaggedShiftIds,
  cellAction,
  shiftAction,
}: {
  row: BoardRow;
  days: readonly string[];
  dates: readonly string[];
  flaggedShiftIds?: ReadonlySet<string>;
  cellAction?: (row: BoardRow, dayIndex: number) => React.ReactNode;
  shiftAction?: (
    shift: BoardShift,
    row: BoardRow,
    dayIndex: number,
  ) => React.ReactNode;
}) {
  const counters = computeWeekCounters(row.counters);
  const name = row.unassigned ? 'Non assigné' : displayName(row);

  return (
    <div
      role="row"
      data-membership={row.membershipId ?? 'unassigned'}
      className={cx(
        'flex border-b border-line-1 last:border-b-0',
        row.unassigned && 'bg-surface-2',
      )}
    >
      <div role="rowheader" className="w-64 flex-none border-r border-line-1 px-3 py-2">
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
              {initialsOf(row)}
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
              {row.job}
            </span>
          </span>
        </div>
        <CounterStrip
          counters={counters}
          forfaitJours={row.forfaitJours}
          unassigned={row.unassigned}
          className="mt-1"
        />
      </div>

      <div className="relative grid flex-1 grid-cols-7">
        {row.absences.map((absence, position) => (
          <AbsenceBar
            key={`${absence.startDay}-${position}`}
            kind={absenceKind(absence.colorKey)}
            label={absence.label}
            duration={`${absence.span} j`}
            startDay={absence.startDay}
            span={absence.span}
            className="top-1.5"
          />
        ))}

        {days.map((day, index) => {
          const shifts = row.days[index] ?? [];
          return (
            <div
              role="gridcell"
              key={dates[index] ?? day}
              className={cx(
                'group/cell flex min-h-[var(--row-h)] flex-col gap-1 border-r border-line-1 p-1 last:border-r-0',
                index > 4 && 'bg-surface-2',
                // La bande d'absence flotte au-dessus : la case lui laisse la
                // place plutôt que de la faire recouvrir un créneau.
                row.absences.some(
                  (absence) =>
                    index >= absence.startDay &&
                    index < absence.startDay + absence.span,
                ) && 'pt-7',
              )}
            >
              {shifts.map((shift) => (
                <div key={shift.id} className="relative">
                  <ShiftChip
                    poste={shift.poste}
                    time={shift.time}
                    // Le liseré d'alerte prime sur l'état : un créneau
                    // publié mais non conforme doit se voir comme tel.
                    state={
                      flaggedShiftIds?.has(shift.id) ? 'alert' : shift.state
                    }
                    {...(shift.breakMinutes
                      ? { breakMinutes: shift.breakMinutes }
                      : {})}
                  />
                  {shiftAction?.(shift, row, index)}
                </div>
              ))}
              {cellAction?.(row, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Teinte de la bande d'absence.
 *
 * Reprend la clé de couleur du type d'absence configuré par le client, avec un
 * repli neutre : une teinte inconnue vaut mieux affichée en gris qu'absente.
 */
function absenceKind(colorKey: string): AbsenceKind {
  return isAbsenceColorKey(colorKey) ? colorKey : 'sans-solde';
}
