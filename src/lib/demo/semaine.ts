import { findEmployee } from '@/lib/demo/equipe';
import type { DemoEmployee, DemoShift, DemoWeekRow } from '@/lib/demo/types';

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

function pick(id: string): DemoEmployee {
  const employee = findEmployee(id);
  if (!employee) throw new Error(`Salarié de démonstration inconnu : ${id}`);
  return employee;
}

const NONE: DemoShift[] = [];

export const WEEK_DAYS = [
  'Lun. 10',
  'Mar. 11',
  'Mer. 12',
  'Jeu. 13',
  'Ven. 14',
  'Sam. 15',
  'Dim. 16',
] as const;

export const WEEK_LABEL = 'Semaine 33 · 10 – 16 août 2026';

export const WEEK_ROWS: DemoWeekRow[] = [
  {
    employee: pick('camille-ferrand'),
    counters: {
      contractMinutes: h(39),
      plannedMinutes: h(39),
      absenceMinutes: 0,
      sundaysWorked: 1,
      restDays: 2,
    },
    days: [
      [{ poste: 'enc', start: h(8), end: h(16), state: 'validated' }],
      [{ poste: 'enc', start: h(8), end: h(16), state: 'validated' }],
      [
        { poste: 'for', start: h(9), end: h(12, 30), state: 'validated' },
        { poste: 'enc', start: h(13, 30), end: h(17), state: 'validated' },
      ],
      [{ poste: 'enc', start: h(11), end: h(19), state: 'validated' }],
      [{ poste: 'enc', start: h(11), end: h(19), state: 'validated' }],
      NONE,
      NONE,
    ],
  },
  {
    employee: pick('jonas-meyer'),
    counters: {
      contractMinutes: 0,
      plannedMinutes: h(38, 30),
      absenceMinutes: 0,
      sundaysWorked: 1,
      restDays: 2,
    },
    days: [
      [{ poste: 'enc', start: h(12), end: h(20), state: 'validated' }],
      [{ poste: 'enc', start: h(12), end: h(20), state: 'validated' }],
      [
        { poste: 'inv', start: h(6, 30), end: h(11), state: 'validated' },
        { poste: 'enc', start: h(11, 30), end: h(15), state: 'validated' },
      ],
      [{ poste: 'enc', start: h(12), end: h(20), state: 'validated' }],
      NONE,
      [{ poste: 'enc', start: h(9), end: h(19), state: 'draft' }],
      NONE,
    ],
  },
  {
    employee: pick('remi-chartier'),
    counters: {
      contractMinutes: h(35),
      plannedMinutes: h(36, 30),
      absenceMinutes: 0,
      sundaysWorked: 2,
      restDays: 2,
    },
    days: [
      [
        { poste: 'vte', start: h(9, 30), end: h(13), state: 'validated' },
        { poste: 'cai', start: h(14), end: h(18, 30), state: 'validated' },
      ],
      [
        {
          poste: 'cai',
          start: h(12),
          end: h(20),
          state: 'alert',
          alert: 'Repos < 11 h',
        },
      ],
      [{ poste: 'vte', start: h(10), end: h(14), state: 'validated' }],
      NONE,
      [
        { poste: 'vte', start: h(9), end: h(13), state: 'validated' },
        { poste: 'cab', start: h(14), end: h(18), state: 'validated' },
      ],
      [{ poste: 'cai', start: h(9, 30), end: h(19, 30), state: 'draft' }],
      NONE,
    ],
  },
  {
    employee: pick('ines-bakhti'),
    counters: {
      contractMinutes: h(35),
      plannedMinutes: h(35),
      absenceMinutes: 0,
      sundaysWorked: 1,
      restDays: 2,
    },
    days: [
      [{ poste: 'cai', start: h(9), end: h(17), state: 'validated' }],
      [{ poste: 'cai', start: h(9), end: h(17), state: 'validated' }],
      NONE,
      [{ poste: 'cai', start: h(11, 30), end: h(19, 30), state: 'validated' }],
      [
        { poste: 'cai', start: h(9), end: h(14), state: 'validated' },
        { poste: 'clc', start: h(14, 30), end: h(17, 30), state: 'validated' },
      ],
      [
        {
          poste: 'cai',
          start: h(9, 30),
          end: h(19, 30),
          state: 'alert',
          alert: 'Amplitude > 10 h',
        },
      ],
      NONE,
    ],
  },
  {
    employee: pick('nour-zaidi'),
    counters: {
      contractMinutes: h(30),
      plannedMinutes: h(12),
      absenceMinutes: h(18),
      sundaysWorked: 0,
      restDays: 5,
    },
    absence: { kind: 'cp', label: 'Congés payés', startDay: 0, span: 5 },
    days: [
      NONE,
      NONE,
      NONE,
      NONE,
      NONE,
      [{ poste: 'vte', start: h(13), end: h(19), state: 'draft' }],
      [{ poste: 'vte', start: h(11), end: h(17), state: 'unpublished' }],
    ],
  },
  {
    employee: pick('alix-perron'),
    counters: {
      contractMinutes: h(35),
      plannedMinutes: h(33, 15),
      absenceMinutes: 0,
      sundaysWorked: 0,
      restDays: 2,
    },
    days: [
      [
        { poste: 'liv', start: h(6), end: h(11), state: 'validated' },
        { poste: 'res', start: h(11, 30), end: h(14, 45), state: 'validated' },
      ],
      [{ poste: 'res', start: h(6), end: h(13), state: 'validated' }],
      [{ poste: 'liv', start: h(6), end: h(11), state: 'validated' }],
      NONE,
      [{ poste: 'res', start: h(6), end: h(13), state: 'validated' }],
      [{ poste: 'rss', start: h(7), end: h(13), state: 'draft' }],
      NONE,
    ],
  },
  {
    employee: pick('elsa-tavares'),
    counters: {
      contractMinutes: h(24),
      plannedMinutes: h(25, 30),
      absenceMinutes: 0,
      sundaysWorked: 2,
      restDays: 3,
    },
    days: [
      NONE,
      NONE,
      [{ poste: 'vte', start: h(14), end: h(19), state: 'validated' }],
      [{ poste: 'cab', start: h(14), end: h(19), state: 'validated' }],
      [{ poste: 'vte', start: h(14), end: h(19, 30), state: 'validated' }],
      [{ poste: 'cai', start: h(13, 30), end: h(19, 30), state: 'draft' }],
      [{ poste: 'vte', start: h(10), end: h(14), state: 'unpublished' }],
    ],
  },
  {
    employee: pick('malik-ouedraogo'),
    counters: {
      contractMinutes: h(35),
      plannedMinutes: h(31),
      absenceMinutes: h(14),
      sundaysWorked: 0,
      restDays: 2,
    },
    absence: { kind: 'maladie', label: 'Arrêt maladie', startDay: 3, span: 2 },
    days: [
      [
        { poste: 'liv', start: h(5, 30), end: h(10, 30), state: 'validated' },
        { poste: 'res', start: h(11), end: h(14), state: 'validated' },
      ],
      [{ poste: 'rss', start: h(6), end: h(13, 30), state: 'validated' }],
      [{ poste: 'inv', start: h(6), end: h(13), state: 'validated' }],
      NONE,
      NONE,
      [{ poste: 'liv', start: h(6), end: h(12, 30), state: 'draft' }],
      NONE,
    ],
  },
  {
    employee: pick('chloe-vasseur'),
    counters: {
      contractMinutes: h(20),
      plannedMinutes: h(21, 15),
      absenceMinutes: 0,
      sundaysWorked: 2,
      restDays: 4,
    },
    days: [
      NONE,
      NONE,
      [{ poste: 'for', start: h(9), end: h(13), state: 'validated' }],
      NONE,
      [{ poste: 'vte', start: h(15), end: h(19, 30), state: 'validated' }],
      [{ poste: 'cai', start: h(11), end: h(18), state: 'draft' }],
      [{ poste: 'vte', start: h(11), end: h(15), state: 'unpublished' }],
    ],
  },
];

/** Ligne des besoins sans titulaire, affichée en tête de grille. */
export const UNASSIGNED_ROW: DemoWeekRow = {
  employee: {
    id: 'non-assigne',
    firstName: '',
    lastName: 'Non assigné',
    job: 'Besoin non couvert',
    poste: 'cai',
    contract: '—',
    since: '—',
    status: 'actif',
  },
  unassigned: true,
  counters: {
    contractMinutes: 0,
    plannedMinutes: h(14),
    absenceMinutes: 0,
    sundaysWorked: 0,
    restDays: 0,
  },
  days: [
    NONE,
    [{ poste: 'net', start: h(20), end: h(22), state: 'unassigned' }],
    NONE,
    [{ poste: 'clc', start: h(16), end: h(20), state: 'unassigned' }],
    [{ poste: 'cai', start: h(17), end: h(20), state: 'unassigned' }],
    [{ poste: 'cai', start: h(14), end: h(19), state: 'unassigned' }],
    [{ poste: 'clc', start: h(13), end: h(17), state: 'unassigned' }],
  ],
};
