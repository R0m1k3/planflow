import type { BoardAbsence, BoardRow } from '@/domain/planning/board';

/**
 * Lecture « présent / absent / repos » d'une ligne de planning.
 *
 * Vit dans le domaine et non dans l'écran : la vue des présences, la feuille
 * imprimée et, demain, un export en tirent la même conclusion. Deux
 * implémentations de cette règle finiraient par se contredire sur le seul cas
 * qui compte — celui du salarié dont le congé a été validé après coup.
 */

export type DayState = 'present' | 'absent' | 'off';

/**
 * Absence recouvrant la colonne demandée.
 *
 * Les absences d'une ligne sont déjà découpées sur la semaine affichée :
 * `startDay` est un index de colonne, `span` un nombre de jours. Repartir des
 * dates ici referait, moins bien, un travail déjà fait — et rouvrirait la
 * question du fuseau au passage.
 */
export function absenceOnDay(
  row: BoardRow,
  dayIndex: number,
): BoardAbsence | undefined {
  return row.absences.find(
    (absence) =>
      dayIndex >= absence.startDay && dayIndex < absence.startDay + absence.span,
  );
}

/**
 * État d'un salarié un jour donné.
 *
 * **L'absence l'emporte sur le créneau.** Un congé accepté après la
 * construction du planning laisse les créneaux en base : afficher « présent »
 * enverrait un responsable chercher en rayon quelqu'un qui est chez lui. Le
 * planning a tort, pas l'absence.
 */
export function dayState(row: BoardRow, dayIndex: number): DayState {
  if (absenceOnDay(row, dayIndex)) return 'absent';
  return (row.days[dayIndex]?.length ?? 0) > 0 ? 'present' : 'off';
}

export interface DayHeadcount {
  present: number;
  absent: number;
  off: number;
}

/**
 * Effectif par jour sur un ensemble de lignes.
 *
 * Les lignes de besoins non couverts sont écartées : elles ne portent personne,
 * et les compter en « repos » gonflerait un effectif qui n'existe pas.
 */
export function headcountByDay(
  rows: BoardRow[],
  dayCount: number,
): DayHeadcount[] {
  const counted = rows.filter((row) => !row.unassigned);

  return Array.from({ length: dayCount }, (_, index) => {
    const tally: DayHeadcount = { present: 0, absent: 0, off: 0 };
    for (const row of counted) {
      tally[dayState(row, index)] += 1;
    }
    return tally;
  });
}
