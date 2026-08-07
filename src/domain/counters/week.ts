/**
 * Compteurs hebdomadaires d'un salarié.
 *
 * PLAN.md §7.4 : une seule implémentation alimente la grille, le rapport
 * d'heures et l'export de paie. Trois calculs qui divergent sont la première
 * cause d'écart entre un planning et un bulletin — et l'écart ne se voit qu'au
 * moment où le comptable le réclame.
 *
 * Les durées sont manipulées en **minutes entières**. Les heures décimales
 * accumulent des erreurs d'arrondi qui finissent par déplacer un compteur d'une
 * minute, ce qui est invisible à l'écran et faux en paie.
 */

export interface WeekCounters {
  /** Durée contractuelle hebdomadaire, en minutes. */
  contractMinutes: number;
  /** Somme des créneaux planifiés, pauses déduites. */
  plannedMinutes: number;
  /** Durée couverte par des absences. */
  absenceMinutes: number;
  /** Nombre de dimanches travaillés dans la semaine. */
  sundaysWorked: number;
  /** Jours de repos dans la semaine. */
  restDays: number;
}

export interface WeekCountersView extends WeekCounters {
  /** Planifié + absences − contrat. Signé. */
  deltaMinutes: number;
  contractLabel: string;
  plannedLabel: string;
  absenceLabel: string;
  deltaLabel: string;
  tone: DeltaTone;
}

export type DeltaTone = 'flat' | 'over' | 'under' | 'none';

/**
 * Un salarié au forfait jours n'a pas de durée hebdomadaire : le comparer à un
 * contrat en heures produirait un écart qui n'a aucun sens (PLAN.md §6.4).
 */
export const FORFAIT_JOURS = Symbol('forfait-jours');

export function formatMinutes(total: number): string {
  const sign = total < 0 ? '−' : '';
  const abs = Math.abs(total);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `${sign}${hours} h ${String(minutes).padStart(2, '0')}`;
}

/** Écart signé : le « + » explicite évite de confondre 0 h 00 et un manque. */
export function formatDelta(total: number): string {
  if (total === 0) return '+0 h 00';
  return total > 0 ? `+${formatMinutes(total)}` : formatMinutes(total);
}

export function deltaTone(deltaMinutes: number): DeltaTone {
  if (deltaMinutes === 0) return 'flat';
  return deltaMinutes > 0 ? 'over' : 'under';
}

export function computeWeekCounters(input: WeekCounters): WeekCountersView {
  // Les absences comptent dans l'atteinte du contrat : un salarié en congés une
  // semaine entière ne doit pas apparaître en sous-réalisation de 35 h.
  const deltaMinutes =
    input.plannedMinutes + input.absenceMinutes - input.contractMinutes;

  return {
    ...input,
    deltaMinutes,
    contractLabel: formatMinutes(input.contractMinutes),
    plannedLabel: formatMinutes(input.plannedMinutes),
    absenceLabel: formatMinutes(input.absenceMinutes),
    deltaLabel: formatDelta(deltaMinutes),
    tone: deltaTone(deltaMinutes),
  };
}

/** Durée d'un créneau, pauses déduites, à partir de deux instants. */
export function shiftMinutes(
  start: Date,
  end: Date,
  breakMinutes = 0,
): number {
  // Calcul depuis les instants, jamais depuis l'heure murale : la nuit du
  // changement d'heure, 22 h–06 h dure 7 h ou 9 h, jamais 8 h (PLAN.md §3.3).
  const elapsed = Math.round((end.getTime() - start.getTime()) / 60_000);
  return Math.max(0, elapsed - breakMinutes);
}
