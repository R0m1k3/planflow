import { describe, expect, it } from 'vitest';

import {
  dayHeadings,
  formatWeekParam,
  isoWeekOf,
  mondayOfIsoWeek,
  nextIsoWeek,
  offsetAt,
  parseWeekParam,
  previousIsoWeek,
  weekBounds,
  weekDates,
  weekLabel,
  weeksInIsoYear,
  zonedClock,
  zonedDate,
  zonedMidnight,
} from '@/domain/planning/week';

const utc = (iso: string) => new Date(iso);

describe('isoWeekOf', () => {
  it('numérote une semaine ordinaire', () => {
    expect(isoWeekOf(utc('2026-08-12T00:00:00Z'))).toEqual({
      isoYear: 2026,
      isoWeek: 33,
    });
  });

  it('rattache le 1ᵉʳ janvier à l’année ISO précédente quand la norme l’exige', () => {
    // 1ᵉʳ janvier 2027 est un vendredi : il appartient à la semaine 53 de 2026.
    expect(isoWeekOf(utc('2027-01-01T00:00:00Z'))).toEqual({
      isoYear: 2026,
      isoWeek: 53,
    });
  });

  it('rattache fin décembre à l’année ISO suivante quand la norme l’exige', () => {
    // 29 décembre 2025 est un lundi : semaine 1 de 2026.
    expect(isoWeekOf(utc('2025-12-29T00:00:00Z'))).toEqual({
      isoYear: 2026,
      isoWeek: 1,
    });
  });

  it('reconnaît les années à 53 semaines', () => {
    expect(weeksInIsoYear(2026)).toBe(53);
    expect(weeksInIsoYear(2025)).toBe(52);
  });
});

describe('mondayOfIsoWeek', () => {
  it('est l’inverse de isoWeekOf', () => {
    for (let week = 1; week <= 52; week += 1) {
      const monday = mondayOfIsoWeek({ isoYear: 2026, isoWeek: week });
      expect(monday.getUTCDay()).toBe(1);
      expect(isoWeekOf(monday)).toEqual({ isoYear: 2026, isoWeek: week });
    }
  });

  it('place la semaine 1 de 2026 au 29 décembre 2025', () => {
    expect(
      mondayOfIsoWeek({ isoYear: 2026, isoWeek: 1 }).toISOString().slice(0, 10),
    ).toBe('2025-12-29');
  });
});

describe('navigation de semaine', () => {
  it('recule sur l’année précédente en respectant sa longueur', () => {
    // 2026 compte 53 semaines : reculer depuis la 1 de 2027 doit donner 53,
    // pas 52. Une erreur ici fait disparaître une semaine de planning par an.
    expect(previousIsoWeek({ isoYear: 2027, isoWeek: 1 })).toEqual({
      isoYear: 2026,
      isoWeek: 53,
    });
    expect(previousIsoWeek({ isoYear: 2026, isoWeek: 1 })).toEqual({
      isoYear: 2025,
      isoWeek: 52,
    });
  });

  it('avance au-delà de la dernière semaine', () => {
    expect(nextIsoWeek({ isoYear: 2026, isoWeek: 53 })).toEqual({
      isoYear: 2027,
      isoWeek: 1,
    });
    expect(nextIsoWeek({ isoYear: 2025, isoWeek: 52 })).toEqual({
      isoYear: 2026,
      isoWeek: 1,
    });
  });

  it('fait un aller-retour sans dérive sur toute une année', () => {
    let week = { isoYear: 2026, isoWeek: 1 };
    for (let step = 0; step < 60; step += 1) week = nextIsoWeek(week);
    for (let step = 0; step < 60; step += 1) week = previousIsoWeek(week);
    expect(week).toEqual({ isoYear: 2026, isoWeek: 1 });
  });
});

describe('weekDates', () => {
  it('donne sept jours consécutifs du lundi au dimanche', () => {
    expect(weekDates({ isoYear: 2026, isoWeek: 33 })).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
    ]);
  });
});

describe('fuseau horaire', () => {
  it('mesure le décalage de Paris en hiver et en été', () => {
    expect(offsetAt(utc('2026-01-15T12:00:00Z'), 'Europe/Paris')).toBe(
      3_600_000,
    );
    expect(offsetAt(utc('2026-07-15T12:00:00Z'), 'Europe/Paris')).toBe(
      7_200_000,
    );
  });

  it('place minuit local au bon instant absolu', () => {
    expect(zonedMidnight('2026-08-10', 'Europe/Paris').toISOString()).toBe(
      '2026-08-09T22:00:00.000Z',
    );
    expect(zonedMidnight('2026-01-05', 'Europe/Paris').toISOString()).toBe(
      '2026-01-04T23:00:00.000Z',
    );
  });

  it('tient au jour même du changement d’heure', () => {
    // 25 octobre 2026 : retour à l'heure d'hiver. Minuit local est encore en
    // UTC+2 ; une seule passe de correction donnerait une heure de trop.
    expect(zonedMidnight('2026-10-25', 'Europe/Paris').toISOString()).toBe(
      '2026-10-24T22:00:00.000Z',
    );
    expect(zonedMidnight('2026-03-29', 'Europe/Paris').toISOString()).toBe(
      '2026-03-28T23:00:00.000Z',
    );
  });

  it('mesure une semaine de changement d’heure à sa vraie durée', () => {
    // La semaine du passage à l'heure d'hiver dure 169 h, pas 168. Un calcul
    // en heures murales la croirait normale et fausserait tout compteur qui
    // s'appuierait sur ses bornes.
    const autumn = weekBounds({ isoYear: 2026, isoWeek: 43 }, 'Europe/Paris');
    expect((autumn.to.getTime() - autumn.from.getTime()) / 3_600_000).toBe(169);

    const spring = weekBounds({ isoYear: 2026, isoWeek: 13 }, 'Europe/Paris');
    expect((spring.to.getTime() - spring.from.getTime()) / 3_600_000).toBe(167);
  });

  it('restitue la date et l’heure locales d’un instant', () => {
    // 22 h UTC le 9 août, c'est déjà le 10 août à Paris : le créneau de lundi
    // matin doit se ranger dans la colonne du lundi.
    const instant = utc('2026-08-09T22:00:00Z');
    expect(zonedDate(instant, 'Europe/Paris')).toBe('2026-08-10');
    expect(zonedClock(instant, 'Europe/Paris')).toBe('00:00');
    expect(zonedClock(utc('2026-08-10T07:30:00Z'), 'Europe/Paris')).toBe(
      '09:30',
    );
  });
});

describe('libellés', () => {
  it('compose les en-têtes de colonnes', () => {
    expect(dayHeadings({ isoYear: 2026, isoWeek: 33 })).toEqual([
      'Lun. 10',
      'Mar. 11',
      'Mer. 12',
      'Jeu. 13',
      'Ven. 14',
      'Sam. 15',
      'Dim. 16',
    ]);
  });

  it('compose le libellé de semaine', () => {
    expect(weekLabel({ isoYear: 2026, isoWeek: 33 })).toBe(
      'Semaine 33 · 10 – 16 août 2026',
    );
  });

  it('nomme les deux mois quand la semaine est à cheval', () => {
    expect(weekLabel({ isoYear: 2026, isoWeek: 31 })).toBe(
      'Semaine 31 · 27 juillet – 2 août 2026',
    );
  });
});

describe('paramètre d’URL', () => {
  it('fait un aller-retour', () => {
    const week = { isoYear: 2026, isoWeek: 7 };
    expect(parseWeekParam(formatWeekParam(week))).toEqual(week);
    expect(formatWeekParam(week)).toBe('2026-W07');
  });

  it('rejette ce qui n’est pas une semaine', () => {
    // Le paramètre vient de l'URL : il est fourni par le visiteur, donc
    // toujours suspect. Une semaine 54 ne doit pas atteindre la base.
    expect(parseWeekParam('2026-W54')).toBeNull();
    expect(parseWeekParam('2026-W00')).toBeNull();
    expect(parseWeekParam('août')).toBeNull();
    expect(parseWeekParam(undefined)).toBeNull();
  });

  it('accepte la 53ᵉ semaine d’une année longue', () => {
    expect(parseWeekParam('2026-W53')).toEqual({ isoYear: 2026, isoWeek: 53 });
    expect(parseWeekParam('2025-W53')).toBeNull();
  });
});
