import { describe, expect, it } from 'vitest';

import type { BoardRow } from '@/domain/planning/board';
import {
  absenceOnDay,
  dayState,
  headcountByDay,
} from '@/domain/planning/presence';

function row(overrides: Partial<BoardRow> = {}): BoardRow {
  return {
    membershipId: 'm1',
    firstName: 'Camille',
    lastName: 'Ferrand',
    job: 'Vendeuse',
    forfaitJours: false,
    counters: {
      contractMinutes: 0,
      plannedMinutes: 0,
      absenceMinutes: 0,
      sundaysWorked: 0,
      restDays: 0,
      compensatoryRestMinutes: 0,
    },
    days: [[], [], [], [], [], [], []],
    absences: [],
    unassigned: false,
    ...overrides,
  };
}

const shift: BoardRow['days'][number][number] = {
  id: 's1',
  poste: 'cai',
  time: '09:00–17:00',
  minutes: 480,
  breakMinutes: 30,
  mealCount: 0,
  labelId: null,
  state: 'published',
  note: null,
};

describe('dayState', () => {
  it('dit « repos » sur une case vide', () => {
    expect(dayState(row(), 0)).toBe('off');
  });

  it('dit « présent » quand la case porte un créneau', () => {
    const days: BoardRow['days'] = [[shift], [], [], [], [], [], []];
    expect(dayState(row({ days }), 0)).toBe('present');
  });

  it('fait primer l’absence sur le créneau resté au planning', () => {
    // Le cas qui compte : le congé est validé après la construction de la
    // semaine, les créneaux n'ont pas été retirés. Afficher « présent »
    // enverrait un responsable chercher quelqu'un qui est chez lui.
    const days: BoardRow['days'] = [[shift], [], [], [], [], [], []];
    const absences = [
      { label: 'Congé payé', colorKey: 'neutral', startDay: 0, span: 2 },
    ];
    expect(dayState(row({ days, absences }), 0)).toBe('absent');
  });
});

describe('absenceOnDay', () => {
  const absences = [
    { label: 'Congé payé', colorKey: 'neutral', startDay: 2, span: 3 },
  ];

  it('couvre le premier et le dernier jour de la plage', () => {
    // La borne haute est le dernier jour d'absence, pas le jour de reprise :
    // `startDay + span` est donc exclu.
    expect(absenceOnDay(row({ absences }), 2)?.label).toBe('Congé payé');
    expect(absenceOnDay(row({ absences }), 4)?.label).toBe('Congé payé');
  });

  it('ne déborde ni avant ni après', () => {
    expect(absenceOnDay(row({ absences }), 1)).toBeUndefined();
    expect(absenceOnDay(row({ absences }), 5)).toBeUndefined();
  });
});

describe('headcountByDay', () => {
  it('compte présents, absents et repos sur chaque colonne', () => {
    const present = row({
      membershipId: 'a',
      days: [[shift], [shift], [], [], [], [], []],
    });
    const absent = row({
      membershipId: 'b',
      absences: [
        { label: 'Maladie', colorKey: 'neutral', startDay: 0, span: 1 },
      ],
    });

    const tally = headcountByDay([present, absent], 7);

    expect(tally[0]).toEqual({ present: 1, absent: 1, off: 0 });
    expect(tally[1]).toEqual({ present: 1, absent: 0, off: 1 });
    expect(tally[6]).toEqual({ present: 0, absent: 0, off: 2 });
  });

  it('écarte la ligne des besoins non couverts', () => {
    // Elle ne porte personne : la compter en repos gonflerait un effectif qui
    // n'existe pas.
    const unassigned = row({ membershipId: null, unassigned: true });
    expect(headcountByDay([unassigned], 7)[0]).toEqual({
      present: 0,
      absent: 0,
      off: 0,
    });
  });
});
