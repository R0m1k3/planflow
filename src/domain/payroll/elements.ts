/**
 * Éléments de paie calculés par PlanFlow — PLAN.md §8.2.
 *
 * Ces clés sont **stables et internes**. Elles ne sont pas des codes Silae :
 * la correspondance vit en base, parce que les codes appartiennent au dossier
 * du client et que deux clients du même cabinet n'ont pas les mêmes.
 *
 * La distinction n'est pas théorique. Écrire `EV-HDimanche` dans le calcul
 * rendrait l'outil inutilisable pour le deuxième client, et impossible à
 * corriger sans livraison le jour où le cabinet renumérote ses rubriques.
 */

export const PAYROLL_ELEMENTS = {
  WORKED_DAYS: 'WORKED_DAYS',
  WORKED_HOURS: 'WORKED_HOURS',
  MISSING_HOURS: 'MISSING_HOURS',
  SUNDAY_HOURS: 'SUNDAY_HOURS',
  HOLIDAY_HOURS: 'HOLIDAY_HOURS',
  OVERTIME_25: 'OVERTIME_25',
  OVERTIME_50: 'OVERTIME_50',
  COMPLEMENTARY_10: 'COMPLEMENTARY_10',
  COMPLEMENTARY_25: 'COMPLEMENTARY_25',
  FORFAIT_DAYS: 'FORFAIT_DAYS',
} as const;

export type PayrollElementKey =
  (typeof PAYROLL_ELEMENTS)[keyof typeof PAYROLL_ELEMENTS];

export interface PayrollElementDefinition {
  key: PayrollElementKey;
  label: string;
  /** Nature de la valeur, qui décide de la mise en forme du CSV. */
  unit: 'HOURS' | 'DAYS';
  /** Famille Silae attendue, qui oriente le choix du code dans l'écran. */
  kind: 'SERVICE' | 'OVERTIME' | 'VARIABLE' | 'ABSENCE';
  /**
   * Code proposé par défaut lorsqu'il se **lit** dans le libellé du code
   * observé — `EV-HDimanche` désigne des heures du dimanche sans ambiguïté.
   * `null` quand le code est opaque : `AB-300` ne dit pas quelle absence il
   * désigne, et le deviner serait une faute.
   */
  suggestedCode: string | null;
}

export const PAYROLL_ELEMENT_DEFINITIONS: PayrollElementDefinition[] = [
  {
    key: 'WORKED_DAYS',
    label: 'Jours travaillés',
    unit: 'DAYS',
    kind: 'SERVICE',
    suggestedCode: 'Nombre total de jours travailles',
  },
  {
    key: 'WORKED_HOURS',
    label: 'Heures travaillées',
    unit: 'HOURS',
    kind: 'SERVICE',
    suggestedCode: 'Heures travaillees',
  },
  {
    key: 'MISSING_HOURS',
    label: 'Heures manquantes au contrat',
    unit: 'HOURS',
    kind: 'SERVICE',
    suggestedCode: 'Heures manquantes au contrat',
  },
  {
    key: 'SUNDAY_HOURS',
    label: 'Heures du dimanche',
    unit: 'HOURS',
    kind: 'VARIABLE',
    suggestedCode: 'EV-HDimanche',
  },
  {
    key: 'HOLIDAY_HOURS',
    label: 'Heures de jour férié',
    unit: 'HOURS',
    kind: 'VARIABLE',
    suggestedCode: 'EV-HFerie',
  },
  {
    key: 'OVERTIME_25',
    label: 'Heures supplémentaires à 25 %',
    unit: 'HOURS',
    kind: 'OVERTIME',
    suggestedCode: 'HS-HS25',
  },
  {
    key: 'OVERTIME_50',
    label: 'Heures supplémentaires à 50 %',
    unit: 'HOURS',
    kind: 'OVERTIME',
    // Aucune ligne à 50 % dans l'export de référence : le code existe
    // probablement, il n'a simplement pas été observé.
    suggestedCode: null,
  },
  {
    key: 'COMPLEMENTARY_10',
    label: 'Heures complémentaires à 10 %',
    unit: 'HOURS',
    kind: 'OVERTIME',
    suggestedCode: null,
  },
  {
    key: 'COMPLEMENTARY_25',
    label: 'Heures complémentaires à 25 %',
    unit: 'HOURS',
    kind: 'OVERTIME',
    suggestedCode: null,
  },
  {
    key: 'FORFAIT_DAYS',
    label: 'Jours de forfait',
    unit: 'DAYS',
    kind: 'SERVICE',
    // À obtenir du dossier : aucun salarié au forfait dans l'export observé.
    suggestedCode: null,
  },
];

export function elementDefinition(
  key: PayrollElementKey,
): PayrollElementDefinition {
  const found = PAYROLL_ELEMENT_DEFINITIONS.find((entry) => entry.key === key);
  if (!found) throw new Error(`Élément de paie inconnu : ${key}`);
  return found;
}
