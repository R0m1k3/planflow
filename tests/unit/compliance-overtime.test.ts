import { describe, expect, it } from 'vitest';

import { IDCC_1517_PARAMETERS } from '@/domain/compliance/idcc1517';
import {
  quotaStatus,
  splitComplementary,
  splitOvertime,
} from '@/domain/compliance/overtime';

const h = (hours: number, minutes = 0) => hours * 60 + minutes;
const P = IDCC_1517_PARAMETERS;

describe('heures supplémentaires — tranches IDCC 1517', () => {
  it('ne majore rien à 35 h', () => {
    const result = splitOvertime(h(35), P);
    expect(result.baseMinutes).toBe(h(35));
    expect(result.overtimeMinutes).toBe(0);
    expect(result.slices).toHaveLength(0);
  });

  it('donne 8 h à +25 % pour 43 h', () => {
    // Critère d'acceptation de WP-05, mot pour mot.
    const result = splitOvertime(h(43), P);
    expect(result.baseMinutes).toBe(h(35));
    expect(result.slices).toEqual([
      { fromMinutes: h(35), toMinutes: h(43), ratePercent: 25, minutes: h(8) },
    ]);
  });

  it('donne 8 h à +25 % et 2 h à +50 % pour 45 h', () => {
    const result = splitOvertime(h(45), P);
    expect(result.slices).toEqual([
      { fromMinutes: h(35), toMinutes: h(43), ratePercent: 25, minutes: h(8) },
      { fromMinutes: h(43), toMinutes: null, ratePercent: 50, minutes: h(2) },
    ]);
    expect(result.overtimeMinutes).toBe(h(10));
  });

  it('bascule à la minute près', () => {
    const justUnder = splitOvertime(h(43), P);
    expect(justUnder.slices).toHaveLength(1);

    const justOver = splitOvertime(h(43, 1), P);
    expect(justOver.slices).toHaveLength(2);
    expect(justOver.slices[1]?.minutes).toBe(1);
  });

  it('conserve le total', () => {
    for (const minutes of [0, h(20), h(35), h(36), h(43), h(48), h(60)]) {
      const result = splitOvertime(minutes, P);
      expect(result.baseMinutes + result.overtimeMinutes).toBe(minutes);
    }
  });

  it('suit les tranches d’un autre jeu de paramètres', () => {
    // Les taux légaux de droit commun sont 25 % puis 50 % à la 44ᵉ heure ;
    // une convention peut dire autre chose. Rien n'est écrit dans le code.
    const alternative = {
      ...P,
      overtime: {
        ...P.overtime,
        tiers: [
          { fromMinutes: h(35), toMinutes: h(39), ratePercent: 10 },
          { fromMinutes: h(39), toMinutes: null, ratePercent: 20 },
        ],
      },
    };
    const result = splitOvertime(h(45), alternative);
    expect(result.slices.map((slice) => [slice.ratePercent, slice.minutes])).toEqual(
      [
        [10, h(4)],
        [20, h(6)],
      ],
    );
  });
});

describe('heures complémentaires — temps partiel', () => {
  const contract = h(24);

  it('ne compte rien à la durée contractuelle', () => {
    const result = splitComplementary(contract, contract, P);
    expect(result.totalMinutes).toBe(0);
    expect(result.firstTierMinutes).toBe(0);
  });

  it('majore de 10 % jusqu’au dixième de la durée contractuelle', () => {
    // Un dixième de 24 h = 2 h 24.
    const result = splitComplementary(contract + h(2, 24), contract, P);
    expect(result.firstTierMinutes).toBe(h(2, 24));
    expect(result.beyondMinutes).toBe(0);
    expect(result.firstTierRatePercent).toBe(10);
  });

  it('majore de 25 % au-delà du dixième', () => {
    const result = splitComplementary(contract + h(4), contract, P);
    expect(result.firstTierMinutes).toBe(h(2, 24));
    expect(result.beyondMinutes).toBe(h(1, 36));
    expect(result.beyondRatePercent).toBe(25);
  });

  it('isole le dépassement du tiers', () => {
    // Au-delà du tiers, ce n'est plus une question de taux mais de
    // requalification du contrat : la conséquence est juridique.
    const result = splitComplementary(contract + h(10), contract, P);
    expect(result.overCapMinutes).toBe(h(2));
    expect(
      result.firstTierMinutes + result.beyondMinutes + result.overCapMinutes,
    ).toBe(result.totalMinutes);
  });

  it('ne compte pas d’heures complémentaires en négatif', () => {
    const result = splitComplementary(h(20), contract, P);
    expect(result.totalMinutes).toBe(0);
    expect(result.overCapMinutes).toBe(0);
  });
});

describe('contingent annuel', () => {
  it('décompte ce qui reste', () => {
    const status = quotaStatus(h(100), P);
    expect(status.remainingMinutes).toBe(h(80));
    expect(status.exceededMinutes).toBe(0);
  });

  it('ouvre la contrepartie en repos au-delà', () => {
    // Le dépassement n'interdit pas l'heure : il la rend plus chère et crée
    // un droit à repos.
    const status = quotaStatus(h(190), P);
    expect(status.exceededMinutes).toBe(h(10));
    expect(status.restPercent).toBe(100);
  });

  it('accepte le contingent exact', () => {
    const status = quotaStatus(h(180), P);
    expect(status.remainingMinutes).toBe(0);
    expect(status.exceededMinutes).toBe(0);
  });
});
