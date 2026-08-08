import type { AgreementParameters } from '@/domain/compliance/parameters';

/**
 * Jeu de paramètres d'amorce pour l'IDCC 1517 — PLAN.md §6.3.
 *
 * **Ce fichier n'est pas lu par le moteur.** Il sert au seed, qui l'écrit en
 * base ; le moteur lit toujours la base. La distinction n'est pas cosmétique :
 * corriger une valeur fausse doit être un acte de paramétrage tracé, daté et
 * approuvé, pas une livraison de code.
 *
 * `À VALIDER` — ces valeurs proviennent de sources secondaires publiques, pas
 * du texte consolidé sur Legifrance. Elles suffisent à construire et tester le
 * moteur ; elles ne suffisent pas à engager une paie. Avant production :
 * recouper avec le texte primaire, dater la version chargée, et faire
 * confirmer par le gestionnaire de paie.
 */

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

export const IDCC_1517_PARAMETERS: AgreementParameters = {
  weeklyReferenceMinutes: h(35),
  maxDailyWorkMinutes: h(10),
  // La convention ne fixe pas d'amplitude quotidienne : la règle reste muette
  // plutôt que d'appliquer une borne inventée.
  maxDailyAmplitudeMinutes: null,
  minDailyRestMinutes: h(11),
  minWeeklyRestMinutes: h(35),
  maxWeeklyWorkAbsoluteMinutes: h(48),
  averagedWeeklyWork: { windowWeeks: 12, maxAverageMinutes: h(44) },
  maxConsecutiveWorkDays: 10,
  breakAfterThreshold: { thresholdMinutes: h(6), minBreakMinutes: 20 },

  partTime: {
    minWeeklyMinutes: h(24),
    derogations: [
      {
        code: 'AIDE_ETALAGISTE',
        label: 'aide-étalagiste, employé niveau 2',
        minWeeklyMinutes: h(21),
      },
      {
        code: 'NETTOYAGE',
        label: 'nettoyage, démonstrateurs, marchés',
        minWeeklyMinutes: h(6),
      },
    ],
  },

  contractDeviationToleranceMinutes: 30,

  overtime: {
    // « De la 36ᵉ à la 43ᵉ heure » : les huit premières au-delà de 35 h, donc
    // de 35 h à 43 h en minutes cumulées depuis le début de la semaine.
    tiers: [
      { fromMinutes: h(35), toMinutes: h(43), ratePercent: 25 },
      { fromMinutes: h(43), toMinutes: null, ratePercent: 50 },
    ],
    annualQuotaMinutes: h(180),
    // Plus de 20 salariés dans l'entreprise auditée.
    beyondQuotaRestPercent: 100,
  },

  complementaryHours: {
    firstTierRatePercent: 10,
    beyondRatePercent: 25,
    firstTierFraction: 0.1,
    capFraction: 1 / 3,
  },

  sunday: {
    // Article L3132-27 : rémunération au moins doublée **et** repos
    // compensateur d'égale durée. Les deux, pas l'un ou l'autre.
    premiumPercent: 100,
    compensatoryRestPercent: 100,
    mayorQuotaPerYear: 12,
  },

  holiday: {
    workedPremiumPercent: 50,
    labourDayPremiumPercent: 100,
    paidOffDaysPerYear: 3,
    substitutionRestPercent: 50,
  },

  night: {
    startMinutes: h(21),
    endMinutes: h(6),
    notEnforceableFromAge: 55,
  },

  forfaitJours: {
    maxDaysPerYear: 218,
    workloadReviewIntervalMonths: 12,
  },
};

export type ParameterOrigin = 'OP' | 'CCN' | 'ENT';

export interface ParameterProvenance {
  key: string;
  label: string;
  value: string;
  origin: ParameterOrigin;
  source: string;
}

/**
 * Origine et source de chaque valeur, pour le registre de paramétrage.
 *
 * **OP** = ordre public (s'impose quelle que soit la convention) · **CCN** =
 * disposition propre à l'IDCC 1517 · **ENT** = relève d'un accord d'entreprise.
 *
 * Distinguer les trois n'est pas de la documentation : une valeur d'ordre
 * public ne se négocie pas, une valeur CCN change si la convention change, et
 * une valeur ENT n'existe pas ici — l'entreprise auditée n'a pas d'accord.
 */
export const IDCC_1517_PROVENANCE: ParameterProvenance[] = [
  {
    key: 'duree-hebdomadaire-reference',
    label: 'Durée hebdomadaire de référence',
    value: '35 h (151,67 h/mois, 1 607 h/an)',
    origin: 'OP',
    source: 'Code du travail, art. L3121-27',
  },
  {
    key: 'max-daily-work',
    label: 'Durée quotidienne maximale',
    value: '10 h',
    origin: 'CCN',
    source: 'IDCC 1517 — commerces de détail non alimentaires',
  },
  {
    key: 'max-weekly-work-absolute',
    label: 'Durée hebdomadaire maximale absolue',
    value: '48 h',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'max-weekly-work-averaged',
    label: 'Durée hebdomadaire moyenne',
    value: '44 h sur 12 semaines consécutives',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'min-daily-rest',
    label: 'Repos quotidien minimal',
    value: '11 h consécutives',
    origin: 'OP',
    source: 'Code du travail, art. L3131-1',
  },
  {
    key: 'min-weekly-rest',
    label: 'Repos hebdomadaire minimal',
    value: '35 h consécutives (24 + 11)',
    origin: 'OP',
    source: 'Code du travail, art. L3132-2',
  },
  {
    key: 'min-break',
    label: 'Pause obligatoire',
    value: '20 min après 6 h de travail',
    origin: 'OP',
    source: 'Code du travail, art. L3121-16',
  },
  {
    key: 'max-consecutive-days',
    label: 'Jours consécutifs maximum',
    value: '10 jours',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'part-time-minimum',
    label: 'Durée minimale de temps partiel',
    value: '24 h (dérogations : 21 h, 6 h)',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'overtime-tiers',
    label: 'Majorations pour heures supplémentaires',
    value: '+25 % de la 36ᵉ à la 43ᵉ heure, +50 % au-delà',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'overtime-quota',
    label: 'Contingent annuel',
    value: '180 h, contrepartie en repos de 100 % au-delà (> 20 salariés)',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'complementary-hours',
    label: 'Heures complémentaires',
    value: '+10 % jusqu’au dixième, +25 % au-delà, plafond au tiers',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'sunday-premium',
    label: 'Travail du dimanche — rémunération',
    value: 'Au moins le double, soit +100 %',
    origin: 'OP',
    source: 'Code du travail, art. L3132-27 (dimanches du maire)',
  },
  {
    key: 'sunday-rest',
    label: 'Travail du dimanche — repos compensateur',
    value: 'Repos d’égale durée, en plus de la majoration',
    origin: 'OP',
    source: 'Code du travail, art. L3132-27',
  },
  {
    key: 'sunday-quota',
    label: 'Dimanches du maire',
    value: '12 par année civile, liste arrêtée avant le 31 décembre',
    origin: 'OP',
    source: 'Code du travail, art. L3132-26',
  },
  {
    key: 'holiday-worked',
    label: 'Jour férié travaillé',
    value: 'Indemnité de 50 % des heures effectuées',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'labour-day',
    label: '1er mai',
    value: 'Chômé ; si travaillé, +100 %',
    origin: 'OP',
    source: 'Code du travail, art. L3133-6',
  },
  {
    key: 'holiday-paid-off',
    label: 'Jours fériés chômés garantis',
    value: '3 par année civile, choisis par l’employeur',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'night-window',
    label: 'Travail de nuit',
    value: '21 h – 6 h ; non imposable à partir de 55 ans',
    origin: 'CCN',
    source: 'IDCC 1517',
  },
  {
    key: 'forfait-jours',
    label: 'Forfait jours',
    value: '218 jours, journée de solidarité incluse',
    origin: 'CCN',
    source: 'IDCC 1517 — cadres autonomes niveaux VII à IX',
  },
];
