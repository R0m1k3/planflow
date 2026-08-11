import { describe, expect, it } from 'vitest';

import {
  BreakError,
  breakTotals,
  normaliseBreaks,
  totalRestMinutes,
  type BreakInput,
} from '@/domain/planning/breaks';

const SHIFT = 8 * 60;

const entry = (over: Partial<BreakInput> = {}): Partial<BreakInput> => ({
  startMinutes: null,
  durationMinutes: 20,
  isPaid: false,
  label: null,
  ...over,
});

describe('normaliseBreaks', () => {
  it('écarte les lignes vides sans échouer', () => {
    // Une ligne ajoutée puis laissée vide n'est pas une saisie : c'est un
    // formulaire en cours.
    const breaks = normaliseBreaks([entry(), {}], SHIFT);
    expect(breaks).toHaveLength(1);
  });

  it('refuse une durée nulle ou négative', () => {
    expect(() => normaliseBreaks([entry({ durationMinutes: 0 })], SHIFT)).toThrow(
      BreakError,
    );
    expect(() =>
      normaliseBreaks([entry({ durationMinutes: -10 })], SHIFT),
    ).toThrow(BreakError);
  });

  it('refuse une pause qui sort du créneau', () => {
    // Laissée passer, elle fausserait l'amplitude de la journée.
    expect(() =>
      normaliseBreaks(
        [entry({ startMinutes: SHIFT - 10, durationMinutes: 30 })],
        SHIFT,
      ),
    ).toThrow(BreakError);
  });

  it('refuse deux pauses situées qui se chevauchent', () => {
    // Elles compteraient deux fois : le salarié se verrait retirer un temps
    // qu'il n'a pris qu'une fois.
    expect(() =>
      normaliseBreaks(
        [
          entry({ startMinutes: 120, durationMinutes: 60 }),
          entry({ startMinutes: 150, durationMinutes: 30 }),
        ],
        SHIFT,
      ),
    ).toThrow(BreakError);
  });

  it('accepte deux pauses situées qui se touchent', () => {
    const breaks = normaliseBreaks(
      [
        entry({ startMinutes: 120, durationMinutes: 30 }),
        entry({ startMinutes: 150, durationMinutes: 30 }),
      ],
      SHIFT,
    );
    expect(breaks).toHaveLength(2);
  });

  it('range les pauses situées avant les autres', () => {
    const breaks = normaliseBreaks(
      [
        entry({ startMinutes: null, durationMinutes: 15 }),
        entry({ startMinutes: 240, durationMinutes: 30 }),
        entry({ startMinutes: 120, durationMinutes: 20 }),
      ],
      SHIFT,
    );
    expect(breaks.map((row) => row.startMinutes)).toEqual([120, 240, null]);
  });

  it('refuse plus de six pauses', () => {
    expect(() =>
      normaliseBreaks(Array.from({ length: 7 }, () => entry()), SHIFT),
    ).toThrow(BreakError);
  });
});

describe('breakTotals', () => {
  it('sépare le déduit du rémunéré', () => {
    // La distinction porte de l'argent : une pause payée ne se retire pas du
    // temps de travail, mais reste du repos.
    const totals = breakTotals([
      { startMinutes: null, durationMinutes: 30, isPaid: false, label: null },
      { startMinutes: null, durationMinutes: 20, isPaid: true, label: null },
    ]);

    expect(totals).toEqual({ breakMinutes: 30, paidBreakMinutes: 20 });
    expect(totalRestMinutes(totals)).toBe(50);
  });

  it('compte zéro sans pause', () => {
    expect(breakTotals([])).toEqual({ breakMinutes: 0, paidBreakMinutes: 0 });
  });
});
