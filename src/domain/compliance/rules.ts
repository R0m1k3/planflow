import { shiftMinutes } from '@/domain/counters/week';
import { weekDates, zonedDate } from '@/domain/planning/week';
import {
  RULE_SEVERITY,
  type ComplianceContext,
  type ComplianceShift,
  type Rule,
  type RuleCode,
  type Violation,
} from '@/domain/compliance/types';

/**
 * Les règles de convention — PLAN.md §6.2.
 *
 * Chaque règle est une fonction pure et indépendante. Deux conséquences
 * voulues : elle se teste à sa borne exacte sans base de données, et une règle
 * fausse n'en contamine aucune autre.
 *
 * Deux principes gouvernent l'écriture :
 *
 * 1. **Aucun seuil dans le code.** Tout vient de `context.parameters`. Un test
 *    charge deux jeux différents et vérifie que les résultats diffèrent.
 * 2. **Les durées se mesurent entre instants**, jamais en heures murales. La
 *    nuit du changement d'heure, un repos de 11 h à l'horloge en fait 10 ou 12.
 */

const MINUTE = 60_000;

function violation(
  ruleCode: RuleCode,
  message: string,
  options: {
    localDate?: string | null;
    context?: Violation['context'];
    shiftIds?: string[];
  } = {},
): Violation {
  return {
    ruleCode,
    severity: RULE_SEVERITY[ruleCode],
    localDate: options.localDate ?? null,
    message,
    context: options.context ?? {},
    shiftIds: options.shiftIds ?? [],
  };
}

/** Créneaux affectés, triés par début. Les besoins non couverts sont exclus. */
function assignedShifts(context: ComplianceContext): ComplianceShift[] {
  return context.shifts
    .filter((shift) => shift.assigned)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** Créneaux de la semaine évaluée seulement, regroupés par date locale. */
function shiftsByDay(
  context: ComplianceContext,
): Map<string, ComplianceShift[]> {
  const inWeek = new Set(weekDates(context.week));
  const byDay = new Map<string, ComplianceShift[]>();

  for (const shift of assignedShifts(context)) {
    const date = zonedDate(shift.startAt, context.timeZone);
    if (!inWeek.has(date)) continue;
    const list = byDay.get(date) ?? [];
    list.push(shift);
    byDay.set(date, list);
  }
  return byDay;
}

function worked(shift: ComplianceShift): number {
  return shiftMinutes(shift.startAt, shift.endAt, shift.breakMinutes);
}

function totalWorked(shifts: ComplianceShift[]): number {
  return shifts.reduce((sum, shift) => sum + worked(shift), 0);
}

function hours(minutes: number): string {
  const sign = minutes < 0 ? '−' : '';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)} h ${String(abs % 60).padStart(2, '0')}`;
}

/** Un contrat au forfait jours échappe aux règles horaires (PLAN.md §6.4). */
function isForfait(context: ComplianceContext): boolean {
  return context.contract.workTimeArrangement === 'FORFAIT_JOURS';
}

// ---------------------------------------------------------------------------
// Durées de travail
// ---------------------------------------------------------------------------

export const maxDailyWork: Rule = (context) => {
  if (isForfait(context)) return [];
  const limit = context.parameters.maxDailyWorkMinutes;

  return [...shiftsByDay(context)].flatMap(([date, shifts]) => {
    const minutes = totalWorked(shifts);
    if (minutes <= limit) return [];
    return [
      violation(
        'MAX_DAILY_WORK',
        `${hours(minutes)} travaillées, au-delà du maximum de ${hours(limit)}.`,
        {
          localDate: date,
          context: { workedMinutes: minutes, limitMinutes: limit },
          shiftIds: shifts.map((shift) => shift.id),
        },
      ),
    ];
  });
};

export const maxDailyAmplitude: Rule = (context) => {
  const limit = context.parameters.maxDailyAmplitudeMinutes;
  // La convention n'en fixe pas : la règle se tait plutôt que d'inventer une
  // borne qui ferait désactiver l'ensemble des alertes.
  if (limit === null) return [];

  return [...shiftsByDay(context)].flatMap(([date, shifts]) => {
    const first = shifts[0];
    const last = shifts[shifts.length - 1];
    if (!first || !last) return [];

    const amplitude = Math.round(
      (last.endAt.getTime() - first.startAt.getTime()) / MINUTE,
    );
    if (amplitude <= limit) return [];
    return [
      violation(
        'MAX_DAILY_AMPLITUDE',
        `Amplitude de ${hours(amplitude)}, au-delà du maximum de ${hours(limit)}.`,
        {
          localDate: date,
          context: { amplitudeMinutes: amplitude, limitMinutes: limit },
          shiftIds: shifts.map((shift) => shift.id),
        },
      ),
    ];
  });
};

/**
 * Repos quotidien entre deux créneaux consécutifs.
 *
 * S'applique **aussi** au forfait jours : le forfait dispense des durées
 * maximales, pas des repos (PLAN.md §6.4).
 */
export const minDailyRest: Rule = (context) => {
  const limit = context.parameters.minDailyRestMinutes;
  const shifts = assignedShifts(context);
  const inWeek = new Set(weekDates(context.week));
  const violations: Violation[] = [];

  for (let index = 1; index < shifts.length; index += 1) {
    const previous = shifts[index - 1] as ComplianceShift;
    const current = shifts[index] as ComplianceShift;

    const rest = Math.round(
      (current.startAt.getTime() - previous.endAt.getTime()) / MINUTE,
    );
    // Chevauchement : traité par OVERLAPPING_SHIFTS, pas ici.
    if (rest < 0) continue;
    if (rest >= limit) continue;

    const date = zonedDate(current.startAt, context.timeZone);
    // Les semaines voisines ne sont chargées que pour mesurer les bords ; le
    // constat se rattache à la semaine évaluée.
    if (!inWeek.has(date) && !inWeek.has(zonedDate(previous.startAt, context.timeZone))) {
      continue;
    }

    violations.push(
      violation(
        'MIN_DAILY_REST',
        `Repos de ${hours(rest)} entre deux journées, minimum ${hours(limit)}.`,
        {
          localDate: date,
          context: { restMinutes: rest, limitMinutes: limit },
          shiftIds: [previous.id, current.id],
        },
      ),
    );
  }

  return violations;
};

/**
 * Repos hebdomadaire : un intervalle continu d'au moins 35 h dans la semaine.
 *
 * Mesuré sur la semaine évaluée **bordée** par les créneaux adjacents : sans
 * eux, un salarié qui travaille du samedi au samedi paraîtrait reposé du
 * dimanche précédent au lundi suivant.
 */
export const minWeeklyRest: Rule = (context) => {
  const limit = context.parameters.minWeeklyRestMinutes;
  const dates = weekDates(context.week);
  const shifts = assignedShifts(context);
  if (shifts.length === 0) return [];

  const first = dates[0] as string;
  const last = dates[6] as string;
  const inWeek = shifts.filter((shift) => {
    const date = zonedDate(shift.startAt, context.timeZone);
    return date >= first && date <= last;
  });
  if (inWeek.length === 0) return [];

  const windowStart = (inWeek[0] as ComplianceShift).startAt;
  const windowEnd = (inWeek[inWeek.length - 1] as ComplianceShift).endAt;

  // Bornes : dernier créneau avant la semaine, premier après.
  const before = shifts.filter((shift) => shift.endAt <= windowStart).pop();
  const after = shifts.find((shift) => shift.startAt >= windowEnd);

  const points = [
    before?.endAt ?? null,
    ...inWeek.flatMap((shift) => [shift.startAt, shift.endAt]),
    after?.startAt ?? null,
  ].filter((value): value is Date => value !== null);

  let longest = 0;
  for (let index = 1; index < points.length; index += 2) {
    const gapStart = points[index] as Date;
    const gapEnd = points[index + 1];
    if (!gapEnd) break;
    longest = Math.max(
      longest,
      Math.round((gapEnd.getTime() - gapStart.getTime()) / MINUTE),
    );
  }

  if (longest >= limit) return [];

  return [
    violation(
      'MIN_WEEKLY_REST',
      `Plus long repos de la semaine : ${hours(longest)}, minimum ${hours(limit)}.`,
      {
        context: { restMinutes: longest, limitMinutes: limit },
        shiftIds: inWeek.map((shift) => shift.id),
      },
    ),
  ];
};

export const maxWeeklyWorkAbsolute: Rule = (context) => {
  if (isForfait(context)) return [];
  const limit = context.parameters.maxWeeklyWorkAbsoluteMinutes;
  const minutes = weeklyMinutes(context);
  if (minutes <= limit) return [];

  return [
    violation(
      'MAX_WEEKLY_WORK_ABSOLUTE',
      `${hours(minutes)} sur la semaine, au-delà du maximum de ${hours(limit)}.`,
      { context: { workedMinutes: minutes, limitMinutes: limit } },
    ),
  ];
};

export const maxWeeklyWorkAveraged: Rule = (context) => {
  if (isForfait(context)) return [];
  const { windowWeeks, maxAverageMinutes } = context.parameters.averagedWeeklyWork;

  const window = [
    weeklyMinutes(context),
    ...context.previousWeeklyMinutes.slice(0, windowWeeks - 1),
  ];
  // Une moyenne sur une fenêtre incomplète n'a pas de sens : les premières
  // semaines d'un contrat déclencheraient une alerte à chaque planning.
  if (window.length < windowWeeks) return [];

  const average = Math.round(
    window.reduce((sum, value) => sum + value, 0) / window.length,
  );
  if (average <= maxAverageMinutes) return [];

  return [
    violation(
      'MAX_WEEKLY_WORK_AVERAGED',
      `Moyenne de ${hours(average)} sur ${windowWeeks} semaines, au-delà de ${hours(maxAverageMinutes)}.`,
      {
        context: {
          averageMinutes: average,
          limitMinutes: maxAverageMinutes,
          windowWeeks,
        },
      },
    ),
  ];
};

export const maxConsecutiveWorkDays: Rule = (context) => {
  const limit = context.parameters.maxConsecutiveWorkDays;
  const workedDays = new Set(
    assignedShifts(context).map((shift) =>
      zonedDate(shift.startAt, context.timeZone),
    ),
  );
  if (workedDays.size === 0) return [];

  const sorted = [...workedDays].sort();
  let run = 1;
  let longest = 1;
  let runStart = sorted[0] as string;
  let longestStart = runStart;
  let longestEnd = runStart;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1] as string;
    const current = sorted[index] as string;
    const consecutive =
      new Date(`${current}T00:00:00Z`).getTime() -
        new Date(`${previous}T00:00:00Z`).getTime() ===
      86_400_000;

    if (consecutive) {
      run += 1;
    } else {
      run = 1;
      runStart = current;
    }

    if (run > longest) {
      longest = run;
      longestStart = runStart;
      longestEnd = current;
    }
  }

  if (longest <= limit) return [];

  return [
    violation(
      'MAX_CONSECUTIVE_WORK_DAYS',
      `${longest} jours travaillés d'affilée, au-delà du maximum de ${limit}.`,
      {
        localDate: longestEnd,
        context: { consecutiveDays: longest, limitDays: limit, from: longestStart },
      },
    ),
  ];
};

export const minBreakAfterThreshold: Rule = (context) => {
  if (isForfait(context)) return [];
  const { thresholdMinutes, minBreakMinutes } =
    context.parameters.breakAfterThreshold;

  return assignedShifts(context)
    .filter((shift) => {
      const date = zonedDate(shift.startAt, context.timeZone);
      return weekDates(context.week).includes(date);
    })
    .flatMap((shift) => {
      // Le seuil porte sur le travail **continu** : c'est la durée du créneau
      // pauses comprises qui déclenche l'obligation, pas le total de la journée.
      const span = Math.round(
        (shift.endAt.getTime() - shift.startAt.getTime()) / MINUTE,
      );
      if (span <= thresholdMinutes) return [];

      // Rémunérée ou non, une pause est une pause. Ne compter que la part
      // déduite ferait alerter un créneau dont la pause de vingt minutes est
      // payée — c'est-à-dire précisément l'employeur le plus généreux.
      const restMinutes = shift.breakMinutes + shift.paidBreakMinutes;
      if (restMinutes >= minBreakMinutes) return [];

      return [
        violation(
          'MIN_BREAK_AFTER_THRESHOLD',
          `${restMinutes} min de pause pour ${hours(span)} de présence : minimum ${minBreakMinutes} min au-delà de ${hours(thresholdMinutes)}.`,
          {
            localDate: zonedDate(shift.startAt, context.timeZone),
            context: {
              breakMinutes: restMinutes,
              requiredMinutes: minBreakMinutes,
              spanMinutes: span,
            },
            shiftIds: [shift.id],
          },
        ),
      ];
    });
};

// ---------------------------------------------------------------------------
// Contrat
// ---------------------------------------------------------------------------

export const partTimeMinWeeklyHours: Rule = (context) => {
  if (isForfait(context)) return [];
  const { minWeeklyMinutes, derogations } = context.parameters.partTime;
  const contract = context.contract;

  // Un temps plein n'est pas concerné ; un contrat à 0 h non plus (extra,
  // intermittent), faute de durée contractuelle à comparer.
  if (contract.weeklyMinutes <= 0) return [];
  if (contract.weeklyMinutes >= context.parameters.weeklyReferenceMinutes) {
    return [];
  }

  const derogation = contract.partTimeDerogationCode
    ? derogations.find((entry) => entry.code === contract.partTimeDerogationCode)
    : undefined;
  const floor = derogation?.minWeeklyMinutes ?? minWeeklyMinutes;

  if (contract.weeklyMinutes >= floor) return [];

  return [
    violation(
      'PART_TIME_MIN_WEEKLY_HOURS',
      `Contrat à ${hours(contract.weeklyMinutes)}, en dessous du minimum de ${hours(floor)}${derogation ? ` (${derogation.label})` : ''}.`,
      {
        context: {
          contractMinutes: contract.weeklyMinutes,
          floorMinutes: floor,
          derogation: derogation?.code ?? null,
        },
      },
    ),
  ];
};

export const contractHoursDeviation: Rule = (context) => {
  if (isForfait(context)) return [];
  const tolerance = context.parameters.contractDeviationToleranceMinutes;
  const contracted = context.contract.weeklyMinutes;
  if (contracted <= 0) return [];

  const planned = weeklyMinutes(context);
  const deviation = planned - contracted;
  if (Math.abs(deviation) <= tolerance) return [];

  return [
    violation(
      'CONTRACT_HOURS_DEVIATION',
      `${hours(planned)} planifiées pour ${hours(contracted)} au contrat (écart ${deviation > 0 ? '+' : ''}${hours(deviation)}).`,
      {
        context: {
          plannedMinutes: planned,
          contractMinutes: contracted,
          deviationMinutes: deviation,
        },
      },
    ),
  ];
};

// ---------------------------------------------------------------------------
// Cohérence — bloquantes
// ---------------------------------------------------------------------------

export const overlappingShifts: Rule = (context) => {
  const shifts = assignedShifts(context);
  const violations: Violation[] = [];

  for (let index = 1; index < shifts.length; index += 1) {
    const previous = shifts[index - 1] as ComplianceShift;
    const current = shifts[index] as ComplianceShift;
    if (current.startAt >= previous.endAt) continue;

    violations.push(
      violation(
        'OVERLAPPING_SHIFTS',
        'Deux créneaux se recouvrent : les heures seraient comptées deux fois.',
        {
          localDate: zonedDate(current.startAt, context.timeZone),
          context: {
            overlapMinutes: Math.round(
              (previous.endAt.getTime() - current.startAt.getTime()) / MINUTE,
            ),
          },
          shiftIds: [previous.id, current.id],
        },
      ),
    );
  }

  return violations;
};

export const shiftDuringAbsence: Rule = (context) => {
  return assignedShifts(context).flatMap((shift) => {
    const date = zonedDate(shift.startAt, context.timeZone);
    // `endDate` porte le **dernier jour d'absence**, pas la date de reprise :
    // la comparaison est donc inclusive aux deux bornes.
    const absence = context.absences.find(
      (entry) => date >= entry.startDate && date <= entry.endDate,
    );
    if (!absence) return [];

    return [
      violation(
        'SHIFT_DURING_ABSENCE',
        `Créneau planifié pendant une absence (${absence.label}).`,
        {
          localDate: date,
          context: { absence: absence.label },
          shiftIds: [shift.id],
        },
      ),
    ];
  });
};

// ---------------------------------------------------------------------------
// Dimanches et jours fériés
// ---------------------------------------------------------------------------

/**
 * Travail dominical.
 *
 * Informative, jamais bloquante : le refus d'un salarié de travailler le
 * dimanche ne peut être sanctionné, et l'outil n'a pas à trancher. Elle porte
 * la double contrepartie de l'article L3132-27 — majoration **et** repos
 * compensateur d'égale durée. N'annoncer que la majoration serait un
 * manquement, pas une simplification.
 */
export const sundayWork: Rule = (context) => {
  const { premiumPercent, compensatoryRestPercent } = context.parameters.sunday;
  const sunday = weekDates(context.week)[6];
  if (!sunday) return [];

  const shifts = shiftsByDay(context).get(sunday) ?? [];
  if (shifts.length === 0) return [];

  const minutes = totalWorked(shifts);
  const rest = Math.round((minutes * compensatoryRestPercent) / 100);

  return [
    violation(
      'SUNDAY_WORK',
      `Dimanche travaillé : ${hours(minutes)} majorées de ${premiumPercent} % et ${hours(rest)} de repos compensateur.`,
      {
        localDate: sunday,
        context: {
          workedMinutes: minutes,
          premiumPercent,
          compensatoryRestMinutes: rest,
        },
        shiftIds: shifts.map((shift) => shift.id),
      },
    ),
  ];
};

/**
 * Quota des dimanches du maire — L3132-26.
 *
 * Douze par année civile, sur une liste arrêtée avant le 31 décembre pour
 * l'année suivante. Deux manquements distincts sont possibles : dépasser le
 * quota, ou travailler un dimanche qui n'est pas sur la liste.
 */
export const sundayMayorQuota: Rule = (context) => {
  const quota = context.parameters.sunday.mayorQuotaPerYear;
  const sunday = weekDates(context.week)[6];
  if (!sunday) return [];

  const shifts = shiftsByDay(context).get(sunday) ?? [];
  if (shifts.length === 0) return [];

  const violations: Violation[] = [];
  const rank = context.sundaysWorkedBefore + 1;

  if (rank > quota) {
    violations.push(
      violation(
        'SUNDAY_MAYOR_QUOTA',
        `${rank}ᵉ dimanche travaillé dans l'année : le quota légal est de ${quota}.`,
        {
          localDate: sunday,
          context: { rank, quota },
          shiftIds: shifts.map((shift) => shift.id),
        },
      ),
    );
  }

  if (
    context.authorisedSundays.length > 0 &&
    !context.authorisedSundays.includes(sunday)
  ) {
    violations.push(
      violation(
        'SUNDAY_MAYOR_QUOTA',
        "Ce dimanche ne figure pas sur la liste arrêtée pour l'année.",
        {
          localDate: sunday,
          context: { authorised: false },
          shiftIds: shifts.map((shift) => shift.id),
        },
      ),
    );
  }

  return violations;
};

/**
 * Jour férié travaillé.
 *
 * Le repos de substitution existe mais ne se déclenche pas ici : la convention
 * le subordonne à une **demande du salarié**. L'outil signale le droit, il ne
 * le substitue pas d'office.
 */
export const holidayWork: Rule = (context) => {
  const { workedPremiumPercent, labourDayPremiumPercent } =
    context.parameters.holiday;

  return [...shiftsByDay(context)]
    .filter(([date]) => context.holidays.includes(date))
    .map(([date, shifts]) => {
      const minutes = totalWorked(shifts);
      const labourDay = date.slice(5) === '05-01';
      const premium = labourDay ? labourDayPremiumPercent : workedPremiumPercent;

      return violation(
        'HOLIDAY_WORK',
        labourDay
          ? `1er mai travaillé : ${hours(minutes)} majorées de ${premium} %. Le 1er mai est en principe chômé.`
          : `Jour férié travaillé : indemnité de ${premium} % des ${hours(minutes)} effectuées.`,
        {
          localDate: date,
          context: {
            workedMinutes: minutes,
            premiumPercent: premium,
            labourDay,
          },
          shiftIds: shifts.map((shift) => shift.id),
        },
      );
    });
};

// ---------------------------------------------------------------------------
// Forfait jours
// ---------------------------------------------------------------------------

export const forfaitDaysExceeded: Rule = (context) => {
  if (!isForfait(context) || !context.forfait) return [];
  const cap =
    context.contract.forfaitDaysPerYear ??
    context.parameters.forfaitJours.maxDaysPerYear;

  const workedThisWeek = new Set(
    assignedShifts(context)
      .map((shift) => zonedDate(shift.startAt, context.timeZone))
      .filter((date) => weekDates(context.week).includes(date)),
  ).size;

  const total = context.forfait.daysUsed + workedThisWeek;
  if (total <= cap) return [];

  return [
    violation(
      'FORFAIT_DAYS_EXCEEDED',
      `${total} jours décomptés sur la période, au-delà du forfait de ${cap} jours.`,
      { context: { daysUsed: total, cap } },
    ),
  ];
};

export const forfaitWorkloadReviewMissing: Rule = (context) => {
  if (!isForfait(context) || !context.forfait) return [];
  const months = context.parameters.forfaitJours.workloadReviewIntervalMonths;
  const last = context.forfait.lastWorkloadReviewAt;

  const reference = (weekDates(context.week)[0] ?? '') + 'T00:00:00Z';
  const dueSince = new Date(reference);
  dueSince.setUTCMonth(dueSince.getUTCMonth() - months);

  if (last && last >= dueSince) return [];

  return [
    violation(
      'FORFAIT_WORKLOAD_REVIEW_MISSING',
      last
        ? `Dernier entretien de charge le ${last.toISOString().slice(0, 10)} : l'intervalle maximal est de ${months} mois.`
        : `Aucun entretien annuel de charge enregistré ; l'intervalle maximal est de ${months} mois.`,
      {
        context: {
          lastReview: last ? last.toISOString().slice(0, 10) : null,
          intervalMonths: months,
        },
      },
    ),
  ];
};

/**
 * Repos insuffisant au forfait jours.
 *
 * Le forfait dispense des durées maximales, pas du repos. C'est justement la
 * population où la dérive passe inaperçue : sans compteur d'heures, seule
 * l'absence de repos reste observable.
 */
export const forfaitRestInsufficient: Rule = (context) => {
  if (!isForfait(context)) return [];

  const daily = minDailyRest(context);
  const weekly = minWeeklyRest(context);
  if (daily.length === 0 && weekly.length === 0) return [];

  return [
    violation(
      'FORFAIT_REST_INSUFFICIENT',
      `Repos insuffisant sur la semaine pour un salarié au forfait jours (${daily.length + weekly.length} constat${daily.length + weekly.length > 1 ? 's' : ''}).`,
      {
        context: {
          dailyBreaches: daily.length,
          weeklyBreaches: weekly.length,
        },
        shiftIds: [...daily, ...weekly].flatMap((entry) => entry.shiftIds),
      },
    ),
  ];
};

// ---------------------------------------------------------------------------

/** Minutes travaillées sur la semaine évaluée. */
export function weeklyMinutes(context: ComplianceContext): number {
  return [...shiftsByDay(context).values()].reduce(
    (sum, shifts) => sum + totalWorked(shifts),
    0,
  );
}

/**
 * Registre des règles.
 *
 * L'ordre est celui de PLAN.md §6.2 pour que la comparaison avec la
 * spécification reste immédiate.
 */
export const RULES: Record<RuleCode, Rule> = {
  MAX_DAILY_WORK: maxDailyWork,
  MAX_DAILY_AMPLITUDE: maxDailyAmplitude,
  MIN_DAILY_REST: minDailyRest,
  MIN_WEEKLY_REST: minWeeklyRest,
  MAX_WEEKLY_WORK_ABSOLUTE: maxWeeklyWorkAbsolute,
  MAX_WEEKLY_WORK_AVERAGED: maxWeeklyWorkAveraged,
  MAX_CONSECUTIVE_WORK_DAYS: maxConsecutiveWorkDays,
  MIN_BREAK_AFTER_THRESHOLD: minBreakAfterThreshold,
  PART_TIME_MIN_WEEKLY_HOURS: partTimeMinWeeklyHours,
  CONTRACT_HOURS_DEVIATION: contractHoursDeviation,
  OVERLAPPING_SHIFTS: overlappingShifts,
  SHIFT_DURING_ABSENCE: shiftDuringAbsence,
  SUNDAY_WORK: sundayWork,
  SUNDAY_MAYOR_QUOTA: sundayMayorQuota,
  HOLIDAY_WORK: holidayWork,
  FORFAIT_DAYS_EXCEEDED: forfaitDaysExceeded,
  FORFAIT_WORKLOAD_REVIEW_MISSING: forfaitWorkloadReviewMissing,
  FORFAIT_REST_INSUFFICIENT: forfaitRestInsufficient,
};
