import { describe, expect, it } from 'vitest';

import {
  findOverlaps,
  FORFAIT_JOURS_CAP,
  isHourScheduled,
  periodsOverlap,
  validateContract,
} from '@/domain/contracts/rules';

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('periodsOverlap', () => {
  it('détecte deux périodes fermées qui se recouvrent', () => {
    expect(
      periodsOverlap(
        { startDate: d('2026-01-01'), endDate: d('2026-06-30') },
        { startDate: d('2026-06-01'), endDate: d('2026-12-31') },
      ),
    ).toBe(true);
  });

  it('accepte deux périodes qui ne se touchent pas', () => {
    expect(
      periodsOverlap(
        { startDate: d('2026-01-01'), endDate: d('2026-05-31') },
        { startDate: d('2026-06-01'), endDate: d('2026-12-31') },
      ),
    ).toBe(false);
  });

  it('traite le jour de contact comme un chevauchement', () => {
    // Deux contrats actifs le même jour comptent le salarié deux fois en paie.
    expect(
      periodsOverlap(
        { startDate: d('2026-01-01'), endDate: d('2026-06-01') },
        { startDate: d('2026-06-01'), endDate: d('2026-12-31') },
      ),
    ).toBe(true);
  });

  it('fait chevaucher un contrat sans terme avec tout ce qui suit', () => {
    // Le cas qu'on oublie en comparant naïvement deux couples de dates : un CDI
    // en cours n'a pas de fin, il couvre donc toute période postérieure.
    expect(
      periodsOverlap(
        { startDate: d('2020-01-01'), endDate: null },
        { startDate: d('2030-01-01'), endDate: d('2030-12-31') },
      ),
    ).toBe(true);
  });

  it('n’étend pas un contrat sans terme vers le passé', () => {
    expect(
      periodsOverlap(
        { startDate: d('2026-01-01'), endDate: null },
        { startDate: d('2020-01-01'), endDate: d('2020-12-31') },
      ),
    ).toBe(false);
  });
});

describe('findOverlaps', () => {
  const existing = [
    { id: 'c1', startDate: d('2024-01-01'), endDate: d('2025-12-31') },
    { id: 'c2', startDate: d('2026-01-01'), endDate: null },
  ];

  it('signale le contrat en conflit', () => {
    const conflicts = findOverlaps(
      { startDate: d('2026-06-01'), endDate: d('2026-08-31') },
      existing,
    );
    expect(conflicts.map((c) => c.id)).toEqual(['c2']);
  });

  it('ignore le contrat en cours de modification', () => {
    const conflicts = findOverlaps(
      { id: 'c2', startDate: d('2026-06-01'), endDate: null },
      existing,
    );
    expect(conflicts).toEqual([]);
  });

  it('laisse passer une période libre', () => {
    expect(
      findOverlaps(
        { startDate: d('2023-01-01'), endDate: d('2023-06-30') },
        existing,
      ),
    ).toEqual([]);
  });
});

describe('validateContract — forfait jours', () => {
  const base = {
    startDate: d('2026-01-01'),
    endDate: null,
    weeklyHours: 0,
    forfaitDaysPerYear: 218,
    forfaitAgreementRef: 'CONV-2026-001',
    forfaitAgreedAt: d('2025-12-15'),
    workTimeArrangement: 'FORFAIT_JOURS' as const,
  };

  it('accepte un forfait complet', () => {
    expect(validateContract(base)).toEqual([]);
  });

  it('refuse sans convention individuelle écrite', () => {
    // Sans elle le forfait est inopposable — et l'activer supprimerait au
    // passage tout contrôle de durée hebdomadaire.
    const issues = validateContract({ ...base, forfaitAgreementRef: '' });
    expect(issues.map((i) => i.field)).toContain('forfaitAgreementRef');
  });

  it('refuse sans accord daté du salarié', () => {
    const issues = validateContract({ ...base, forfaitAgreedAt: null });
    expect(issues.map((i) => i.field)).toContain('forfaitAgreedAt');
  });

  it('refuse au-delà du plafond conventionnel', () => {
    const issues = validateContract({
      ...base,
      forfaitDaysPerYear: FORFAIT_JOURS_CAP + 1,
    });
    expect(issues[0]?.message).toContain('218');
  });

  it('accepte exactement le plafond', () => {
    expect(
      validateContract({ ...base, forfaitDaysPerYear: FORFAIT_JOURS_CAP }),
    ).toEqual([]);
  });
});

describe('validateContract — horaire', () => {
  const base = {
    startDate: d('2026-01-01'),
    endDate: null,
    weeklyHours: 35,
    workTimeArrangement: 'HOURLY' as const,
  };

  it('accepte un contrat horaire', () => {
    expect(validateContract(base)).toEqual([]);
  });

  it('refuse une durée nulle', () => {
    expect(validateContract({ ...base, weeklyHours: 0 })).toHaveLength(1);
  });

  it('refuse une fin antérieure au début', () => {
    const issues = validateContract({ ...base, endDate: d('2025-01-01') });
    expect(issues.map((i) => i.field)).toContain('endDate');
  });

  it('n’exige aucune convention de forfait', () => {
    expect(validateContract(base)).toEqual([]);
  });
});

describe('isHourScheduled', () => {
  it('exclut le forfait jours du décompte horaire', () => {
    expect(isHourScheduled('HOURLY')).toBe(true);
    expect(isHourScheduled('FORFAIT_JOURS')).toBe(false);
  });
});
