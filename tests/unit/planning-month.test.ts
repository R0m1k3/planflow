import { describe, expect, it } from 'vitest';

import {
  daysInMonth,
  formatMonthParam,
  isoDayOfWeek,
  monthDates,
  monthLabel,
  monthOf,
  nextMonth,
  parseMonthParam,
  previousMonth,
} from '@/domain/planning/month';

describe('daysInMonth', () => {
  it('suit le calendrier, y compris les années bissextiles', () => {
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 4 })).toBe(30);
    expect(daysInMonth({ year: 2026, month: 12 })).toBe(31);
  });

  it('traite 2100 comme non bissextile', () => {
    // Divisible par 4 mais pas par 400 : le piège classique d'une table écrite
    // à la main.
    expect(daysInMonth({ year: 2100, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2000, month: 2 })).toBe(29);
  });
});

describe('monthDates', () => {
  it('énumère le mois entier', () => {
    const dates = monthDates({ year: 2026, month: 2 });
    expect(dates).toHaveLength(28);
    expect(dates[0]).toBe('2026-02-01');
    expect(dates[27]).toBe('2026-02-28');
  });
});

describe('navigation', () => {
  it('franchit l’année dans les deux sens', () => {
    expect(previousMonth({ year: 2026, month: 1 })).toEqual({
      year: 2025,
      month: 12,
    });
    expect(nextMonth({ year: 2026, month: 12 })).toEqual({
      year: 2027,
      month: 1,
    });
  });
});

describe('isoDayOfWeek', () => {
  it('numérote lundi 1 et dimanche 7', () => {
    // Le samedi et le dimanche portent un fond distinct dans la vue mois :
    // une erreur de numérotation les décalerait d'un jour toute l'année.
    expect(isoDayOfWeek('2026-08-10')).toBe(1);
    expect(isoDayOfWeek('2026-08-15')).toBe(6);
    expect(isoDayOfWeek('2026-08-16')).toBe(7);
  });
});

describe('paramètre d’URL', () => {
  it('fait un aller-retour', () => {
    const month = { year: 2026, month: 8 };
    expect(formatMonthParam(month)).toBe('2026-08');
    expect(parseMonthParam('2026-08')).toEqual(month);
  });

  it('rejette ce qui n’est pas un mois', () => {
    expect(parseMonthParam('2026-13')).toBeNull();
    expect(parseMonthParam('2026-00')).toBeNull();
    expect(parseMonthParam('août')).toBeNull();
    expect(parseMonthParam(undefined)).toBeNull();
  });
});

describe('libellés', () => {
  it('nomme le mois en français', () => {
    expect(monthLabel({ year: 2026, month: 8 })).toBe('août 2026');
  });

  it('déduit le mois d’une date', () => {
    expect(monthOf(new Date('2026-08-12T00:00:00Z'))).toEqual({
      year: 2026,
      month: 8,
    });
  });
});
