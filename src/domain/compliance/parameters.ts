import { z } from 'zod';

/**
 * Paramètres d'une convention collective.
 *
 * **Aucune de ces valeurs n'est écrite dans le code du moteur.** Elles vivent
 * en base, dans `CollectiveAgreement.parameters`, et sont chargées à
 * l'évaluation. C'est ce qui permet de corriger une valeur fausse sans
 * livraison, et surtout d'en faire coexister deux versions : une paie de mars
 * doit rester reproductible après un changement de règle en juin (PLAN.md
 * §12.2).
 *
 * Les durées sont en **minutes entières**, comme partout ailleurs.
 *
 * Ce schéma valide ce qui vient de la base. Une convention mal renseignée doit
 * échouer bruyamment au chargement plutôt que produire des alertes fausses —
 * un seuil manquant lu comme `undefined` désactiverait silencieusement une
 * règle de sécurité.
 */

const minutes = z.number().int().min(0).max(60 * 24 * 14);
const percent = z.number().min(0).max(1000);

export const agreementParametersSchema = z.object({
  /** Durée hebdomadaire de référence : 35 h en droit commun. */
  weeklyReferenceMinutes: minutes,

  /** Durée quotidienne maximale de travail effectif. */
  maxDailyWorkMinutes: minutes,

  /**
   * Amplitude quotidienne maximale (premier début → dernière fin).
   *
   * `null` quand la convention n'en fixe pas : la règle ne se déclenche alors
   * pas du tout. Inventer une borne serait pire que de n'en avoir aucune — une
   * alerte sans fondement se fait désactiver, et emporte les vraies avec elle.
   */
  maxDailyAmplitudeMinutes: minutes.nullable(),

  minDailyRestMinutes: minutes,
  minWeeklyRestMinutes: minutes,
  maxWeeklyWorkAbsoluteMinutes: minutes,

  /** Moyenne sur une fenêtre glissante : 44 h sur 12 semaines en IDCC 1517. */
  averagedWeeklyWork: z.object({
    windowWeeks: z.number().int().min(1).max(52),
    maxAverageMinutes: minutes,
  }),

  maxConsecutiveWorkDays: z.number().int().min(1).max(31),

  /** Pause obligatoire au-delà d'un temps de travail continu. */
  breakAfterThreshold: z.object({
    thresholdMinutes: minutes,
    minBreakMinutes: minutes,
  }),

  partTime: z.object({
    minWeeklyMinutes: minutes,
    /** Dérogations conventionnelles, par code d'emploi ou de population. */
    derogations: z.array(
      z.object({
        code: z.string().min(1),
        label: z.string().min(1),
        minWeeklyMinutes: minutes,
      }),
    ),
  }),

  /**
   * Écart toléré entre le planning et la durée contractuelle avant alerte.
   *
   * Un planning n'est jamais au quart d'heure près ; alerter sur cinq minutes
   * d'écart rendrait l'indicateur inutilisable.
   */
  contractDeviationToleranceMinutes: minutes,

  overtime: z.object({
    /** Tranches cumulatives, exprimées depuis le début de la semaine. */
    tiers: z.array(
      z.object({
        fromMinutes: minutes,
        /** `null` = jusqu'à l'infini. */
        toMinutes: minutes.nullable(),
        ratePercent: percent,
      }),
    ),
    annualQuotaMinutes: z.number().int().min(0),
    /** Contrepartie obligatoire en repos au-delà du contingent. */
    beyondQuotaRestPercent: percent,
  }),

  complementaryHours: z.object({
    firstTierRatePercent: percent,
    beyondRatePercent: percent,
    /** Fraction de la durée contractuelle au-delà de laquelle on bascule. */
    firstTierFraction: z.number().min(0).max(1),
    /** Plafond absolu, en fraction de la durée contractuelle. */
    capFraction: z.number().min(0).max(1),
  }),

  sunday: z.object({
    /** Majoration en pourcentage : 100 = rémunération doublée. */
    premiumPercent: percent,
    /**
     * Repos compensateur dû, en pourcentage du temps travaillé.
     *
     * L3132-27 impose un repos **d'égale durée** en plus de la majoration :
     * 100. Ne générer que la majoration serait un manquement.
     */
    compensatoryRestPercent: percent,
    /** Dimanches du maire : 12 par année civile (L3132-26). */
    mayorQuotaPerYear: z.number().int().min(0).max(53),
  }),

  holiday: z.object({
    /** Indemnité pour un jour férié travaillé. */
    workedPremiumPercent: percent,
    /** 1er mai : chômé obligatoire, doublé s'il est travaillé. */
    labourDayPremiumPercent: percent,
    /** Jours fériés chômés garantis par la convention, hors 1er mai. */
    paidOffDaysPerYear: z.number().int().min(0).max(11),
    /** Repos de substitution, **sur demande du salarié** uniquement. */
    substitutionRestPercent: percent,
  }),

  night: z.object({
    /** Minutes depuis minuit ; la plage franchit minuit. */
    startMinutes: minutes,
    endMinutes: minutes,
    /** Âge à partir duquel le travail de nuit n'est pas imposable. */
    notEnforceableFromAge: z.number().int().min(0).max(99),
  }),

  forfaitJours: z.object({
    maxDaysPerYear: z.number().int().min(0).max(366),
    /** Intervalle maximal entre deux entretiens de charge. */
    workloadReviewIntervalMonths: z.number().int().min(1).max(36),
  }),
});

export type AgreementParameters = z.infer<typeof agreementParametersSchema>;

/**
 * Charge et valide un jeu de paramètres venu de la base.
 *
 * Lève plutôt que de retourner un jeu partiel : mieux vaut une page en erreur
 * qu'un planning validé par un moteur dont la moitié des règles dorment.
 */
export function parseAgreementParameters(value: unknown): AgreementParameters {
  const parsed = agreementParametersSchema.safeParse(value);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(
      `Paramètres de convention invalides (${first?.path.join('.') ?? '?'}) : ${first?.message ?? 'inconnu'}`,
    );
  }
  return parsed.data;
}
