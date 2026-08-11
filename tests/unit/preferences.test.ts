import { describe, expect, it } from 'vitest';

import {
  minutesToTime,
  PREFERENCE_KEYS,
  PREFERENCE_TOGGLES,
  timeToMinutes,
  togglesOf,
} from '@/domain/settings/preferences';

describe('catalogue de préférences', () => {
  it('n’a pas deux fois la même clé', () => {
    expect(new Set(PREFERENCE_KEYS).size).toBe(PREFERENCE_KEYS.length);
  });

  it('range chaque préférence dans un seul groupe', () => {
    const grouped = [
      ...togglesOf('planning'),
      ...togglesOf('rights'),
      ...togglesOf('payroll'),
    ];
    expect(grouped).toHaveLength(PREFERENCE_TOGGLES.length);
  });

  it('avertit sur les réglages qui changent un calcul', () => {
    // Un interrupteur qui déplace des heures entre normales et majorées ne doit
    // pas se présenter comme un réglage d'affichage.
    for (const key of [
      'smoothOvertimeMonthly',
      'includeRestInNormalHours',
      'paidBreaks',
    ]) {
      const toggle = PREFERENCE_TOGGLES.find((entry) => entry.key === key);
      expect(toggle?.warning, `${key} sans avertissement`).toBeTruthy();
    }
  });
});

describe('heure de bascule du soir', () => {
  it('convertit dans les deux sens', () => {
    expect(minutesToTime(1200)).toBe('20:00');
    expect(timeToMinutes('20:00')).toBe(1200);
    expect(minutesToTime(0)).toBe('00:00');
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('refuse une heure invalide plutôt que de la ramener à zéro', () => {
    // Silencieusement ramenée à minuit, une saisie fautive ferait passer tous
    // les créneaux pour des créneaux du soir.
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('20:60')).toBeNull();
    expect(timeToMinutes('8:00')).toBeNull();
    expect(timeToMinutes('')).toBeNull();
  });
});
