import { describe, expect, it } from 'vitest';

import {
  computeWeekCounters,
  deltaTone,
  formatDelta,
  formatMinutes,
  shiftMinutes,
} from '@/domain/counters/week';

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

describe('formatMinutes', () => {
  it('formate en heures et minutes sur deux chiffres', () => {
    expect(formatMinutes(h(35))).toBe('35 h 00');
    expect(formatMinutes(h(8, 5))).toBe('8 h 05');
    expect(formatMinutes(0)).toBe('0 h 00');
  });

  it('utilise le signe moins typographique pour les négatifs', () => {
    expect(formatMinutes(-h(1, 30))).toBe('−1 h 30');
  });
});

describe('formatDelta', () => {
  it('distingue un écart nul d’un manque', () => {
    // « 0 h 00 » seul se lit comme une absence de donnée ; le « + » dit que le
    // contrat est atteint exactement.
    expect(formatDelta(0)).toBe('+0 h 00');
    expect(formatDelta(h(2, 55))).toBe('+2 h 55');
    expect(formatDelta(-h(0, 5))).toBe('−0 h 05');
  });
});

describe('deltaTone', () => {
  it('classe le dépassement, le manque et l’exact', () => {
    expect(deltaTone(0)).toBe('flat');
    expect(deltaTone(1)).toBe('over');
    expect(deltaTone(-1)).toBe('under');
  });
});

describe('computeWeekCounters', () => {
  it('compte les absences dans l’atteinte du contrat', () => {
    // Une semaine entière de congés ne doit pas apparaître en manque de 30 h :
    // le salarié n'a pas sous-travaillé, il était absent.
    const counters = computeWeekCounters({
      contractMinutes: h(30),
      plannedMinutes: h(12),
      absenceMinutes: h(18),
      sundaysWorked: 0,
      restDays: 5,
      compensatoryRestMinutes: 0,
    });

    expect(counters.deltaMinutes).toBe(0);
    expect(counters.deltaLabel).toBe('+0 h 00');
    expect(counters.tone).toBe('flat');
  });

  it('signale un dépassement du contrat', () => {
    const counters = computeWeekCounters({
      contractMinutes: h(35),
      plannedMinutes: h(36, 30),
      absenceMinutes: 0,
      sundaysWorked: 2,
      restDays: 2,
      compensatoryRestMinutes: 0,
    });

    expect(counters.deltaLabel).toBe('+1 h 30');
    expect(counters.tone).toBe('over');
  });

  it('signale un contrat non atteint', () => {
    const counters = computeWeekCounters({
      contractMinutes: h(35),
      plannedMinutes: h(33, 15),
      absenceMinutes: 0,
      sundaysWorked: 0,
      restDays: 2,
      compensatoryRestMinutes: 0,
    });

    expect(counters.deltaLabel).toBe('−1 h 45');
    expect(counters.tone).toBe('under');
  });
});

describe('shiftMinutes', () => {
  it('déduit la pause', () => {
    const start = new Date('2026-08-10T09:00:00+02:00');
    const end = new Date('2026-08-10T17:00:00+02:00');
    expect(shiftMinutes(start, end, 30)).toBe(h(7, 30));
  });

  it('mesure la durée réelle la nuit du passage à l’heure d’hiver', () => {
    // 25 octobre 2026, 03:00 → 02:00 : la nuit dure une heure de plus.
    // Un calcul sur l'heure murale dirait 8 h ; l'instant dit 9 h.
    const start = new Date('2026-10-24T22:00:00+02:00');
    const end = new Date('2026-10-25T06:00:00+01:00');
    expect(shiftMinutes(start, end)).toBe(h(9));
  });

  it('mesure la durée réelle la nuit du passage à l’heure d’été', () => {
    // 29 mars 2026, 02:00 → 03:00 : la nuit dure une heure de moins.
    const start = new Date('2026-03-28T22:00:00+01:00');
    const end = new Date('2026-03-29T06:00:00+02:00');
    expect(shiftMinutes(start, end)).toBe(h(7));
  });

  it('ne renvoie jamais de durée négative', () => {
    const start = new Date('2026-08-10T09:00:00+02:00');
    const end = new Date('2026-08-10T09:10:00+02:00');
    expect(shiftMinutes(start, end, 60)).toBe(0);
  });
});
