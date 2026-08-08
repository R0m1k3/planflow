import type { AgreementParameters } from '@/domain/compliance/parameters';

/**
 * Découpage des heures supplémentaires et complémentaires — PLAN.md §6.3.
 *
 * Le calcul est ici, une fois, parce qu'il alimente trois consommateurs : le
 * bandeau de compteurs, le rapport d'heures et l'export de paie. Trois
 * implémentations qui divergent d'un quart d'heure produisent un écart entre
 * le planning et le bulletin, et l'écart ne se voit qu'au moment où le
 * comptable le réclame.
 *
 * Les tranches viennent des paramètres, jamais du code : l'IDCC 1517 majore de
 * 25 % de la 36ᵉ à la 43ᵉ heure et de 50 % au-delà, mais une autre convention
 * — ou une version postérieure de celle-ci — dira autre chose.
 */

export interface OvertimeSlice {
  fromMinutes: number;
  toMinutes: number | null;
  ratePercent: number;
  minutes: number;
}

export interface OvertimeBreakdown {
  /** Heures au taux normal, dans la limite de la durée de référence. */
  baseMinutes: number;
  /** Heures supplémentaires, par tranche de majoration. */
  slices: OvertimeSlice[];
  overtimeMinutes: number;
}

/**
 * Répartit une durée hebdomadaire entre le taux normal et les tranches.
 *
 * Les tranches sont exprimées **en minutes depuis le début de la semaine**, pas
 * en durée de tranche : c'est ainsi que la convention les écrit (« de la 36ᵉ à
 * la 43ᵉ heure »), et traduire à l'écriture évite de traduire à chaque lecture.
 */
export function splitOvertime(
  weeklyMinutes: number,
  parameters: AgreementParameters,
): OvertimeBreakdown {
  const reference = parameters.weeklyReferenceMinutes;
  const baseMinutes = Math.min(weeklyMinutes, reference);

  const slices: OvertimeSlice[] = [];
  for (const tier of parameters.overtime.tiers) {
    const start = Math.max(tier.fromMinutes, reference);
    const end = tier.toMinutes ?? Number.POSITIVE_INFINITY;
    const minutes = Math.max(0, Math.min(weeklyMinutes, end) - start);
    if (minutes === 0) continue;

    slices.push({
      fromMinutes: tier.fromMinutes,
      toMinutes: tier.toMinutes,
      ratePercent: tier.ratePercent,
      minutes,
    });
  }

  return {
    baseMinutes,
    slices,
    overtimeMinutes: slices.reduce((sum, slice) => sum + slice.minutes, 0),
  };
}

export interface ComplementaryBreakdown {
  /** Heures complémentaires à la première majoration. */
  firstTierMinutes: number;
  firstTierRatePercent: number;
  /** Heures complémentaires au-delà de la première fraction. */
  beyondMinutes: number;
  beyondRatePercent: number;
  /** Heures au-delà du plafond légal : elles requalifient le contrat. */
  overCapMinutes: number;
  totalMinutes: number;
}

/**
 * Heures complémentaires d'un temps partiel.
 *
 * Distinctes des heures supplémentaires : un temps partiel qui dépasse sa durée
 * contractuelle ne fait pas d'heures supplémentaires tant qu'il reste sous la
 * durée légale. Confondre les deux fausse la paie dans les deux sens.
 *
 * Le dépassement du plafond (un tiers de la durée contractuelle) est isolé
 * parce qu'il ne relève pas de la majoration mais de la **requalification du
 * contrat** — une conséquence juridique, pas un taux.
 */
export function splitComplementary(
  weeklyMinutes: number,
  contractMinutes: number,
  parameters: AgreementParameters,
): ComplementaryBreakdown {
  const { firstTierRatePercent, beyondRatePercent, firstTierFraction, capFraction } =
    parameters.complementaryHours;

  const extra = Math.max(0, weeklyMinutes - contractMinutes);
  const firstTierLimit = Math.round(contractMinutes * firstTierFraction);
  const cap = Math.round(contractMinutes * capFraction);

  const firstTierMinutes = Math.min(extra, firstTierLimit);
  const beyondMinutes = Math.max(0, Math.min(extra, cap) - firstTierLimit);
  const overCapMinutes = Math.max(0, extra - cap);

  return {
    firstTierMinutes,
    firstTierRatePercent,
    beyondMinutes,
    beyondRatePercent,
    overCapMinutes,
    totalMinutes: extra,
  };
}

/**
 * Contingent annuel d'heures supplémentaires.
 *
 * Au-delà, chaque heure ouvre une contrepartie obligatoire en repos, dont le
 * taux dépend de l'effectif. Le dépassement n'interdit pas l'heure : il la
 * rend plus chère et crée un droit.
 */
export function quotaStatus(
  usedMinutes: number,
  parameters: AgreementParameters,
): { remainingMinutes: number; exceededMinutes: number; restPercent: number } {
  const quota = parameters.overtime.annualQuotaMinutes;
  return {
    remainingMinutes: Math.max(0, quota - usedMinutes),
    exceededMinutes: Math.max(0, usedMinutes - quota),
    restPercent: parameters.overtime.beyondQuotaRestPercent,
  };
}
