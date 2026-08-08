import { shiftMinutes } from '@/domain/counters/week';

/**
 * Les trois états d'une heure — PLAN.md §7.3.
 *
 * Il n'y a pas de pointeuse : le réalisé est saisi par le manager. La matrice
 * de conformité impose néanmoins de distinguer **trois** grandeurs et non deux.
 *
 * | État | Source |
 * |---|---|
 * | **Prévu** | le planning publié |
 * | **Réalisé** | ce que le salarié a effectivement fait |
 * | **Payé** | ce qui part en paie après application des règles |
 *
 * Deux règles ne se négocient pas :
 *
 * 1. **Sans heures réelles, le prévu fait foi.** Attendre une saisie qui ne
 *    viendra pas ne produirait aucune paie.
 * 2. **Le paiement n'est jamais conditionné à la validation.** Une ligne non
 *    validée par un manager part quand même en paie sur la base du réalisé.
 *    Bloquer le paiement d'heures accomplies faute de validation est
 *    précisément ce que la matrice interdit.
 */

export interface ShiftHours {
  startAt: Date;
  endAt: Date;
  breakMinutes: number;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  actualBreakMinutes: number | null;
  isValidated: boolean;
}

export interface HoursView {
  plannedMinutes: number;
  /** Réalisé saisi, ou prévu à défaut. */
  actualMinutes: number;
  /** Réalisé − prévu, signé. */
  deltaMinutes: number;
  /** Vrai quand le réalisé a été saisi, faux quand c'est le prévu qui sert. */
  hasActual: boolean;
  isValidated: boolean;
  /**
   * Ce qui part en paie. Égal au réalisé, **indépendamment** de la validation.
   */
  payableMinutes: number;
}

export function plannedMinutesOf(shift: ShiftHours): number {
  return shiftMinutes(shift.startAt, shift.endAt, shift.breakMinutes);
}

/**
 * Le réalisé d'un créneau.
 *
 * Une saisie partielle — un début sans fin — ne suffit pas : elle produirait
 * une durée fantaisiste. Tant que les deux bornes ne sont pas là, le prévu
 * reste la meilleure information disponible.
 */
export function actualMinutesOf(shift: ShiftHours): number | null {
  if (!shift.actualStartAt || !shift.actualEndAt) return null;
  return shiftMinutes(
    shift.actualStartAt,
    shift.actualEndAt,
    shift.actualBreakMinutes ?? shift.breakMinutes,
  );
}

export function hoursView(shift: ShiftHours): HoursView {
  const planned = plannedMinutesOf(shift);
  const actual = actualMinutesOf(shift);
  const effective = actual ?? planned;

  return {
    plannedMinutes: planned,
    actualMinutes: effective,
    deltaMinutes: effective - planned,
    hasActual: actual !== null,
    isValidated: shift.isValidated,
    // Volontairement identique au réalisé : la validation qualifie, elle ne
    // conditionne pas le paiement.
    payableMinutes: effective,
  };
}

/** Agrégat d'un ensemble de créneaux. */
export function sumHours(shifts: ShiftHours[]): HoursView {
  return shifts.reduce<HoursView>(
    (total, shift) => {
      const view = hoursView(shift);
      return {
        plannedMinutes: total.plannedMinutes + view.plannedMinutes,
        actualMinutes: total.actualMinutes + view.actualMinutes,
        deltaMinutes: total.deltaMinutes + view.deltaMinutes,
        hasActual: total.hasActual || view.hasActual,
        isValidated: total.isValidated && view.isValidated,
        payableMinutes: total.payableMinutes + view.payableMinutes,
      };
    },
    {
      plannedMinutes: 0,
      actualMinutes: 0,
      deltaMinutes: 0,
      hasActual: false,
      // Un ensemble vide est validé par vacuité : c'est ce qui permet à
      // l'agrégat d'une équipe sans écart de s'afficher comme traité.
      isValidated: true,
      payableMinutes: 0,
    },
  );
}

/**
 * Une correction conserve valeur avant, valeur après, motif, auteur et date.
 *
 * Le type existe pour que l'appelant ne puisse pas l'oublier : sans motif, une
 * correction d'heures est indistinguable d'une erreur de saisie.
 */
export interface HoursCorrection {
  beforeMinutes: number;
  afterMinutes: number;
  reason: string;
  actorMembershipId: string;
  at: Date;
}

export function describeCorrection(correction: HoursCorrection): string {
  const sign = correction.afterMinutes >= correction.beforeMinutes ? '+' : '−';
  const delta = Math.abs(correction.afterMinutes - correction.beforeMinutes);
  return `${sign}${Math.floor(delta / 60)} h ${String(delta % 60).padStart(2, '0')} — ${correction.reason}`;
}

/**
 * Une date tombe-t-elle dans une période verrouillée ?
 *
 * Fonction pure pour que le garde-fou soit testable sans base : c'est lui qui
 * empêche de modifier un mois déjà transmis au cabinet.
 */
export function fallsInLockedPeriod(
  isoDate: string,
  periods: Array<{ startDate: string; endDate: string; status: string }>,
): boolean {
  return periods.some(
    (period) =>
      period.status === 'LOCKED' &&
      isoDate >= period.startDate &&
      isoDate <= period.endDate,
  );
}

/**
 * Un export est-il périmé ?
 *
 * **Déduit**, jamais stocké : marquer l'export obligerait à le réécrire, alors
 * qu'il doit rester append-only. Un fichier transmis à Silae avant un
 * déverrouillage ne correspond plus aux données — sans ce signalement, rien ne
 * l'indiquerait.
 */
export function isExportStale(
  generatedAt: Date,
  unlockedAt: Date | null,
): boolean {
  if (!unlockedAt) return false;
  return generatedAt < unlockedAt;
}
