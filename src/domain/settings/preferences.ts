/**
 * Préférences du compte — PLAN.md §9.
 *
 * Le catalogue vit dans le domaine plutôt que dans l'écran : chaque préférence
 * y porte son libellé, sa conséquence et, le cas échéant, son avertissement.
 * Un interrupteur qui change un calcul de paie ne doit pas se présenter comme
 * un réglage d'affichage, et la nuance ne tiendra pas si elle n'existe que dans
 * le JSX.
 */

export type PreferenceGroup = 'planning' | 'rights' | 'payroll' | 'print';

/** Densités d'impression. Liste fermée : elle décide d'une mise en page. */
export const PRINT_DENSITIES = [
  {
    key: 'large',
    label: 'Grande',
    hint: 'Moins de salariés par page, lisible à distance sur un mur.',
  },
  {
    key: 'compact',
    label: 'Compacte',
    hint: 'Tout l’effectif sur une page, au prix de la lisibilité de loin.',
  },
] as const;

export type PrintDensity = (typeof PRINT_DENSITIES)[number]['key'];

export function isPrintDensity(value: string): value is PrintDensity {
  return PRINT_DENSITIES.some((density) => density.key === value);
}

export interface PreferenceToggle {
  key: string;
  group: PreferenceGroup;
  label: string;
  /** Ce que l'interrupteur change réellement. */
  hint: string;
  /** Avertissement affiché en évidence — risque juridique ou de calcul. */
  warning?: string;
  /** Décalé sous la préférence dont il dépend. */
  parent?: string;
}

export const PREFERENCE_TOGGLES: PreferenceToggle[] = [
  // --- Plannings ---------------------------------------------------------
  {
    key: 'defaultMealPerShift',
    group: 'planning',
    label: 'Compter un repas par créneau',
    hint: 'Chaque créneau ouvre un repas sans saisie. À décocher si le repas dépend de l’amplitude.',
  },
  {
    key: 'paidBreaks',
    group: 'planning',
    label: 'Les pauses sont rémunérées',
    hint: 'Les pauses cessent d’être déduites du temps de travail effectif — et entrent donc dans les seuils de convention.',
    warning:
      'Modifie le décompte des heures : les semaines déjà exportées ne sont pas recalculées.',
  },
  {
    key: 'lockEmployeeMeals',
    group: 'planning',
    label: 'Les salariés ne peuvent pas modifier leur repas',
    hint: 'Le repas devient une donnée de gestion, saisie par l’encadrement.',
  },
  {
    key: 'employeesSeeOwnTotals',
    group: 'planning',
    label: 'Le salarié voit son total d’heures',
    hint: 'Heures planifiées et réelles de sa semaine, sur son propre planning.',
  },
  {
    key: 'employeesSeeTeamPlanning',
    group: 'planning',
    label: 'Le salarié voit le planning de son équipe',
    hint: 'Les créneaux des autres membres de ses équipes, sans leurs compteurs.',
  },
  {
    key: 'hideForfaitCounters',
    group: 'planning',
    label: 'Masquer les compteurs au forfait jours',
    hint: 'Les alertes horaires de ces lignes sont masquées avec eux. Un forfait jours ne se compte pas en heures : un écart hebdomadaire y est un faux positif.',
  },

  // --- Droits ------------------------------------------------------------
  {
    key: 'employeesEditOwnProfile',
    group: 'rights',
    label: 'Le salarié modifie ses informations personnelles',
    hint: 'Coordonnées et état civil. Le contrat et la rémunération restent hors de portée.',
  },
  {
    key: 'employeesSeeOwnTimesheets',
    group: 'rights',
    label: 'Le salarié consulte ses feuilles de présence',
    hint: 'Depuis son profil, en lecture seule.',
  },
  {
    key: 'employeesSeeTeamContacts',
    group: 'rights',
    label: 'Le salarié voit les coordonnées de l’équipe',
    hint: 'Téléphone et adresse e-mail de tous les membres.',
    warning:
      'Ouvre des données personnelles à l’ensemble de l’équipe : à n’activer que si la finalité le justifie.',
  },
  {
    key: 'managerCreatedArePlannable',
    group: 'rights',
    label: 'Un salarié créé par un manager est planifiable aussitôt',
    hint: 'Décoché, un administrateur ou un directeur doit le rendre planifiable depuis son profil.',
  },
  {
    key: 'directorsSharePeople',
    group: 'rights',
    label: 'Les directeurs partagent leurs salariés',
    hint: 'Un salarié devient disponible sur les plannings d’un autre établissement.',
  },
  {
    key: 'directorsAccessHrDashboard',
    group: 'rights',
    label: 'Les directeurs accèdent au tableau de bord RH',
    hint: 'Les agrégats restent bornés à leur périmètre d’établissement.',
  },
  {
    key: 'directorsSeePaidLeave',
    group: 'rights',
    label: 'Compteurs de congés payés visibles des directeurs',
    hint: 'Lecture seule. L’ajustement manuel reste une capacité distincte.',
  },
  {
    key: 'managersSeePaidLeave',
    group: 'rights',
    label: 'Compteurs de congés payés visibles des managers',
    hint: 'Lecture seule, même règle que pour les directeurs.',
  },

  // --- Paie --------------------------------------------------------------
  {
    key: 'smoothOvertimeMonthly',
    group: 'payroll',
    label: 'Lisser les heures supplémentaires au mois',
    hint: 'Le décompte se fait sur le mois au lieu de la semaine.',
    warning:
      'Le décompte hebdomadaire est le principe (art. L3121-28). Lisser au mois suppose un accord d’aménagement du temps de travail ; sans accord, l’aménagement est inopposable et les heures restent dues à la semaine.',
  },
  {
    key: 'includeRestInNormalHours',
    group: 'payroll',
    label: 'Inclure repos et absences dans les heures normales',
    hint: 'Les heures travaillées au-delà du contractuel du fait d’une absence sont payées au taux normal plutôt qu’en heures supplémentaires.',
    warning:
      'Modifie la répartition entre heures normales et heures majorées : à confirmer avec le gestionnaire de paie avant tout export.',
  },
  {
    key: 'autoEmployeeNumber',
    group: 'payroll',
    label: 'Générer le matricule automatiquement',
    hint: 'Décoché, le matricule est saisi à l’embauche — utile quand il doit correspondre à celui du logiciel de paie.',
  },

  // --- Impression --------------------------------------------------------
  {
    key: 'printContractTotals',
    group: 'print',
    label: 'Imprimer les totaux contractuels et planifiés',
    hint: 'Ajoute une colonne de totaux par salarié.',
  },
  {
    key: 'printOtherTeams',
    group: 'print',
    label: 'Imprimer les créneaux des autres équipes',
    hint: 'Situe la journée d’ensemble sur la feuille d’une équipe.',
  },
  {
    key: 'printSunday',
    group: 'print',
    label: 'Imprimer le dimanche',
    hint: 'À décocher pour un établissement qui n’ouvre jamais ce jour-là : la colonne gagnée profite aux six autres.',
  },
  {
    key: 'printSignatureColumn',
    group: 'print',
    label: 'Imprimer la colonne « émargements »',
    hint: 'Colonne vierge pour signature manuscrite.',
    warning:
      'Un émargement papier ne vaut pas décompte du temps de travail : le décompte reste celui de PlanFlow, pas celui de la feuille signée.',
  },
];

export const PREFERENCE_KEYS: string[] = PREFERENCE_TOGGLES.map(
  (toggle) => toggle.key,
);

export function togglesOf(group: PreferenceGroup): PreferenceToggle[] {
  return PREFERENCE_TOGGLES.filter((toggle) => toggle.group === group);
}

/** « 20:00 » ↔ minutes depuis minuit, pour l'heure de bascule du soir. */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function timeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
