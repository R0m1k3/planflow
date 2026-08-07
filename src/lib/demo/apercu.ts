import type { Tone } from '@/components/ui/Badge';

export interface DemoTile {
  label: string;
  value: string;
  tone: Tone;
}

export const TILES: DemoTile[] = [
  { label: 'Profils incomplets', value: '6', tone: 'warn' },
  { label: 'Fins de période d’essai', value: '2', tone: 'info' },
  { label: 'Documents à signer', value: '11', tone: 'accent' },
  { label: 'Titres de séjour à renouveler', value: '1', tone: 'danger' },
];

export interface DemoEntry {
  initials: string;
  name: string;
  job: string;
  date: string;
  state: string;
  tone: Tone;
}

export const ENTRIES: DemoEntry[] = [
  {
    initials: 'YB',
    name: 'Yanis Bouchard',
    job: 'Vendeur univers maison · CDI 35 h',
    date: '17 août',
    state: 'Dossier complet',
    tone: 'ok',
  },
  {
    initials: 'MR',
    name: 'Maëlys Renard',
    job: 'Hôtesse de caisse · CDD 24 h',
    date: '24 août',
    state: '2 pièces manquantes',
    tone: 'warn',
  },
  {
    initials: 'TN',
    name: 'Théo Nguyen',
    job: 'Employé réserve · CDI 35 h',
    date: '1 sept.',
    state: 'Contrat à signer',
    tone: 'info',
  },
  {
    initials: 'SL',
    name: 'Sarah Lemoine',
    job: 'Vendeuse décoration · CDI 30 h',
    date: '7 sept.',
    state: 'Dossier complet',
    tone: 'ok',
  },
];

export interface DemoTodo {
  dot: string;
  title: string;
  detail: string;
  when: string;
}

export const TODOS: DemoTodo[] = [
  {
    dot: 'var(--color-danger)',
    title: '3 alertes de convention sur la semaine 33',
    detail:
      'Repos quotidien inférieur à 11 h pour Rémi Chartier (mardi) et amplitude dépassée pour Inès Bakhti (samedi).',
    when: 'Aujourd’hui',
  },
  {
    dot: 'var(--color-warn)',
    title: 'Semaine 34 non publiée',
    detail:
      'La publication doit intervenir au moins 7 jours avant le premier créneau, soit avant le 10 août 18:00.',
    when: 'J−0',
  },
  {
    dot: 'var(--color-info)',
    title: '3 demandes de congés en attente',
    detail:
      'Nour Zaidi (5 jours), Rémi Chartier (2 jours), Alix Perron (1 jour).',
    when: '2 j',
  },
  {
    dot: 'var(--color-ink-3)',
    title: '11 bulletins de paie à diffuser',
    detail:
      'Période de juillet 2026, contrôlée et validée par le service paie le 5 août.',
    when: '5 j',
  },
  {
    dot: 'var(--color-ink-3)',
    title: 'Compteurs de récupération à solder',
    detail:
      '4 salariés dépassent 12 h de récupération non prise depuis plus de deux mois.',
    when: '12 j',
  },
];
