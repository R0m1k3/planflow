/**
 * Repérage des semaines de planning.
 *
 * Une semaine est désignée par son couple **année ISO + numéro ISO**, jamais
 * par une date de début. La raison est pratique : fin décembre, le lundi 29
 * décembre 2025 appartient à la semaine 1 de 2026. Stocker « 2025-12-29 »
 * comme clé ferait apparaître deux semaines 1 selon le point d'entrée, et la
 * contrainte d'unicité `(teamId, isoYear, isoWeek)` ne protégerait plus rien.
 *
 * Toutes les fonctions de ce module sont pures. Les instants sont calculés en
 * UTC pour la clé, et les *jours* de la grille sont produits dans le fuseau de
 * l'établissement — les deux ne coïncident pas (PLAN.md §3.3).
 */

export interface IsoWeek {
  isoYear: number;
  isoWeek: number;
}

const DAY_MS = 86_400_000;

/** Minuit UTC du jour donné, sans dépendre du fuseau de la machine. */
function utcDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Numéro de semaine ISO 8601 d'une date **civile**.
 *
 * L'algorithme est celui de la norme : on se déplace au jeudi de la semaine,
 * dont l'année donne l'année ISO, puis on compte les semaines depuis le
 * 4 janvier. Passer par le jeudi est ce qui rend le résultat correct au
 * changement d'année, où la semaine chevauche deux millésimes.
 */
export function isoWeekOf(date: Date): IsoWeek {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // getUTCDay : 0 = dimanche. En ISO, lundi = 1 et dimanche = 7.
  const dayNumber = target.getUTCDay() === 0 ? 7 : target.getUTCDay();
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);

  const isoYear = target.getUTCFullYear();
  const firstThursday = utcDay(isoYear, 1, 4);
  const firstDayNumber =
    firstThursday.getUTCDay() === 0 ? 7 : firstThursday.getUTCDay();
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstDayNumber);

  const isoWeek =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));

  return { isoYear, isoWeek };
}

/** Lundi (date civile, minuit UTC) de la semaine ISO donnée. */
export function mondayOfIsoWeek({ isoYear, isoWeek }: IsoWeek): Date {
  const jan4 = utcDay(isoYear, 1, 4);
  const dayNumber = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay();
  const week1Monday = new Date(jan4.getTime() - (dayNumber - 1) * DAY_MS);
  return new Date(week1Monday.getTime() + (isoWeek - 1) * 7 * DAY_MS);
}

/** Nombre de semaines ISO de l'année : 52, ou 53 les années longues. */
export function weeksInIsoYear(isoYear: number): number {
  return isoWeekOf(utcDay(isoYear, 12, 28)).isoWeek;
}

/** Semaine précédente, en franchissant correctement les années à 53 semaines. */
export function previousIsoWeek({ isoYear, isoWeek }: IsoWeek): IsoWeek {
  if (isoWeek > 1) return { isoYear, isoWeek: isoWeek - 1 };
  const year = isoYear - 1;
  return { isoYear: year, isoWeek: weeksInIsoYear(year) };
}

export function nextIsoWeek({ isoYear, isoWeek }: IsoWeek): IsoWeek {
  if (isoWeek < weeksInIsoYear(isoYear)) {
    return { isoYear, isoWeek: isoWeek + 1 };
  }
  return { isoYear: isoYear + 1, isoWeek: 1 };
}

/** Les sept dates civiles de la semaine, lundi → dimanche, en `YYYY-MM-DD`. */
export function weekDates(week: IsoWeek): string[] {
  const monday = mondayOfIsoWeek(week);
  return Array.from({ length: 7 }, (_, index) =>
    new Date(monday.getTime() + index * DAY_MS).toISOString().slice(0, 10),
  );
}

/**
 * Bornes absolues de la semaine dans un fuseau donné.
 *
 * Sert à charger les créneaux : `startAt >= from && startAt < to`. Les bornes
 * sont des **instants**, pas des dates civiles — la semaine du passage à
 * l'heure d'hiver dure 169 heures, celle du passage à l'heure d'été 167.
 */
export function weekBounds(
  week: IsoWeek,
  timeZone: string,
): { from: Date; to: Date } {
  const dates = weekDates(week);
  const first = dates[0];
  const monday = zonedMidnight(first ?? '1970-01-01', timeZone);
  const nextMonday = zonedMidnight(
    new Date(mondayOfIsoWeek(week).getTime() + 7 * DAY_MS)
      .toISOString()
      .slice(0, 10),
    timeZone,
  );
  return { from: monday, to: nextMonday };
}

/**
 * Instant correspondant à minuit local d'une date civile dans un fuseau.
 *
 * Il n'existe pas d'API native pour cela : on tâtonne à partir de l'UTC, en
 * mesurant le décalage réel de ce fuseau **à cet instant-là**, puis on corrige.
 * Deux passes suffisent, y compris le jour d'un changement d'heure.
 */
export function zonedMidnight(isoDate: string, timeZone: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const naive = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);

  let instant = naive;
  for (let pass = 0; pass < 2; pass += 1) {
    instant = naive - offsetAt(new Date(instant), timeZone);
  }
  return new Date(instant);
}

/** Décalage du fuseau à un instant donné, en millisecondes. */
export function offsetAt(instant: Date, timeZone: string): number {
  // `en-US` avec `hourCycle: 'h23'` évite le « 24:00 » que produit `h24` à
  // minuit, qui décalerait le calcul d'une journée entière.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Instant correspondant à une heure locale « 09:00 » d'une date civile.
 *
 * Passe par minuit local puis corrige : le jour d'un changement d'heure, le
 * décalage à 09 h n'est pas celui de minuit, et ajouter neuf heures à minuit
 * donnerait 08 h ou 10 h locales.
 */
export function zonedInstant(
  isoDate: string,
  clock: string,
  timeZone: string,
): Date {
  const [hours, minutes] = clock.split(':').map(Number);
  const midnight = zonedMidnight(isoDate, timeZone);
  const naive = new Date(
    midnight.getTime() + ((hours ?? 0) * 60 + (minutes ?? 0)) * 60_000,
  );

  const reached = offsetAt(naive, timeZone);
  const atMidnight = offsetAt(midnight, timeZone);
  return reached === atMidnight
    ? naive
    : new Date(naive.getTime() - (reached - atMidnight));
}

/** Date civile (`YYYY-MM-DD`) d'un instant, vue depuis un fuseau. */
export function zonedDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Heure locale « 09:00 » d'un instant, vue depuis un fuseau. */
export function zonedClock(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

const DAY_LABELS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

/** « Lun. 10 » — en-tête de colonne de la grille. */
export function dayHeadings(week: IsoWeek): string[] {
  return weekDates(week).map((isoDate, index) => {
    const label = DAY_LABELS[index] ?? '';
    const day = Number(isoDate.slice(8, 10));
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${day}`;
  });
}

const MONTHS = [
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

/** « Semaine 33 · 10 – 16 août 2026 ». */
export function weekLabel(week: IsoWeek): string {
  const dates = weekDates(week);
  const first = dates[0] ?? '';
  const last = dates[6] ?? '';
  const startDay = Number(first.slice(8, 10));
  const endDay = Number(last.slice(8, 10));
  const startMonth = MONTHS[Number(first.slice(5, 7)) - 1] ?? '';
  const endMonth = MONTHS[Number(last.slice(5, 7)) - 1] ?? '';
  const endYear = last.slice(0, 4);

  const span =
    startMonth === endMonth
      ? `${startDay} – ${endDay} ${endMonth} ${endYear}`
      : `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;

  return `Semaine ${week.isoWeek} · ${span}`;
}

/** Analyse « 2026-W33 » ; renvoie `null` si la forme ou les bornes sont fausses. */
export function parseWeekParam(value: string | undefined): IsoWeek | null {
  if (!value) return null;
  const match = /^(\d{4})-W(\d{1,2})$/.exec(value);
  if (!match) return null;
  const isoYear = Number(match[1]);
  const isoWeek = Number(match[2]);
  if (isoWeek < 1 || isoWeek > weeksInIsoYear(isoYear)) return null;
  return { isoYear, isoWeek };
}

export function formatWeekParam({ isoYear, isoWeek }: IsoWeek): string {
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}
