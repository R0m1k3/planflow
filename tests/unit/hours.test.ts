import { describe, expect, it } from 'vitest';

import {
  actualMinutesOf,
  describeCorrection,
  fallsInLockedPeriod,
  hoursView,
  isExportStale,
  plannedMinutesOf,
  sumHours,
  type ShiftHours,
} from '@/domain/hours/states';
import { zonedInstant } from '@/domain/planning/week';

const TZ = 'Europe/Paris';

function shift(over: Partial<ShiftHours> = {}): ShiftHours {
  return {
    startAt: zonedInstant('2026-08-10', '09:00', TZ),
    endAt: zonedInstant('2026-08-10', '17:00', TZ),
    breakMinutes: 60,
    actualStartAt: null,
    actualEndAt: null,
    actualBreakMinutes: null,
    isValidated: false,
    ...over,
  };
}

describe('sans heures réelles, le prévu fait foi', () => {
  it('reprend le prévu quand rien n’est saisi', () => {
    // Attendre une saisie qui ne viendra pas ne produirait aucune paie.
    const view = hoursView(shift());
    expect(view.plannedMinutes).toBe(7 * 60);
    expect(view.actualMinutes).toBe(7 * 60);
    expect(view.deltaMinutes).toBe(0);
    expect(view.hasActual).toBe(false);
  });

  it('ignore une saisie incomplète', () => {
    // Un début sans fin produirait une durée fantaisiste : le prévu reste la
    // meilleure information disponible.
    const partial = shift({
      actualStartAt: zonedInstant('2026-08-10', '08:30', TZ),
    });
    expect(actualMinutesOf(partial)).toBeNull();
    expect(hoursView(partial).actualMinutes).toBe(7 * 60);
  });

  it('prend le réalisé dès qu’il est complet', () => {
    const done = shift({
      actualStartAt: zonedInstant('2026-08-10', '08:30', TZ),
      actualEndAt: zonedInstant('2026-08-10', '18:00', TZ),
    });
    const view = hoursView(done);
    expect(view.actualMinutes).toBe(8 * 60 + 30);
    expect(view.deltaMinutes).toBe(90);
    expect(view.hasActual).toBe(true);
  });

  it('utilise la pause réelle quand elle est saisie', () => {
    const done = shift({
      actualStartAt: zonedInstant('2026-08-10', '09:00', TZ),
      actualEndAt: zonedInstant('2026-08-10', '17:00', TZ),
      actualBreakMinutes: 30,
    });
    expect(hoursView(done).actualMinutes).toBe(7 * 60 + 30);
  });
});

describe('le paiement ne dépend jamais de la validation', () => {
  it('paie des heures non validées', () => {
    // Bloquer le paiement d'heures accomplies faute de validation est
    // précisément ce que la matrice interdit.
    const done = shift({
      actualStartAt: zonedInstant('2026-08-10', '08:00', TZ),
      actualEndAt: zonedInstant('2026-08-10', '18:00', TZ),
      isValidated: false,
    });
    const view = hoursView(done);
    expect(view.isValidated).toBe(false);
    expect(view.payableMinutes).toBe(view.actualMinutes);
    expect(view.payableMinutes).toBe(9 * 60);
  });

  it('paie la même chose une fois validé', () => {
    const done = shift({
      actualStartAt: zonedInstant('2026-08-10', '08:00', TZ),
      actualEndAt: zonedInstant('2026-08-10', '18:00', TZ),
      isValidated: true,
    });
    expect(hoursView(done).payableMinutes).toBe(9 * 60);
  });
});

describe('agrégat', () => {
  it('additionne prévu, réalisé et écart', () => {
    const total = sumHours([
      shift(),
      shift({
        actualStartAt: zonedInstant('2026-08-11', '09:00', TZ),
        actualEndAt: zonedInstant('2026-08-11', '18:00', TZ),
        startAt: zonedInstant('2026-08-11', '09:00', TZ),
        endAt: zonedInstant('2026-08-11', '17:00', TZ),
      }),
    ]);

    expect(total.plannedMinutes).toBe(14 * 60);
    expect(total.actualMinutes).toBe(15 * 60);
    expect(total.deltaMinutes).toBe(60);
    expect(total.hasActual).toBe(true);
  });

  it('n’est validé que si tout l’est', () => {
    expect(sumHours([shift({ isValidated: true }), shift()]).isValidated).toBe(
      false,
    );
    expect(
      sumHours([shift({ isValidated: true }), shift({ isValidated: true })])
        .isValidated,
    ).toBe(true);
  });

  it('traite l’ensemble vide comme validé', () => {
    expect(sumHours([]).isValidated).toBe(true);
    expect(sumHours([]).payableMinutes).toBe(0);
  });
});

describe('durée d’un créneau', () => {
  it('déduit la pause du prévu', () => {
    expect(plannedMinutesOf(shift({ breakMinutes: 45 }))).toBe(7 * 60 + 15);
  });
});

describe('corrections', () => {
  it('décrit l’écart et son motif', () => {
    // Sans motif, une correction d'heures est indistinguable d'une erreur de
    // saisie.
    expect(
      describeCorrection({
        beforeMinutes: 420,
        afterMinutes: 510,
        reason: 'Inventaire prolongé',
        actorMembershipId: 'm1',
        at: new Date(),
      }),
    ).toBe('+1 h 30 — Inventaire prolongé');
  });

  it('marque une correction à la baisse', () => {
    expect(
      describeCorrection({
        beforeMinutes: 510,
        afterMinutes: 420,
        reason: 'Départ anticipé',
        actorMembershipId: 'm1',
        at: new Date(),
      }),
    ).toBe('−1 h 30 — Départ anticipé');
  });
});

describe('garde-fou de période verrouillée', () => {
  const periods = [
    { startDate: '2026-07-01', endDate: '2026-07-31', status: 'LOCKED' },
    { startDate: '2026-08-01', endDate: '2026-08-31', status: 'OPEN' },
  ];

  it('bloque une date dans la période verrouillée, bornes comprises', () => {
    expect(fallsInLockedPeriod('2026-07-01', periods)).toBe(true);
    expect(fallsInLockedPeriod('2026-07-31', periods)).toBe(true);
    expect(fallsInLockedPeriod('2026-07-15', periods)).toBe(true);
  });

  it('laisse passer une date hors période verrouillée', () => {
    expect(fallsInLockedPeriod('2026-06-30', periods)).toBe(false);
    expect(fallsInLockedPeriod('2026-08-01', periods)).toBe(false);
  });
});

describe('péremption des exports', () => {
  it('périme un export antérieur au déverrouillage', () => {
    // Un fichier transmis à Silae avant un déverrouillage ne correspond plus
    // aux données ; sans ce signalement, rien ne l'indiquerait.
    expect(
      isExportStale(new Date('2026-08-01T10:00:00Z'), new Date('2026-08-05T09:00:00Z')),
    ).toBe(true);
  });

  it('laisse valide un export postérieur', () => {
    expect(
      isExportStale(new Date('2026-08-06T10:00:00Z'), new Date('2026-08-05T09:00:00Z')),
    ).toBe(false);
  });

  it('ne périme rien sans déverrouillage', () => {
    expect(isExportStale(new Date('2026-08-01T10:00:00Z'), null)).toBe(false);
  });
});
