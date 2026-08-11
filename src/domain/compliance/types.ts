import type { AgreementParameters } from '@/domain/compliance/parameters';
import type { IsoWeek } from '@/domain/planning/week';

/**
 * Vocabulaire du moteur de règles — PLAN.md §6.
 *
 * Le moteur ne connaît ni Prisma ni React : il prend un contexte, rend des
 * violations. C'est ce qui le rend testable aux bornes sans base de données,
 * et c'est la seule façon d'avoir confiance dans des seuils dont dépendent des
 * durées de travail réelles.
 */

export const RULE_CODES = [
  'MAX_DAILY_WORK',
  'MAX_DAILY_AMPLITUDE',
  'MIN_DAILY_REST',
  'MIN_WEEKLY_REST',
  'MAX_WEEKLY_WORK_ABSOLUTE',
  'MAX_WEEKLY_WORK_AVERAGED',
  'MAX_CONSECUTIVE_WORK_DAYS',
  'MIN_BREAK_AFTER_THRESHOLD',
  'PART_TIME_MIN_WEEKLY_HOURS',
  'CONTRACT_HOURS_DEVIATION',
  'OVERLAPPING_SHIFTS',
  'SHIFT_DURING_ABSENCE',
  'SUNDAY_WORK',
  'SUNDAY_MAYOR_QUOTA',
  'HOLIDAY_WORK',
  'FORFAIT_DAYS_EXCEEDED',
  'FORFAIT_WORKLOAD_REVIEW_MISSING',
  'FORFAIT_REST_INSUFFICIENT',
] as const;

export type RuleCode = (typeof RULE_CODES)[number];

/**
 * Règles de mineurs — **non implémentées, volontairement.**
 *
 * La matrice de conformité ne couvre que les majeurs. Les seuils applicables
 * aux moins de 18 ans (durée quotidienne, repos, interdiction de nuit) n'ont
 * pas de source primaire dans le dossier. Les inventer donnerait une fausse
 * assurance sur la population que le droit protège le plus.
 *
 * Ces codes sont réservés ici pour que le jour où les valeurs sont fournies,
 * l'ajout soit un fichier de règle et une entrée de paramètres — pas une
 * migration de données.
 */
export const RESERVED_MINOR_RULE_CODES = [
  'MINOR_MAX_DAILY_WORK',
  'MINOR_MIN_DAILY_REST',
  'MINOR_NIGHT_WORK',
] as const;

export type Severity = 'INFO' | 'WARNING' | 'BLOCKING';

/**
 * Sévérité par règle.
 *
 * `OVERLAPPING_SHIFTS` et `SHIFT_DURING_ABSENCE` bloquent : ce sont des
 * incohérences de données, pas des arbitrages d'organisation. Les autres
 * avertissent — un manager doit pouvoir passer outre en connaissance de cause,
 * et cette décision est tracée.
 */
export const RULE_SEVERITY: Record<RuleCode, Severity> = {
  MAX_DAILY_WORK: 'WARNING',
  MAX_DAILY_AMPLITUDE: 'WARNING',
  MIN_DAILY_REST: 'WARNING',
  MIN_WEEKLY_REST: 'WARNING',
  MAX_WEEKLY_WORK_ABSOLUTE: 'WARNING',
  MAX_WEEKLY_WORK_AVERAGED: 'WARNING',
  MAX_CONSECUTIVE_WORK_DAYS: 'WARNING',
  MIN_BREAK_AFTER_THRESHOLD: 'WARNING',
  PART_TIME_MIN_WEEKLY_HOURS: 'WARNING',
  CONTRACT_HOURS_DEVIATION: 'WARNING',
  OVERLAPPING_SHIFTS: 'BLOCKING',
  SHIFT_DURING_ABSENCE: 'BLOCKING',
  SUNDAY_WORK: 'INFO',
  SUNDAY_MAYOR_QUOTA: 'WARNING',
  HOLIDAY_WORK: 'INFO',
  FORFAIT_DAYS_EXCEEDED: 'WARNING',
  FORFAIT_WORKLOAD_REVIEW_MISSING: 'WARNING',
  FORFAIT_REST_INSUFFICIENT: 'WARNING',
};

export interface Violation {
  ruleCode: RuleCode;
  severity: Severity;
  /** Jour concerné, `null` quand la règle porte sur la semaine entière. */
  localDate: string | null;
  message: string;
  /** Éléments chiffrés du constat, pour l'affichage et la preuve. */
  context: Record<string, string | number | boolean | null>;
  /** Créneaux mis en cause, pour poser le badge sur la bonne cellule. */
  shiftIds: string[];
}

export interface ComplianceShift {
  id: string;
  startAt: Date;
  endAt: Date;
  /** Pauses non rémunérées, déduites du temps de travail. */
  breakMinutes: number;
  /**
   * Pauses rémunérées.
   *
   * Elles ne se déduisent pas du temps travaillé, mais restent du repos : la
   * règle de pause minimale les compte. Sans elles, un créneau où la pause de
   * vingt minutes est payée passerait pour un créneau sans pause.
   */
  paidBreakMinutes: number;
  /** Faux pour un besoin non couvert : aucune règle de personne ne s'applique. */
  assigned: boolean;
}

export interface ComplianceAbsence {
  /** Premier jour d'absence, en date civile. */
  startDate: string;
  /** **Dernier** jour d'absence, pas la date de reprise. */
  endDate: string;
  label: string;
}

export interface ComplianceContract {
  workTimeArrangement: 'HOURLY' | 'FORFAIT_JOURS';
  weeklyMinutes: number;
  forfaitDaysPerYear: number | null;
  /** Code de dérogation au minimum de temps partiel, s'il y en a une. */
  partTimeDerogationCode: string | null;
}

export interface ForfaitState {
  /** Jours déjà décomptés sur la période de référence. */
  daysUsed: number;
  lastWorkloadReviewAt: Date | null;
}

/**
 * Tout ce dont les règles ont besoin, et rien de plus.
 *
 * Les créneaux couvrent la semaine évaluée **et ses voisines** : le repos
 * quotidien se mesure entre dimanche soir et lundi matin, donc à cheval sur
 * deux semaines. Une évaluation qui ne regarderait que sept jours manquerait
 * précisément les infractions de bord.
 */
export interface ComplianceContext {
  week: IsoWeek;
  timeZone: string;
  membershipId: string;
  contract: ComplianceContract;
  /** Semaine évaluée et semaines adjacentes, triés ou non. */
  shifts: ComplianceShift[];
  absences: ComplianceAbsence[];
  /** Jours fériés de l'établissement, en dates civiles. */
  holidays: string[];
  /** Dimanches du maire autorisés pour l'année, en dates civiles. */
  authorisedSundays: string[];
  /** Dimanches déjà travaillés dans l'année, hors semaine évaluée. */
  sundaysWorkedBefore: number;
  /**
   * Durées hebdomadaires des semaines précédentes, la plus récente en tête.
   * Sert à la moyenne glissante.
   */
  previousWeeklyMinutes: number[];
  forfait: ForfaitState | null;
  parameters: AgreementParameters;
}

export type Rule = (context: ComplianceContext) => Violation[];
