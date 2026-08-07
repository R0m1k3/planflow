import type { Tone } from '@/components/ui/Badge';
import type { PosteCode } from '@/lib/design/postes';

export interface FicheShift {
  day: string;
  poste: PosteCode;
  time: string;
  worked: string;
  state: string;
  tone: Tone;
}

export const FICHE_SHIFTS: FicheShift[] = [
  {
    day: 'Lun. 10 août',
    poste: 'enc',
    time: '08:00–16:00',
    worked: '8 h 00',
    state: 'Validé',
    tone: 'ok',
  },
  {
    day: 'Mar. 11 août',
    poste: 'enc',
    time: '08:00–16:00',
    worked: '8 h 00',
    state: 'Validé',
    tone: 'ok',
  },
  {
    day: 'Mer. 12 août',
    poste: 'for',
    time: '09:00–12:30',
    worked: '3 h 30',
    state: 'Validé',
    tone: 'ok',
  },
  {
    day: 'Mer. 12 août',
    poste: 'enc',
    time: '13:30–17:00',
    worked: '3 h 30',
    state: 'Heures réelles manquantes',
    tone: 'warn',
  },
  {
    day: 'Jeu. 13 août',
    poste: 'enc',
    time: '11:00–19:00',
    worked: '8 h 00',
    state: 'Publié',
    tone: 'neutral',
  },
];

export interface FicheDocument {
  label: string;
  date: string;
  state: string;
  tone: Tone;
}

export const FICHE_DOCUMENTS: FicheDocument[] = [
  {
    label: 'Contrat de travail — avenant temps partiel',
    date: '2 janv. 2026',
    state: 'Signé',
    tone: 'ok',
  },
  {
    label: 'Entretien professionnel 2026',
    date: '18 mai 2026',
    state: 'Signé',
    tone: 'ok',
  },
  {
    label: 'Attestation mutuelle',
    date: '—',
    state: 'En attente',
    tone: 'warn',
  },
];

export interface FicheCounter {
  label: string;
  value: string;
  tone?: Tone;
}

export const FICHE_COUNTERS: FicheCounter[] = [
  { label: 'Contrat', value: '39 h' },
  { label: 'Planifié S33', value: '39 h 00' },
  { label: 'Écart', value: '+0 h 00' },
  { label: 'CP acquis', value: '14,5 j' },
  { label: 'Récupération', value: '4 h 30', tone: 'warn' },
];
