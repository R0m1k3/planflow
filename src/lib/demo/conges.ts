import type { AbsenceKind } from '@/components/planning/AbsenceBar';

export interface DemoCalendarAbsence {
  who: string;
  type: string;
  kind: AbsenceKind;
  /** Jours du mois, inclusifs. */
  from: number;
  to: number;
}

export const MONTH_LABEL = 'Août 2026';

/** Le 1er août 2026 tombe un samedi : la grille démarre le lundi 27 juillet. */
export const MONTH_OFFSET = 5;
export const MONTH_LENGTH = 31;

export const CALENDAR_ABSENCES: DemoCalendarAbsence[] = [
  { who: 'Nour Zaidi', type: 'CP', kind: 'cp', from: 10, to: 14 },
  { who: 'Malik Ouedraogo', type: 'Maladie', kind: 'maladie', from: 13, to: 14 },
  { who: 'Rémi Chartier', type: 'RTT', kind: 'rtt', from: 18, to: 19 },
  { who: 'Elsa Tavares', type: 'CP', kind: 'cp', from: 24, to: 28 },
  { who: 'Inès Bakhti', type: 'Sans solde', kind: 'sans-solde', from: 21, to: 21 },
  { who: 'Alix Perron', type: 'Maladie', kind: 'maladie', from: 5, to: 6 },
  { who: 'Chloé Vasseur', type: 'CP', kind: 'cp', from: 26, to: 28 },
];

export interface DemoPendingRequest {
  who: string;
  type: string;
  range: string;
  days: string;
  note: string;
}

export const PENDING_REQUESTS: DemoPendingRequest[] = [
  {
    who: 'Nour Zaidi',
    type: 'Congés payés',
    range: '10 – 14 août',
    days: '5 j',
    note: 'Solde restant après validation : 9,5 j',
  },
  {
    who: 'Rémi Chartier',
    type: 'RTT',
    range: '18 – 19 août',
    days: '2 j',
    note: 'Chevauche un jour de forte affluence',
  },
  {
    who: 'Alix Perron',
    type: 'Sans solde',
    range: '31 août',
    days: '1 j',
    note: 'Aucune contrainte de planning',
  },
];
