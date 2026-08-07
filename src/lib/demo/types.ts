import type { AbsenceKind } from '@/components/planning/AbsenceBar';
import type { ShiftState } from '@/components/planning/ShiftChip';
import type { WeekCounters } from '@/domain/counters/week';
import type { PosteCode } from '@/lib/design/postes';

export interface DemoShift {
  poste: PosteCode;
  /** Début et fin en minutes depuis minuit, jour local. */
  start: number;
  end: number;
  breakMinutes?: number;
  state?: ShiftState;
  delta?: string;
  alert?: string;
}

export interface DemoAbsence {
  kind: AbsenceKind;
  label: string;
  /** 0 = lundi. */
  startDay: number;
  span: number;
}

export interface DemoEmployee {
  id: string;
  firstName: string;
  lastName: string;
  job: string;
  poste: PosteCode;
  contract: string;
  since: string;
  status: 'actif' | 'essai' | 'sortie';
  forfaitJours?: boolean;
}

export interface DemoWeekRow {
  employee: DemoEmployee;
  counters: WeekCounters;
  /** Sept entrées, lundi → dimanche. */
  days: DemoShift[][];
  absence?: DemoAbsence;
  unassigned?: boolean;
}

export function fullName(employee: DemoEmployee): string {
  return `${employee.firstName} ${employee.lastName}`;
}

export function initials(employee: DemoEmployee): string {
  return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`;
}

/** « 09:00 » depuis des minutes après minuit. */
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeRange(shift: DemoShift): string {
  return `${clock(shift.start)}–${clock(shift.end)}`;
}
