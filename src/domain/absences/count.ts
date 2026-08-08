/**
 * Décompte des jours d'absence — PLAN.md §7.2.
 *
 * Trois règles gouvernent ce module, et chacune correspond à une erreur qui
 * coûte cher :
 *
 * 1. **`endDate` est le dernier jour d'absence, pas la date de reprise.** La
 *    confusion est la plus fréquente du domaine : elle décompte un jour de
 *    trop ou de trop peu à chaque demande, et le salarié s'en aperçoit au
 *    solde, des mois plus tard.
 * 2. **Un jour férié dans un congé ne se décompte pas** — et l'utilisateur n'a
 *    pas à scinder sa demande pour l'obtenir. Exiger la scission, c'est
 *    déplacer sur lui la charge d'un calcul que l'outil sait faire.
 * 3. **Les jours non travaillés ne se décomptent pas.** Un temps partiel qui
 *    ne travaille jamais le mercredi ne consomme pas de congé ce jour-là.
 */

export interface AbsenceRange {
  /** Premier jour d'absence, date civile `AAAA-MM-JJ`. */
  startDate: string;
  /** **Dernier jour d'absence**, jamais la date de reprise. */
  endDate: string;
  startHalfDay?: boolean;
  endHalfDay?: boolean;
}

export interface CountingContext {
  /** Jours fériés de l'établissement, dates civiles. */
  holidays: string[];
  /**
   * Jours de la semaine travaillés selon le rythme du contrat.
   * 1 = lundi … 7 = dimanche. Par défaut du lundi au vendredi.
   */
  workingWeekdays?: number[];
  /**
   * Décompte en jours **ouvrables** (lundi–samedi) ou **ouvrés**
   * (lundi–vendredi). Le droit du travail acquiert en ouvrables ; beaucoup
   * d'entreprises décomptent en ouvrés. Le choix est un paramètre, pas une
   * constante — se tromper fausse tous les soldes de la même façon.
   */
  basis?: 'OUVRABLES' | 'OUVRES';
}

const DEFAULT_WORKING_WEEKDAYS = [1, 2, 3, 4, 5];
const DAY_MS = 86_400_000;

/** Jour ISO de la semaine : 1 = lundi … 7 = dimanche. */
export function isoWeekday(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Les dates civiles couvertes par la période, bornes incluses. */
export function datesBetween(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (end < start) return [];

  const dates: string[] = [];
  for (let time = start; time <= end; time += DAY_MS) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }
  return dates;
}

export interface CountedDay {
  isoDate: string;
  /** 1 pour une journée pleine, 0,5 pour une demi-journée, 0 si non décompté. */
  quantity: number;
  reason: 'WORKED' | 'HOLIDAY' | 'NOT_WORKED' | 'HALF_DAY';
}

/**
 * Détaille le décompte jour par jour.
 *
 * Le détail est rendu, pas seulement le total : quand un salarié conteste son
 * solde, « 8 jours » ne se discute pas, la liste des jours retenus si.
 */
export function countAbsenceDays(
  range: AbsenceRange,
  context: CountingContext,
): { total: number; days: CountedDay[] } {
  const holidays = new Set(context.holidays);
  const basis = context.basis ?? 'OUVRABLES';
  const contractDays = new Set(
    context.workingWeekdays ?? DEFAULT_WORKING_WEEKDAYS,
  );
  // Les jours ouvrables incluent le samedi ; les ouvrés s'arrêtent au vendredi.
  const basisMax = basis === 'OUVRABLES' ? 6 : 5;

  const dates = datesBetween(range.startDate, range.endDate);
  const days: CountedDay[] = dates.map((isoDate) => {
    const weekday = isoWeekday(isoDate);

    if (holidays.has(isoDate)) {
      return { isoDate, quantity: 0, reason: 'HOLIDAY' as const };
    }
    if (weekday > basisMax || !contractDays.has(weekday)) {
      return { isoDate, quantity: 0, reason: 'NOT_WORKED' as const };
    }
    return { isoDate, quantity: 1, reason: 'WORKED' as const };
  });

  // Les demi-journées ne s'appliquent qu'aux bornes, et seulement si elles
  // sont effectivement décomptées : une demi-journée sur un jour férié ne
  // retire rien de plus.
  const first = days[0];
  const last = days[days.length - 1];

  if (range.startHalfDay && first && first.quantity === 1) {
    first.quantity = 0.5;
    first.reason = 'HALF_DAY';
  }
  if (range.endHalfDay && last && last.quantity === 1) {
    // Une absence d'un seul jour marquée demi-journée des deux côtés reste une
    // demi-journée, pas zéro.
    last.quantity = last === first ? 0.5 : 0.5;
    last.reason = 'HALF_DAY';
  }

  const total = days.reduce((sum, day) => sum + day.quantity, 0);
  return { total, days };
}

/** Total seul, quand le détail n'est pas nécessaire. */
export function absenceDayCount(
  range: AbsenceRange,
  context: CountingContext,
): number {
  return countAbsenceDays(range, context).total;
}

export interface OverlapCandidate {
  id: string;
  startDate: string;
  endDate: string;
}

/**
 * Absences acceptées qui recouvrent la période demandée.
 *
 * Bornes **inclusives des deux côtés**, parce que `endDate` est un jour
 * d'absence. Une comparaison exclusive laisserait passer deux congés qui se
 * touchent le même jour.
 */
export function findAbsenceOverlaps(
  range: Pick<AbsenceRange, 'startDate' | 'endDate'>,
  existing: OverlapCandidate[],
  ignoreId?: string,
): OverlapCandidate[] {
  return existing.filter(
    (candidate) =>
      candidate.id !== ignoreId &&
      candidate.startDate <= range.endDate &&
      candidate.endDate >= range.startDate,
  );
}

/**
 * Une demande porte-t-elle sur le passé ?
 *
 * Informatif : une régularisation a posteriori est légitime — un arrêt maladie
 * se déclare toujours après coup. C'est l'écran qui décide d'avertir, pas le
 * domaine qui interdit.
 */
export function isRetroactive(range: AbsenceRange, today: string): boolean {
  return range.startDate < today;
}

/** Le préavis conventionnel est-il respecté ? */
export function respectsNotice(
  range: AbsenceRange,
  today: string,
  minNoticeDays: number | null,
): boolean {
  if (minNoticeDays === null || minNoticeDays <= 0) return true;
  const days = datesBetween(today, range.startDate).length - 1;
  return days >= minNoticeDays;
}
