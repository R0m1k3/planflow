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
): { rows: BoardRow[]; unassignedRow: BoardRow | null } {
  const columnOf = new Map(weekDates.map((date, index) => [date, index]));

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

  const rows = people.map((person) => {
    const days = byMember.get(person.membershipId) ?? emptyDays();
    const worked = days.filter((column) => column.length > 0).length;
    return {
      membershipId: person.membershipId,
      firstName: person.firstName,
      lastName: person.lastName,
      job: person.job,
      forfaitJours: person.forfaitJours,
      unassigned: false,
      days,
      counters: {
        contractMinutes: person.forfaitJours ? 0 : person.contractMinutes,
        plannedMinutes: minutesByMember.get(person.membershipId) ?? 0,
        // Les absences arrivent au lot suivant ; le compteur existe déjà pour
        // que la formule d'écart ne change pas quand elles se brancheront.
        absenceMinutes: 0,
        sundaysWorked: sundaysByMember.get(person.membershipId)?.size ?? 0,
        restDays: 7 - worked,
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
        counters: {
          contractMinutes: 0,
          plannedMinutes: unassignedDays
            .flat()
            .reduce((total, shift) => total + shift.minutes, 0),
          absenceMinutes: 0,
          sundaysWorked: 0,
          restDays: 0,
        },
      }
    : null;

  return { rows, unassignedRow };
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
