/**
 * Mise en forme de la grille hebdomadaire.
 *
 * Volontairement séparé de l'accès aux données : ranger sept jours de créneaux
 * en colonnes est la partie où l'on se trompe (fuseau, semaine à cheval,
 * créneau de nuit), et elle se teste sans base.
 */

import type { ShiftState } from '@/components/planning/ShiftChip';
import type { WeekCounters } from '@/domain/counters/week';
import { shiftMinutes } from '@/domain/counters/week';
import { zonedClock, zonedDate } from '@/domain/planning/week';
import type { PosteCode } from '@/lib/design/postes';

export interface BoardShiftInput {
  id: string;
  membershipId: string | null;
  startAt: Date;
  endAt: Date;
  breakMinutes: number;
  poste: PosteCode;
  isValidated: boolean;
  note: string | null;
}

export interface BoardShift {
  id: string;
  poste: PosteCode;
  /** « 09:00–17:00 », en heure locale de l'établissement. */
  time: string;
  minutes: number;
  breakMinutes: number;
  state: ShiftState;
  note: string | null;
}

export interface BoardAbsence {
  label: string;
  colorKey: string;
  /** Index de colonne du premier jour visible, 0 = lundi. */
  startDay: number;
  /** Nombre de jours couverts dans la semaine affichée. */
  span: number;
}

export interface BoardRow {
  /** `null` sur la ligne des besoins non couverts. */
  membershipId: string | null;
  firstName: string;
  lastName: string;
  job: string;
  forfaitJours: boolean;
  counters: WeekCounters;
  /** Sept cases, lundi → dimanche. */
  days: BoardShift[][];
  /** Absences acceptées recouvrant la semaine affichée. */
  absences: BoardAbsence[];
  unassigned: boolean;
}

export interface RowPerson {
  membershipId: string;
  firstName: string;
  lastName: string;
  job: string;
  forfaitJours: boolean;
  contractMinutes: number;
}

export interface AbsenceInput {
  membershipId: string;
  startDate: string;
  /** Dernier jour d'absence, pas la date de reprise. */
  endDate: string;
  label: string;
  colorKey: string;
}

/**
 * Repos posé sur la semaine.
 *
 * Seul le repos **compensateur** alimente le compteur RC : le repos
 * hebdomadaire est un droit déjà pris, tandis que le compensateur est une
 * contrepartie due, et le bandeau doit dire laquelle des deux est en jeu.
 */
export interface RestInput {
  membershipId: string;
  restType: 'WEEKLY_REST' | 'COMPENSATORY_REST';
  minutes: number | null;
}

/**
 * Range les créneaux d'une semaine en lignes × sept colonnes.
 *
 * Le jour de rattachement se déduit de `startAt` **vu depuis le fuseau de
 * l'établissement**, pas de la colonne `localDate` : celle-ci est un cache de
 * regroupement, et un créneau déplacé sans la mettre à jour se rangerait au
 * mauvais endroit. Ici, les deux ne peuvent pas diverger.
 */
export function buildRows(
  people: RowPerson[],
  shifts: BoardShiftInput[],
  weekDates: string[],
  timeZone: string,
  isPublished: boolean,
  absences: AbsenceInput[] = [],
  rests: RestInput[] = [],
): { rows: BoardRow[]; unassignedRow: BoardRow | null } {
  const columnOf = new Map(weekDates.map((date, index) => [date, index]));

  const compensatoryByMember = new Map<string, number>();
  for (const rest of rests) {
    if (rest.restType !== 'COMPENSATORY_REST') continue;
    compensatoryByMember.set(
      rest.membershipId,
      (compensatoryByMember.get(rest.membershipId) ?? 0) + (rest.minutes ?? 0),
    );
  }

  const emptyDays = (): BoardShift[][] =>
    Array.from({ length: 7 }, () => [] as BoardShift[]);

  const byMember = new Map<string, BoardShift[][]>();
  const minutesByMember = new Map<string, number>();
  const sundaysByMember = new Map<string, Set<number>>();
  const unassignedDays = emptyDays();
  let hasUnassigned = false;

  for (const shift of shifts) {
    const column = columnOf.get(zonedDate(shift.startAt, timeZone));
    // Un créneau hors des sept jours ne peut pas s'afficher : le taire vaut
    // mieux que de l'écraser sur lundi, où il fausserait le compteur.
    if (column === undefined) continue;

    const minutes = shiftMinutes(shift.startAt, shift.endAt, shift.breakMinutes);
    const view: BoardShift = {
      id: shift.id,
      poste: shift.poste,
      time: `${zonedClock(shift.startAt, timeZone)}–${zonedClock(shift.endAt, timeZone)}`,
      minutes,
      breakMinutes: shift.breakMinutes,
      state: shiftState(shift.isValidated, isPublished, shift.membershipId),
      note: shift.note,
    };

    if (!shift.membershipId) {
      unassignedDays[column]?.push(view);
      hasUnassigned = true;
      continue;
    }

    let days = byMember.get(shift.membershipId);
    if (!days) {
      days = emptyDays();
      byMember.set(shift.membershipId, days);
    }
    days[column]?.push(view);
    minutesByMember.set(
      shift.membershipId,
      (minutesByMember.get(shift.membershipId) ?? 0) + minutes,
    );
    if (column === 6) {
      const sundays =
        sundaysByMember.get(shift.membershipId) ?? new Set<number>();
      sundays.add(column);
      sundaysByMember.set(shift.membershipId, sundays);
    }
  }

  for (const days of byMember.values()) {
    for (const column of days) column.sort(byStartTime);
  }
  for (const column of unassignedDays) column.sort(byStartTime);

  const first = weekDates[0] ?? '';
  const last = weekDates[6] ?? '';

  const rows = people.map((person) => {
    const days = byMember.get(person.membershipId) ?? emptyDays();
    const worked = days.filter((column) => column.length > 0).length;

    // L'absence est **rognée** aux bornes de la semaine affichée : une absence
    // de trois semaines doit apparaître entière sur chacune, pas déborder.
    const rowAbsences = absences
      .filter(
        (absence) =>
          absence.membershipId === person.membershipId &&
          absence.startDate <= last &&
          absence.endDate >= first,
      )
      .map((absence) => {
        const startDay = Math.max(0, weekDates.indexOf(absence.startDate));
        const endIndex = weekDates.indexOf(absence.endDate);
        const endDay = endIndex === -1 ? 6 : endIndex;
        return {
          label: absence.label,
          colorKey: absence.colorKey,
          startDay: absence.startDate < first ? 0 : startDay,
          span: endDay - (absence.startDate < first ? 0 : startDay) + 1,
        };
      });

    return {
      membershipId: person.membershipId,
      firstName: person.firstName,
      lastName: person.lastName,
      job: person.job,
      forfaitJours: person.forfaitJours,
      unassigned: false,
      days,
      absences: rowAbsences,
      counters: {
        contractMinutes: person.forfaitJours ? 0 : person.contractMinutes,
        plannedMinutes: minutesByMember.get(person.membershipId) ?? 0,
        // Les absences comptent dans l'atteinte du contrat : une semaine
        // entièrement en congés ne doit pas apparaître en sous-réalisation.
        // Leur valorisation en minutes vient du contrat, pas du planning.
        absenceMinutes: absenceMinutesOf(
          rowAbsences,
          person.contractMinutes,
          person.forfaitJours,
        ),
        sundaysWorked: sundaysByMember.get(person.membershipId)?.size ?? 0,
        restDays: 7 - worked,
        compensatoryRestMinutes:
          compensatoryByMember.get(person.membershipId) ?? 0,
      },
    } satisfies BoardRow;
  });

  const unassignedRow: BoardRow | null = hasUnassigned
    ? {
        membershipId: null,
        firstName: 'Non',
        lastName: 'assigné',
        job: 'Besoins à couvrir',
        forfaitJours: false,
        unassigned: true,
        days: unassignedDays,
        absences: [],
        counters: {
          contractMinutes: 0,
          plannedMinutes: unassignedDays
            .flat()
            .reduce((total, shift) => total + shift.minutes, 0),
          absenceMinutes: 0,
          sundaysWorked: 0,
          restDays: 0,
          compensatoryRestMinutes: 0,
        },
      }
    : null;

  return { rows, unassignedRow };
}

/**
 * Durée créditée par une absence, en minutes.
 *
 * Proportionnelle au contrat sur une base de cinq jours ouvrés : un salarié à
 * 35 h absent trois jours est crédité de 21 h. Le calcul reste ici, dans la
 * mise en forme, parce qu'il ne sert qu'à l'écart affiché — la paie, elle, part
 * du décompte en jours figé à la décision.
 */
function absenceMinutesOf(
  absences: BoardAbsence[],
  contractMinutes: number,
  forfaitJours: boolean,
): number {
  if (forfaitJours || contractMinutes <= 0) return 0;
  const days = absences.reduce((total, absence) => total + absence.span, 0);
  return Math.round((contractMinutes / 5) * Math.min(days, 5));
}

function byStartTime(a: BoardShift, b: BoardShift): number {
  return a.time.localeCompare(b.time);
}

/**
 * État visuel d'un créneau.
 *
 * L'ordre des tests compte : un besoin non couvert reste affiché en fantôme
 * même sur une semaine publiée, sinon il se confondrait avec un créneau réel.
 */
export function shiftState(
  isValidated: boolean,
  isPublished: boolean,
  membershipId: string | null,
): ShiftState {
  if (!membershipId) return 'unassigned';
  if (isValidated) return 'validated';
  return isPublished ? 'published' : 'draft';
}

export function initialsOf(row: BoardRow): string {
  return `${row.firstName.charAt(0)}${row.lastName.charAt(0)}`.toUpperCase();
}

export function displayName(row: BoardRow): string {
  return `${row.firstName} ${row.lastName}`;
}
