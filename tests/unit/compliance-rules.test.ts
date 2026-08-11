import { describe, expect, it } from 'vitest';

import { evaluate, sortViolations } from '@/domain/compliance/engine';
import { IDCC_1517_PARAMETERS } from '@/domain/compliance/idcc1517';
import { parseAgreementParameters } from '@/domain/compliance/parameters';
import { RULE_CODES } from '@/domain/compliance/types';
import type {
  ComplianceContext,
  ComplianceShift,
  RuleCode,
} from '@/domain/compliance/types';
import { zonedInstant } from '@/domain/planning/week';

/**
 * Tests aux bornes — critère d'acceptation de WP-05.
 *
 * Pour chaque règle : la valeur limite exacte **passe**, un cran au-delà
 * déclenche. C'est la seule forme de test qui protège d'une inégalité écrite à
 * l'envers, et une inégalité à l'envers sur un repos quotidien est une
 * infraction que personne ne verra.
 */

const TZ = 'Europe/Paris';
/** Semaine 33 de 2026 : lundi 10 → dimanche 16 août. */
const WEEK = { isoYear: 2026, isoWeek: 33 };

let sequence = 0;

function shift(
  date: string,
  start: string,
  end: string,
  breakMinutes = 0,
  assigned = true,
): ComplianceShift {
  sequence += 1;
  const startAt = zonedInstant(date, start, TZ);
  let endAt = zonedInstant(date, end, TZ);
  if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86_400_000);
  return {
    id: `s${sequence}`,
    startAt,
    endAt,
    breakMinutes,
    paidBreakMinutes: 0,
    assigned,
  };
}

function context(over: Partial<ComplianceContext> = {}): ComplianceContext {
  return {
    week: WEEK,
    timeZone: TZ,
    membershipId: 'm1',
    contract: {
      workTimeArrangement: 'HOURLY',
      weeklyMinutes: 35 * 60,
      forfaitDaysPerYear: null,
      partTimeDerogationCode: null,
    },
    shifts: [],
    absences: [],
    holidays: [],
    authorisedSundays: [],
    sundaysWorkedBefore: 0,
    previousWeeklyMinutes: [],
    forfait: null,
    parameters: IDCC_1517_PARAMETERS,
    ...over,
  };
}

function codes(ctx: ComplianceContext): RuleCode[] {
  return evaluate(ctx).violations.map((entry) => entry.ruleCode);
}

describe('le jeu de paramètres IDCC 1517 est valide', () => {
  it('passe le schéma', () => {
    expect(() => parseAgreementParameters(IDCC_1517_PARAMETERS)).not.toThrow();
  });

  it('rejette un jeu amputé', () => {
    // Un seuil manquant lu comme `undefined` désactiverait silencieusement une
    // règle : l'échec doit être bruyant.
    const { minDailyRestMinutes, ...partial } = IDCC_1517_PARAMETERS;
    expect(minDailyRestMinutes).toBe(660);
    expect(() => parseAgreementParameters(partial)).toThrow(/minDailyRest/);
  });
});

describe('MAX_DAILY_WORK', () => {
  it('accepte exactement 10 h', () => {
    const ctx = context({ shifts: [shift('2026-08-10', '08:00', '18:00')] });
    expect(codes(ctx)).not.toContain('MAX_DAILY_WORK');
  });

  it('déclenche à 10 h 01', () => {
    const ctx = context({ shifts: [shift('2026-08-10', '08:00', '18:01')] });
    expect(codes(ctx)).toContain('MAX_DAILY_WORK');
  });

  it('additionne les créneaux d’une même journée', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '06:00', '12:00'),
        shift('2026-08-10', '13:00', '18:01'),
      ],
    });
    expect(codes(ctx)).toContain('MAX_DAILY_WORK');
  });

  it('déduit la pause avant de comparer', () => {
    // 10 h 30 de présence moins 30 min de pause : la limite est respectée.
    const ctx = context({
      shifts: [shift('2026-08-10', '08:00', '18:30', 30)],
    });
    expect(codes(ctx)).not.toContain('MAX_DAILY_WORK');
  });
});

describe('MAX_DAILY_AMPLITUDE', () => {
  it('reste muette quand la convention ne fixe rien', () => {
    // Inventer une borne ferait désactiver l'ensemble des alertes par le
    // premier manager excédé.
    const ctx = context({
      shifts: [
        shift('2026-08-10', '06:00', '09:00'),
        shift('2026-08-10', '18:00', '22:00'),
      ],
    });
    expect(codes(ctx)).not.toContain('MAX_DAILY_AMPLITUDE');
  });

  it('déclenche dès qu’une amplitude est paramétrée', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '06:00', '09:00'),
        shift('2026-08-10', '18:00', '22:00'),
      ],
      parameters: { ...IDCC_1517_PARAMETERS, maxDailyAmplitudeMinutes: 13 * 60 },
    });
    expect(codes(ctx)).toContain('MAX_DAILY_AMPLITUDE');
  });

  it('accepte l’amplitude limite exacte', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '06:00', '09:00'),
        shift('2026-08-10', '17:00', '19:00'),
      ],
      parameters: { ...IDCC_1517_PARAMETERS, maxDailyAmplitudeMinutes: 13 * 60 },
    });
    expect(codes(ctx)).not.toContain('MAX_DAILY_AMPLITUDE');
  });
});

describe('MIN_DAILY_REST', () => {
  it('accepte exactement 11 h de repos', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '09:00', '20:00'),
        shift('2026-08-11', '07:00', '12:00'),
      ],
    });
    expect(codes(ctx)).not.toContain('MIN_DAILY_REST');
  });

  it('déclenche à 10 h 59', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '09:00', '20:00'),
        shift('2026-08-11', '06:59', '12:00'),
      ],
    });
    expect(codes(ctx)).toContain('MIN_DAILY_REST');
  });

  it('voit le repos à cheval sur deux semaines', () => {
    // Le repos entre dimanche soir et lundi matin appartient à deux semaines.
    // Une évaluation limitée à sept jours manquerait exactement ce cas.
    const ctx = context({
      shifts: [
        shift('2026-08-09', '14:00', '22:00'),
        shift('2026-08-10', '07:00', '15:00'),
      ],
    });
    expect(codes(ctx)).toContain('MIN_DAILY_REST');
  });

  it('mesure le repos entre instants, pas à l’horloge', () => {
    // Nuit du 25 octobre 2026 : retour à l'heure d'hiver. De 21 h à 07 h il
    // s'écoule 11 h réelles, alors que l'horloge n'affiche que 10 h d'écart.
    const ctx = context({
      week: { isoYear: 2026, isoWeek: 43 },
      shifts: [
        shift('2026-10-24', '13:00', '21:00'),
        shift('2026-10-25', '07:00', '12:00'),
      ],
    });
    expect(codes(ctx)).not.toContain('MIN_DAILY_REST');
  });
});

describe('MIN_WEEKLY_REST', () => {
  it('accepte 35 h de repos continu', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '09:00', '17:00'),
        shift('2026-08-11', '09:00', '17:00'),
        shift('2026-08-12', '09:00', '17:00'),
        shift('2026-08-13', '09:00', '17:00'),
        // Vendredi 17 h → dimanche 10 h : 41 h.
        shift('2026-08-16', '10:00', '17:00'),
      ],
    });
    expect(codes(ctx)).not.toContain('MIN_WEEKLY_REST');
  });

  it('déclenche quand le plus long repos tombe sous 35 h', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '09:00', '17:00'),
        shift('2026-08-11', '09:00', '17:00'),
        shift('2026-08-12', '09:00', '17:00'),
        shift('2026-08-13', '09:00', '17:00'),
        shift('2026-08-14', '09:00', '17:00'),
        shift('2026-08-15', '09:00', '17:00'),
        shift('2026-08-16', '09:00', '17:00'),
      ],
    });
    expect(codes(ctx)).toContain('MIN_WEEKLY_REST');
  });
});

describe('MAX_WEEKLY_WORK_ABSOLUTE', () => {
  it('accepte exactement 48 h', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '08:00', '16:00'),
        shift('2026-08-11', '08:00', '16:00'),
        shift('2026-08-12', '08:00', '16:00'),
        shift('2026-08-13', '08:00', '16:00'),
        shift('2026-08-14', '08:00', '16:00'),
        shift('2026-08-15', '08:00', '16:00'),
      ],
    });
    expect(codes(ctx)).not.toContain('MAX_WEEKLY_WORK_ABSOLUTE');
  });

  it('déclenche à 48 h 01', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '08:00', '16:00'),
        shift('2026-08-11', '08:00', '16:00'),
        shift('2026-08-12', '08:00', '16:00'),
        shift('2026-08-13', '08:00', '16:00'),
        shift('2026-08-14', '08:00', '16:00'),
        shift('2026-08-15', '08:00', '16:01'),
      ],
    });
    expect(codes(ctx)).toContain('MAX_WEEKLY_WORK_ABSOLUTE');
  });
});

describe('MAX_WEEKLY_WORK_AVERAGED', () => {
  const fullWeek = [
    shift('2026-08-10', '08:00', '16:00'),
    shift('2026-08-11', '08:00', '16:00'),
    shift('2026-08-12', '08:00', '16:00'),
    shift('2026-08-13', '08:00', '16:00'),
    shift('2026-08-14', '08:00', '16:00'),
    shift('2026-08-15', '08:00', '16:00'),
  ];

  it('se tait sur une fenêtre incomplète', () => {
    // Les premières semaines d'un contrat déclencheraient sinon une alerte à
    // chaque planning, sans qu'aucune moyenne ne soit encore mesurable.
    const ctx = context({
      shifts: fullWeek,
      previousWeeklyMinutes: [48 * 60, 48 * 60],
    });
    expect(codes(ctx)).not.toContain('MAX_WEEKLY_WORK_AVERAGED');
  });

  it('accepte une moyenne de 44 h exactement', () => {
    const ctx = context({
      shifts: fullWeek,
      // 48 h cette semaine, 43 h 38 sur les onze précédentes → moyenne 44 h.
      previousWeeklyMinutes: Array.from({ length: 11 }, () => 2640 - 22),
    });
    expect(codes(ctx)).not.toContain('MAX_WEEKLY_WORK_AVERAGED');
  });

  it('déclenche au-delà de la moyenne', () => {
    const ctx = context({
      shifts: fullWeek,
      previousWeeklyMinutes: Array.from({ length: 11 }, () => 45 * 60),
    });
    expect(codes(ctx)).toContain('MAX_WEEKLY_WORK_AVERAGED');
  });
});

describe('MAX_CONSECUTIVE_WORK_DAYS', () => {
  const days = (isoDates: string[]) =>
    isoDates.map((date) => shift(date, '09:00', '12:00'));

  it('accepte exactement 10 jours d’affilée', () => {
    const ctx = context({
      shifts: days([
        '2026-08-07',
        '2026-08-08',
        '2026-08-09',
        '2026-08-10',
        '2026-08-11',
        '2026-08-12',
        '2026-08-13',
        '2026-08-14',
        '2026-08-15',
        '2026-08-16',
      ]),
    });
    expect(codes(ctx)).not.toContain('MAX_CONSECUTIVE_WORK_DAYS');
  });

  it('déclenche au onzième', () => {
    const ctx = context({
      shifts: days([
        '2026-08-06',
        '2026-08-07',
        '2026-08-08',
        '2026-08-09',
        '2026-08-10',
        '2026-08-11',
        '2026-08-12',
        '2026-08-13',
        '2026-08-14',
        '2026-08-15',
        '2026-08-16',
      ]),
    });
    expect(codes(ctx)).toContain('MAX_CONSECUTIVE_WORK_DAYS');
  });

  it('remet le compteur à zéro sur un jour de repos', () => {
    const ctx = context({
      shifts: days([
        '2026-08-06',
        '2026-08-07',
        '2026-08-08',
        '2026-08-09',
        '2026-08-10',
        // repos le 11
        '2026-08-12',
        '2026-08-13',
        '2026-08-14',
        '2026-08-15',
        '2026-08-16',
      ]),
    });
    expect(codes(ctx)).not.toContain('MAX_CONSECUTIVE_WORK_DAYS');
  });
});

describe('MIN_BREAK_AFTER_THRESHOLD', () => {
  it('accepte exactement 6 h sans pause', () => {
    const ctx = context({ shifts: [shift('2026-08-10', '09:00', '15:00')] });
    expect(codes(ctx)).not.toContain('MIN_BREAK_AFTER_THRESHOLD');
  });

  it('déclenche à 6 h 01 sans pause', () => {
    const ctx = context({ shifts: [shift('2026-08-10', '09:00', '15:01')] });
    expect(codes(ctx)).toContain('MIN_BREAK_AFTER_THRESHOLD');
  });

  it('accepte 20 min de pause exactement', () => {
    const ctx = context({
      shifts: [shift('2026-08-10', '09:00', '17:00', 20)],
    });
    expect(codes(ctx)).not.toContain('MIN_BREAK_AFTER_THRESHOLD');
  });

  it('déclenche à 19 min', () => {
    const ctx = context({
      shifts: [shift('2026-08-10', '09:00', '17:00', 19)],
    });
    expect(codes(ctx)).toContain('MIN_BREAK_AFTER_THRESHOLD');
  });
});

describe('PART_TIME_MIN_WEEKLY_HOURS', () => {
  const partTime = (minutes: number, derogation: string | null = null) =>
    context({
      contract: {
        workTimeArrangement: 'HOURLY',
        weeklyMinutes: minutes,
        forfaitDaysPerYear: null,
        partTimeDerogationCode: derogation,
      },
    });

  it('accepte 24 h exactement', () => {
    expect(codes(partTime(24 * 60))).not.toContain(
      'PART_TIME_MIN_WEEKLY_HOURS',
    );
  });

  it('déclenche à 23 h 59', () => {
    expect(codes(partTime(24 * 60 - 1))).toContain(
      'PART_TIME_MIN_WEEKLY_HOURS',
    );
  });

  it('applique la dérogation conventionnelle', () => {
    expect(codes(partTime(21 * 60, 'AIDE_ETALAGISTE'))).not.toContain(
      'PART_TIME_MIN_WEEKLY_HOURS',
    );
    expect(codes(partTime(21 * 60 - 1, 'AIDE_ETALAGISTE'))).toContain(
      'PART_TIME_MIN_WEEKLY_HOURS',
    );
  });

  it('ignore un temps plein et un contrat sans durée', () => {
    expect(codes(partTime(35 * 60))).not.toContain(
      'PART_TIME_MIN_WEEKLY_HOURS',
    );
    // Extra ou intermittent : il n'y a pas de durée contractuelle à comparer.
    expect(codes(partTime(0))).not.toContain('PART_TIME_MIN_WEEKLY_HOURS');
  });
});

describe('CONTRACT_HOURS_DEVIATION', () => {
  it('tolère l’écart paramétré', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '09:00', '17:00'),
        shift('2026-08-11', '09:00', '17:00'),
        shift('2026-08-12', '09:00', '17:00'),
        shift('2026-08-13', '09:00', '17:00'),
        // 4 × 8 h + 3 h 30 = 35 h 30, soit 30 min d'écart : la tolérance.
        shift('2026-08-14', '09:00', '12:30'),
      ],
    });
    expect(codes(ctx)).not.toContain('CONTRACT_HOURS_DEVIATION');
  });

  it('déclenche au-delà', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '09:00', '17:00'),
        shift('2026-08-11', '09:00', '17:00'),
        shift('2026-08-12', '09:00', '17:00'),
        shift('2026-08-13', '09:00', '17:00'),
        shift('2026-08-14', '09:00', '12:31'),
      ],
    });
    expect(codes(ctx)).toContain('CONTRACT_HOURS_DEVIATION');
  });

  it('signale aussi la sous-réalisation', () => {
    // Un salarié à qui on ne donne pas ses heures est un problème au moins
    // aussi sérieux qu'un salarié qui en fait trop.
    const ctx = context({ shifts: [shift('2026-08-10', '09:00', '17:00')] });
    expect(codes(ctx)).toContain('CONTRACT_HOURS_DEVIATION');
  });
});

describe('OVERLAPPING_SHIFTS', () => {
  it('bloque deux créneaux qui se recouvrent', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '09:00', '17:00'),
        shift('2026-08-10', '16:00', '20:00'),
      ],
    });
    const result = evaluate(ctx);
    expect(result.blocking.map((entry) => entry.ruleCode)).toContain(
      'OVERLAPPING_SHIFTS',
    );
  });

  it('accepte deux créneaux jointifs', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-10', '09:00', '13:00'),
        shift('2026-08-10', '13:00', '17:00'),
      ],
    });
    expect(codes(ctx)).not.toContain('OVERLAPPING_SHIFTS');
  });

  it('ignore les besoins non couverts', () => {
    // Deux besoins non couverts sur la même plage sont légitimes : c'est
    // « il manque deux personnes », pas un doublon.
    const ctx = context({
      shifts: [
        shift('2026-08-10', '09:00', '17:00', 0, false),
        shift('2026-08-10', '09:00', '17:00', 0, false),
      ],
    });
    expect(codes(ctx)).not.toContain('OVERLAPPING_SHIFTS');
  });
});

describe('SHIFT_DURING_ABSENCE', () => {
  it('bloque un créneau posé pendant une absence', () => {
    const ctx = context({
      shifts: [shift('2026-08-12', '09:00', '17:00')],
      absences: [
        { startDate: '2026-08-10', endDate: '2026-08-14', label: 'Congés payés' },
      ],
    });
    expect(evaluate(ctx).blocking.map((entry) => entry.ruleCode)).toContain(
      'SHIFT_DURING_ABSENCE',
    );
  });

  it('traite endDate comme le dernier jour d’absence', () => {
    // Confondre `endDate` avec la date de reprise ferait accepter un créneau
    // le dernier jour de congé, ou refuser le jour du retour.
    const last = context({
      shifts: [shift('2026-08-14', '09:00', '17:00')],
      absences: [
        { startDate: '2026-08-10', endDate: '2026-08-14', label: 'Congés payés' },
      ],
    });
    expect(codes(last)).toContain('SHIFT_DURING_ABSENCE');

    const back = context({
      shifts: [shift('2026-08-15', '09:00', '17:00')],
      absences: [
        { startDate: '2026-08-10', endDate: '2026-08-14', label: 'Congés payés' },
      ],
    });
    expect(codes(back)).not.toContain('SHIFT_DURING_ABSENCE');
  });
});

describe('SUNDAY_WORK', () => {
  it('annonce la majoration **et** le repos compensateur', () => {
    // L3132-27 impose les deux. N'en produire qu'un serait un manquement, pas
    // une simplification — c'est le cœur du critère d'acceptation.
    const ctx = context({ shifts: [shift('2026-08-16', '10:00', '18:00')] });
    const found = evaluate(ctx).violations.find(
      (entry) => entry.ruleCode === 'SUNDAY_WORK',
    );

    expect(found).toBeDefined();
    expect(found?.context.premiumPercent).toBe(100);
    expect(found?.context.compensatoryRestMinutes).toBe(8 * 60);
  });

  it('ne dit rien quand le dimanche est libre', () => {
    const ctx = context({ shifts: [shift('2026-08-15', '10:00', '18:00')] });
    expect(codes(ctx)).not.toContain('SUNDAY_WORK');
  });

  it('reste informative, jamais bloquante', () => {
    // Le refus d'un salarié de travailler le dimanche ne peut être sanctionné :
    // l'outil signale, il ne tranche pas.
    const ctx = context({ shifts: [shift('2026-08-16', '10:00', '18:00')] });
    expect(evaluate(ctx).blocking).toHaveLength(0);
  });
});

describe('SUNDAY_MAYOR_QUOTA', () => {
  it('accepte le douzième dimanche', () => {
    const ctx = context({
      shifts: [shift('2026-08-16', '10:00', '18:00')],
      sundaysWorkedBefore: 11,
    });
    expect(codes(ctx)).not.toContain('SUNDAY_MAYOR_QUOTA');
  });

  it('déclenche au treizième', () => {
    const ctx = context({
      shifts: [shift('2026-08-16', '10:00', '18:00')],
      sundaysWorkedBefore: 12,
    });
    expect(codes(ctx)).toContain('SUNDAY_MAYOR_QUOTA');
  });

  it('déclenche sur un dimanche hors liste', () => {
    const ctx = context({
      shifts: [shift('2026-08-16', '10:00', '18:00')],
      authorisedSundays: ['2026-08-09', '2026-08-23'],
    });
    expect(codes(ctx)).toContain('SUNDAY_MAYOR_QUOTA');
  });

  it('se tait sur un dimanche de la liste', () => {
    const ctx = context({
      shifts: [shift('2026-08-16', '10:00', '18:00')],
      authorisedSundays: ['2026-08-16'],
    });
    expect(codes(ctx)).not.toContain('SUNDAY_MAYOR_QUOTA');
  });
});

describe('HOLIDAY_WORK', () => {
  it('produit l’indemnité de 50 % sur un jour férié ordinaire', () => {
    const ctx = context({
      shifts: [shift('2026-08-15', '10:00', '18:00')],
      holidays: ['2026-08-15'],
    });
    const found = evaluate(ctx).violations.find(
      (entry) => entry.ruleCode === 'HOLIDAY_WORK',
    );
    expect(found?.context.premiumPercent).toBe(50);
    expect(found?.context.labourDay).toBe(false);
  });

  it('double la majoration le 1er mai', () => {
    const ctx = context({
      week: { isoYear: 2026, isoWeek: 18 },
      shifts: [shift('2026-05-01', '10:00', '18:00')],
      holidays: ['2026-05-01'],
    });
    const found = evaluate(ctx).violations.find(
      (entry) => entry.ruleCode === 'HOLIDAY_WORK',
    );
    expect(found?.context.premiumPercent).toBe(100);
    expect(found?.context.labourDay).toBe(true);
  });

  it('ne propose pas la substitution en repos d’office', () => {
    // La convention la subordonne à une demande du salarié : la proposer
    // automatiquement reviendrait à décider à sa place.
    const ctx = context({
      shifts: [shift('2026-08-15', '10:00', '18:00')],
      holidays: ['2026-08-15'],
    });
    const found = evaluate(ctx).violations.find(
      (entry) => entry.ruleCode === 'HOLIDAY_WORK',
    );
    expect(found?.context.substitutionRestMinutes).toBeUndefined();
  });
});

describe('forfait jours', () => {
  const forfaitContext = (over: Partial<ComplianceContext> = {}) =>
    context({
      contract: {
        workTimeArrangement: 'FORFAIT_JOURS',
        weeklyMinutes: 0,
        forfaitDaysPerYear: 218,
        partTimeDerogationCode: null,
      },
      forfait: { daysUsed: 100, lastWorkloadReviewAt: new Date('2026-06-01') },
      ...over,
    });

  it('ne déclenche aucune règle horaire', () => {
    // Les appliquer produirait un bruit d'alertes qui masquerait le vrai
    // contrôle — repos et charge de travail.
    const ctx = forfaitContext({
      shifts: [
        shift('2026-08-10', '07:00', '20:00'),
        shift('2026-08-11', '07:00', '20:00'),
        shift('2026-08-12', '07:00', '20:00'),
        shift('2026-08-13', '07:00', '20:00'),
        shift('2026-08-14', '07:00', '20:00'),
      ],
    });
    const found = codes(ctx);

    for (const rule of [
      'MAX_DAILY_WORK',
      'MAX_WEEKLY_WORK_ABSOLUTE',
      'MAX_WEEKLY_WORK_AVERAGED',
      'MIN_BREAK_AFTER_THRESHOLD',
      'PART_TIME_MIN_WEEKLY_HOURS',
      'CONTRACT_HOURS_DEVIATION',
    ] as const) {
      expect(found, `${rule} ne devrait pas s'appliquer`).not.toContain(rule);
    }
  });

  it('reste soumis aux repos', () => {
    const ctx = forfaitContext({
      shifts: [
        shift('2026-08-10', '09:00', '22:00'),
        shift('2026-08-11', '06:00', '20:00'),
      ],
    });
    const found = codes(ctx);
    expect(found).toContain('MIN_DAILY_REST');
    expect(found).toContain('FORFAIT_REST_INSUFFICIENT');
  });

  it('accepte le plafond exact et refuse un jour de plus', () => {
    const atCap = forfaitContext({
      forfait: { daysUsed: 213, lastWorkloadReviewAt: new Date('2026-06-01') },
      shifts: [
        shift('2026-08-10', '09:00', '17:00'),
        shift('2026-08-11', '09:00', '17:00'),
        shift('2026-08-12', '09:00', '17:00'),
        shift('2026-08-13', '09:00', '17:00'),
        shift('2026-08-14', '09:00', '17:00'),
      ],
    });
    expect(codes(atCap)).not.toContain('FORFAIT_DAYS_EXCEEDED');

    const overCap = forfaitContext({
      forfait: { daysUsed: 214, lastWorkloadReviewAt: new Date('2026-06-01') },
      shifts: [
        shift('2026-08-10', '09:00', '17:00'),
        shift('2026-08-11', '09:00', '17:00'),
        shift('2026-08-12', '09:00', '17:00'),
        shift('2026-08-13', '09:00', '17:00'),
        shift('2026-08-14', '09:00', '17:00'),
      ],
    });
    expect(codes(overCap)).toContain('FORFAIT_DAYS_EXCEEDED');
  });

  it('exige un entretien de charge dans l’intervalle', () => {
    const stale = forfaitContext({
      forfait: { daysUsed: 10, lastWorkloadReviewAt: new Date('2025-07-01') },
      shifts: [shift('2026-08-10', '09:00', '17:00')],
    });
    expect(codes(stale)).toContain('FORFAIT_WORKLOAD_REVIEW_MISSING');

    const never = forfaitContext({
      forfait: { daysUsed: 10, lastWorkloadReviewAt: null },
      shifts: [shift('2026-08-10', '09:00', '17:00')],
    });
    expect(codes(never)).toContain('FORFAIT_WORKLOAD_REVIEW_MISSING');
  });
});

describe('le moteur ne code aucune valeur en dur', () => {
  it('produit des résultats différents avec deux jeux de paramètres', () => {
    const shifts = [shift('2026-08-10', '08:00', '18:30', 0)];

    const strict = context({
      shifts,
      parameters: { ...IDCC_1517_PARAMETERS, maxDailyWorkMinutes: 8 * 60 },
    });
    const lenient = context({
      shifts,
      parameters: { ...IDCC_1517_PARAMETERS, maxDailyWorkMinutes: 12 * 60 },
    });

    expect(codes(strict)).toContain('MAX_DAILY_WORK');
    expect(codes(lenient)).not.toContain('MAX_DAILY_WORK');
  });

  it('suit le paramètre de repos quotidien', () => {
    const shifts = [
      shift('2026-08-10', '09:00', '20:00'),
      shift('2026-08-11', '07:30', '12:00'),
    ];
    const strict = context({
      shifts,
      parameters: { ...IDCC_1517_PARAMETERS, minDailyRestMinutes: 12 * 60 },
    });
    const lenient = context({
      shifts,
      parameters: { ...IDCC_1517_PARAMETERS, minDailyRestMinutes: 9 * 60 },
    });

    expect(codes(strict)).toContain('MIN_DAILY_REST');
    expect(codes(lenient)).not.toContain('MIN_DAILY_REST');
  });
});

describe('robustesse du moteur', () => {
  it('évalue toutes les règles déclarées', () => {
    expect(Object.keys(evaluate(context()))).toContain('violations');
    expect(RULE_CODES).toHaveLength(18);
  });

  it('trie du plus grave au plus anodin', () => {
    const ctx = context({
      shifts: [
        shift('2026-08-16', '10:00', '18:00'),
        shift('2026-08-16', '17:00', '20:00'),
      ],
    });
    const sorted = sortViolations(evaluate(ctx).violations);
    expect(sorted[0]?.severity).toBe('BLOCKING');
  });

  it('ne rend rien sur une semaine vide', () => {
    // Une grille vierge ne doit pas s'ouvrir couverte d'alertes : le seul
    // constat légitime serait l'écart au contrat, qui n'a pas de sens tant que
    // rien n'est planifié.
    const empty = evaluate(
      context({
        contract: {
          workTimeArrangement: 'HOURLY',
          weeklyMinutes: 0,
          forfaitDaysPerYear: null,
          partTimeDerogationCode: null,
        },
      }),
    );
    expect(empty.violations).toHaveLength(0);
    expect(empty.failures).toHaveLength(0);
  });
});
