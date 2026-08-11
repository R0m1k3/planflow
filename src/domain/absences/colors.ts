/**
 * Familles de couleur des types d'absence.
 *
 * Une famille, pas un type. Le client crée autant de types qu'il lui en faut —
 * une vingtaine dans un commerce de détail — et leur donner à chacun sa teinte
 * rendrait la grille illisible bien avant la fin de la liste. Le libellé porte
 * l'information exacte, la couleur ne fait que grouper.
 *
 * Liste fermée pour cette raison : ouvrir le champ à une couleur libre
 * reviendrait à laisser un utilisateur casser la lisibilité de la grille depuis
 * un écran de réglage.
 */
export const ABSENCE_COLORS = [
  { key: 'cp', label: 'Congé payé' },
  { key: 'rtt', label: 'RTT et repos' },
  { key: 'maladie', label: 'Santé et accident' },
  { key: 'famille', label: 'Famille' },
  { key: 'formation', label: 'Formation' },
  { key: 'ferie', label: 'Jour férié' },
  { key: 'sanction', label: 'Sanction' },
  { key: 'sans-solde', label: 'Sans solde et non justifiée' },
  { key: 'attente', label: 'En attente de décision' },
] as const;

export type AbsenceColorKey = (typeof ABSENCE_COLORS)[number]['key'];

export const ABSENCE_COLOR_KEYS: readonly string[] = ABSENCE_COLORS.map(
  (color) => color.key,
);

export function isAbsenceColorKey(value: string): value is AbsenceColorKey {
  return ABSENCE_COLOR_KEYS.includes(value);
}
