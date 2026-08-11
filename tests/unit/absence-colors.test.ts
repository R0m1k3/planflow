import { describe, expect, it } from 'vitest';

import {
  ABSENCE_COLOR_KEYS,
  ABSENCE_COLORS,
  isAbsenceColorKey,
} from '@/domain/absences/colors';

describe('familles de couleur des absences', () => {
  it('n’a pas deux fois la même clé', () => {
    expect(new Set(ABSENCE_COLOR_KEYS).size).toBe(ABSENCE_COLOR_KEYS.length);
  });

  it('donne un libellé à chaque famille', () => {
    for (const color of ABSENCE_COLORS) {
      expect(color.label, `libellé manquant pour ${color.key}`).toBeTruthy();
    }
  });

  it('refuse une clé hors liste', () => {
    // La grille se replie alors sur le gris. Le contrôle sert à empêcher qu'une
    // clé fautive s'enregistre en base : elle y resterait invisible jusqu'à ce
    // qu'un planning affiche une barre grise sans qu'on sache pourquoi.
    expect(isAbsenceColorKey('neutral')).toBe(false);
    expect(isAbsenceColorKey('')).toBe(false);
    expect(isAbsenceColorKey('cp')).toBe(true);
  });
});
