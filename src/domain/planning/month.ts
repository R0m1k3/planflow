/**
 * Repérage des mois de planning.
 *
 * Le mois est la maille de la paie ; la semaine est celle du travail. Les deux
 * ne s'alignent jamais, et c'est précisément pourquoi la vue mois existe :
 * elle montre ce que la vue semaine ne peut pas montrer, à savoir un mois qui
 * commence un jeudi.
 */

export interface Month {
  year: number;
  /** 1 = janvier. */
  month: number;
}

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export function monthOf(date: Date): Month {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function daysInMonth({ year, month }: Month): number {
  // Le jour 0 du mois suivant est le dernier du mois courant : la règle
  // bissextile est celle du calendrier, pas une table à maintenir.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Les dates civiles du mois, en `YYYY-MM-DD`. */
export function monthDates(month: Month): string[] {
  return Array.from({ length: daysInMonth(month) }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return `${month.year}-${String(month.month).padStart(2, '0')}-${day}`;
  });
}

export function previousMonth({ year, month }: Month): Month {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth({ year, month }: Month): Month {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** Numéro du jour de la semaine, 1 = lundi … 7 = dimanche. */
export function isoDayOfWeek(isoDate: string): number {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function monthLabel({ year, month }: Month): string {
  return `${MONTH_NAMES[month - 1] ?? ''} ${year}`;
}

export function formatMonthParam({ year, month }: Month): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Analyse « 2026-08 » ; renvoie `null` si la forme ou les bornes sont fausses. */
export function parseMonthParam(value: string | undefined): Month | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}
