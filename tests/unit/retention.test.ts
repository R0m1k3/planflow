import { describe, expect, it } from 'vitest';

import {
  applicablePolicy,
  dueAt,
  isComputable,
  purgeVerdict,
  resolvePolicy,
  START_POINT_LABELS,
  START_POINTS,
  VERDICT_LABELS,
  type RetentionPolicyLike,
} from '@/domain/retention/policy';

function policy(
  overrides: Partial<RetentionPolicyLike> = {},
): RetentionPolicyLike {
  return {
    objectType: 'Document',
    durationMonths: 12,
    startPoint: 'creation',
    legalHold: false,
    effectiveFrom: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('échéance', () => {
  it('compte de date à date', () => {
    expect(dueAt(new Date('2026-03-15T00:00:00Z'), 12)).toEqual(
      new Date('2027-03-15T00:00:00Z'),
    );
    expect(dueAt(new Date('2026-03-15T00:00:00Z'), 60)).toEqual(
      new Date('2031-03-15T00:00:00Z'),
    );
  });

  it('ne déborde pas sur le mois suivant', () => {
    // 31 janvier + 1 mois n'est pas le 3 mars : sans bornage, une pièce
    // déposée en fin de mois se purgerait un jour trop tard, tous les mois.
    expect(dueAt(new Date('2026-01-31T00:00:00Z'), 1)).toEqual(
      new Date('2026-02-28T00:00:00Z'),
    );
    expect(dueAt(new Date('2026-08-31T00:00:00Z'), 1)).toEqual(
      new Date('2026-09-30T00:00:00Z'),
    );
  });

  it('tient compte des années bissextiles', () => {
    expect(dueAt(new Date('2028-01-31T00:00:00Z'), 1)).toEqual(
      new Date('2028-02-29T00:00:00Z'),
    );
  });

  it('conserve l’heure de l’ancrage', () => {
    expect(dueAt(new Date('2026-03-15T14:30:00Z'), 3)).toEqual(
      new Date('2026-06-15T14:30:00Z'),
    );
  });
});

describe('politique applicable', () => {
  const older = policy({
    durationMonths: 12,
    effectiveFrom: new Date('2025-01-01T00:00:00Z'),
  });
  const newer = policy({
    durationMonths: 60,
    effectiveFrom: new Date('2026-06-01T00:00:00Z'),
  });

  it('retient la plus récente en vigueur', () => {
    expect(
      applicablePolicy([older, newer], 'Document', new Date('2026-07-01Z')),
    ).toBe(newer);
  });

  it('ignore celle qui n’est pas encore en vigueur', () => {
    // Effectif-daté : une pièce déposée en mars relève de la règle de mars.
    // Sans cela, un durcissement rétroactif purgerait ce que la règle du moment
    // autorisait à garder.
    expect(
      applicablePolicy([older, newer], 'Document', new Date('2026-03-01Z')),
    ).toBe(older);
  });

  it('ne rend rien quand aucune ne vise l’objet', () => {
    expect(
      applicablePolicy([older], 'Shift', new Date('2026-07-01Z')),
    ).toBeNull();
  });
});

describe('résolution du plus précis au plus général', () => {
  const general = policy({ objectType: 'Document', durationMonths: 60 });
  const precise = policy({
    objectType: 'Document:SICK_NOTE',
    durationMonths: 6,
  });

  it('préfère l’objet précis', () => {
    // Un arrêt de travail et un contrat n'ont aucune raison de se conserver
    // aussi longtemps.
    const found = resolvePolicy(
      [general, precise],
      ['Document:SICK_NOTE', 'Document'],
      new Date('2026-07-01Z'),
    );
    expect(found?.durationMonths).toBe(6);
  });

  it('retombe sur le général', () => {
    const found = resolvePolicy(
      [general, precise],
      ['Document:IDENTITY', 'Document'],
      new Date('2026-07-01Z'),
    );
    expect(found?.durationMonths).toBe(60);
  });
});

describe('décision de purge', () => {
  const anchor = new Date('2026-01-15T00:00:00Z');

  it('refuse en l’absence de politique', () => {
    // Aucune durée par défaut : effacer faute de règle serait aussi fautif que
    // garder indéfiniment.
    expect(
      purgeVerdict({ policy: null, anchor, now: new Date('2099-01-01Z') }),
    ).toBe('NO_POLICY');
  });

  it('purge une fois l’échéance atteinte', () => {
    expect(
      purgeVerdict({
        policy: policy({ durationMonths: 12 }),
        anchor,
        now: new Date('2027-01-15T00:00:00Z'),
      }),
    ).toBe('DUE');
  });

  it('attend l’échéance à la journée près', () => {
    expect(
      purgeVerdict({
        policy: policy({ durationMonths: 12 }),
        anchor,
        now: new Date('2027-01-14T23:59:59Z'),
      }),
    ).toBe('NOT_DUE');
  });

  it('suspend malgré une échéance largement dépassée', () => {
    // Un contentieux impose de garder : la suspension prime sur la durée.
    expect(
      purgeVerdict({
        policy: policy({ legalHold: true }),
        anchor,
        now: new Date('2099-01-01Z'),
      }),
    ).toBe('HELD');
  });

  it('refuse un point de départ que le code ne sait pas situer', () => {
    // PlanFlow ne modèle pas de date de départ : purger sur une date inventée
    // serait pire que ne pas purger.
    expect(
      purgeVerdict({
        policy: policy({ startPoint: 'employee_departure' }),
        anchor,
        now: new Date('2099-01-01Z'),
      }),
    ).toBe('NOT_COMPUTABLE');
  });

  it('refuse quand l’ancrage manque', () => {
    expect(
      purgeVerdict({ policy: policy(), anchor: null, now: new Date() }),
    ).toBe('NOT_COMPUTABLE');
  });
});

describe('catalogue', () => {
  it('nomme chaque point de départ', () => {
    for (const point of START_POINTS) {
      expect(START_POINT_LABELS[point]).toBeTruthy();
    }
  });

  it('distingue calculable et déclaré', () => {
    expect(isComputable('creation')).toBe(true);
    expect(isComputable('employee_departure')).toBe(false);
  });

  it('motive chaque verdict', () => {
    // « Rien à purger » sans distinguer l'absence de politique, la suspension
    // et l'échéance non atteinte empêcherait de vérifier la conservation.
    for (const verdict of Object.keys(VERDICT_LABELS)) {
      expect(VERDICT_LABELS[verdict as keyof typeof VERDICT_LABELS]).toBeTruthy();
    }
  });
});
