import { describe, expect, it } from 'vitest';

import {
  absenteeism,
  headcount,
  labourCost,
  profileGaps,
  turnoverRate,
  upcomingDeadlines,
  type HeadcountInput,
} from '@/domain/hr/indicators';

describe('effectif', () => {
  const contracts: HeadcountInput[] = [
    { membershipId: 'a', startDate: '2024-01-01', endDate: null },
    { membershipId: 'b', startDate: '2024-01-01', endDate: '2026-08-15' },
    { membershipId: 'c', startDate: '2026-08-03', endDate: null },
    { membershipId: 'd', startDate: '2027-01-01', endDate: null },
  ];

  it('compte les présents en fin de période', () => {
    const result = headcount(contracts, '2026-08-01', '2026-08-31');
    // a et c sont là au 31 ; b est parti le 15 ; d n'est pas encore arrivé.
    expect(result.closing).toBe(2);
  });

  it('relève les entrées et les sorties de la période', () => {
    const result = headcount(contracts, '2026-08-01', '2026-08-31');
    expect(result.entries).toEqual(['c']);
    expect(result.exits).toEqual(['b']);
  });

  it('compte un salarié entré et sorti dans la période', () => {
    // Présent, même s'il n'était là ni au premier ni au dernier jour.
    const result = headcount(
      [{ membershipId: 'e', startDate: '2026-08-03', endDate: '2026-08-28' }],
      '2026-08-01',
      '2026-08-31',
    );
    expect(result.entries).toEqual(['e']);
    expect(result.exits).toEqual(['e']);
    expect(result.closing).toBe(0);
  });

  it('calcule l’effectif moyen sur les deux bornes', () => {
    const result = headcount(contracts, '2026-08-01', '2026-08-31');
    // 2 présents au 1er (a, b), 2 au 31 (a, c).
    expect(result.average).toBe(2);
  });
});

describe('rotation', () => {
  it('moyenne entrées et sorties', () => {
    // Compter seulement les départs sous-estime la rotation d'une équipe qui
    // recrute autant qu'elle perd.
    const result = headcount(
      [
        { membershipId: 'a', startDate: '2024-01-01', endDate: null },
        { membershipId: 'b', startDate: '2024-01-01', endDate: null },
        { membershipId: 'c', startDate: '2024-01-01', endDate: null },
        { membershipId: 'd', startDate: '2024-01-01', endDate: '2026-08-20' },
        { membershipId: 'e', startDate: '2026-08-10', endDate: null },
      ],
      '2026-08-01',
      '2026-08-31',
    );

    // 1 entrée, 1 sortie, effectif moyen (4 + 4) / 2 = 4 → 25 %.
    expect(turnoverRate(result)).toBe(25);
  });

  it('ne prétend pas 0 % sur un effectif nul', () => {
    // « 0 % de rotation » sur un établissement vide est une affirmation
    // fausse, pas une absence de mouvement.
    const result = headcount([], '2026-08-01', '2026-08-31');
    expect(turnoverRate(result)).toBeNull();
  });
});

describe('absentéisme', () => {
  const absences = [
    { membershipId: 'a', days: 5, isSocialSecurity: false, timeOffId: 't1' },
    { membershipId: 'b', days: 3, isSocialSecurity: true, timeOffId: 't2' },
    { membershipId: 'c', days: 1.5, isSocialSecurity: true, timeOffId: 't3' },
  ];

  it('sépare les arrêts du reste', () => {
    const result = absenteeism(absences, 200);
    expect(result.totalDays).toBe(9.5);
    expect(result.sickDays).toBe(4.5);
  });

  it('rapporte le taux aux jours théoriquement travaillés', () => {
    // Rapporter à 30 jours calendaires donnerait un taux artificiellement bas
    // et ferait passer un problème réel pour du bruit.
    expect(absenteeism(absences, 200).rate).toBe(4.8);
    expect(absenteeism(absences, 100).rate).toBe(9.5);
  });

  it('rend les identifiants sources', () => {
    // Un indicateur qu'on ne peut pas ouvrir ne se corrige pas, il se conteste.
    expect(absenteeism(absences, 200).sourceIds).toEqual(['t1', 't2', 't3']);
  });

  it('ne calcule pas de taux sans base', () => {
    expect(absenteeism(absences, 0).rate).toBeNull();
  });
});

describe('échéances', () => {
  const entries = [
    {
      id: 'p1',
      membershipId: 'a',
      name: 'Awa Diallo',
      dueDate: '2026-08-20',
      label: 'Titre de séjour',
    },
    {
      id: 'p2',
      membershipId: 'b',
      name: 'Yanis Trabelsi',
      dueDate: '2026-07-30',
      label: 'Période d’essai',
    },
    {
      id: 'p3',
      membershipId: 'c',
      name: 'Léa Nguyen',
      dueDate: '2026-11-30',
      label: 'Titre de séjour',
    },
  ];

  it('remonte les échéances de la fenêtre', () => {
    const result = upcomingDeadlines(entries, '2026-08-10', 60);
    expect(result.map((entry) => entry.id)).toEqual(['p2', 'p1']);
  });

  it('place les échéances dépassées en tête', () => {
    // Une période d'essai qu'on a laissé filer est plus urgente qu'une
    // échéance à venir : la masquer est ce qui la rend coûteuse.
    const result = upcomingDeadlines(entries, '2026-08-10', 60);
    expect(result[0]?.severity).toBe('PASSED');
    expect(result[0]?.daysLeft).toBe(-11);
  });

  it('distingue l’urgent du prochain', () => {
    const result = upcomingDeadlines(entries, '2026-08-10', 200);
    expect(result.find((entry) => entry.id === 'p1')?.severity).toBe('URGENT');
    expect(result.find((entry) => entry.id === 'p3')?.severity).toBe('SOON');
  });

  it('exclut ce qui dépasse la fenêtre', () => {
    const result = upcomingDeadlines(entries, '2026-08-10', 30);
    expect(result.map((entry) => entry.id)).not.toContain('p3');
  });

  it('traite la borne exacte comme incluse', () => {
    const result = upcomingDeadlines(entries, '2026-08-10', 10);
    // 20 août − 10 août = 10 jours : exactement la fenêtre.
    expect(result.map((entry) => entry.id)).toContain('p1');
  });
});

describe('complétude des dossiers', () => {
  const complete = {
    membershipId: 'a',
    name: 'Sofia Marchetti',
    birthDate: new Date('1990-01-01'),
    address: '1 rue de la Paix',
    city: 'Nantes',
    phone: '00 00 00 00 00',
    socialSecurityNumber: Buffer.from('chiffré'),
    iban: Buffer.from('chiffré'),
    hasContract: true,
  };

  it('ne signale rien sur un dossier complet', () => {
    expect(profileGaps(complete).missing).toEqual([]);
  });

  it('nomme ce qui manque plutôt que de le compter', () => {
    // « 6 profils incomplets » n'aide personne à agir ; « il manque l'IBAN de
    // trois salariés » se règle en un message.
    const gaps = profileGaps({ ...complete, iban: null, phone: null });
    expect(gaps.missing).toEqual(['téléphone', 'IBAN']);
  });

  it('signale un salarié sans contrat', () => {
    expect(profileGaps({ ...complete, hasContract: false }).missing).toEqual([
      'contrat',
    ]);
  });

  it('contrôle la présence du NIR sans le déchiffrer', () => {
    // Savoir qu'une valeur existe n'exige pas de la lire.
    const gaps = profileGaps({ ...complete, socialSecurityNumber: null });
    expect(gaps.missing).toEqual(['numéro de sécurité sociale']);
  });
});

describe('coût de main-d’œuvre', () => {
  it('applique le taux de cotisations de l’établissement', () => {
    // 10 h à 12 € avec 42 % de charges : 120 × 1,42.
    expect(labourCost(600, 12, 42)).toBe(170.4);
  });

  it('suit un taux différent d’un établissement à l’autre', () => {
    // Le taux patronal est un paramètre, jamais une constante.
    expect(labourCost(600, 12, 0)).toBe(120);
    expect(labourCost(600, 12, 50)).toBe(180);
  });
});
