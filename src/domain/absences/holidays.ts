/**
 * Jours fériés légaux français.
 *
 * Calculés plutôt que listés : une table écrite à la main est juste l'année où
 * on l'écrit et fausse dès la suivante. Un jour férié manquant se décompte
 * comme un jour de congé — le salarié perd un jour, et personne ne le voit.
 *
 * Ne couvre pas l'Alsace-Moselle, qui compte deux jours de plus (Vendredi saint
 * et 26 décembre). Ils s'ajoutent par établissement, comme le reste : le
 * référentiel `Holiday` est porté par la `Location`, précisément pour qu'une
 * chaîne puisse ouvrir un magasin de l'autre côté de la limite.
 */

export interface FrenchHoliday {
  isoDate: string;
  name: string;
}

const DAY_MS = 86_400_000;

/**
 * Dimanche de Pâques, algorithme grégorien anonyme.
 *
 * Trois des onze jours fériés en dépendent : lundi de Pâques, Ascension et
 * lundi de Pentecôte. Se tromper de date décale trois jours dans l'année.
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shift(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Les onze jours fériés légaux d'une année, triés. */
export function frenchHolidays(year: number): FrenchHoliday[] {
  const easter = easterSunday(year);

  return [
    { isoDate: `${year}-01-01`, name: 'Jour de l’an' },
    { isoDate: iso(shift(easter, 1)), name: 'Lundi de Pâques' },
    { isoDate: `${year}-05-01`, name: 'Fête du travail' },
    { isoDate: `${year}-05-08`, name: 'Victoire 1945' },
    { isoDate: iso(shift(easter, 39)), name: 'Ascension' },
    { isoDate: iso(shift(easter, 50)), name: 'Lundi de Pentecôte' },
    { isoDate: `${year}-07-14`, name: 'Fête nationale' },
    { isoDate: `${year}-08-15`, name: 'Assomption' },
    { isoDate: `${year}-11-01`, name: 'Toussaint' },
    { isoDate: `${year}-11-11`, name: 'Armistice 1918' },
    { isoDate: `${year}-12-25`, name: 'Noël' },
  ].sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

/**
 * Le 1er mai est le seul jour férié **chômé de droit**.
 *
 * Les autres ne le sont que par convention ou usage : l'IDCC 1517 en garantit
 * trois par an, choisis par l'employeur. Le supposer pour les onze donnerait
 * des soldes de congés faux dans le sens favorable au salarié, ce qui n'est pas
 * plus acceptable que l'inverse.
 */
export function isLabourDay(isoDate: string): boolean {
  return isoDate.slice(5) === '05-01';
}
