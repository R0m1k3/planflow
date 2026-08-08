import { evaluate } from '@/domain/compliance/engine';
import {
  parseAgreementParameters,
  type AgreementParameters,
} from '@/domain/compliance/parameters';
import type {
  ComplianceContext,
  ComplianceShift,
  Violation,
} from '@/domain/compliance/types';
import { shiftMinutes } from '@/domain/counters/week';
import {
  nextIsoWeek,
  previousIsoWeek,
  weekBounds,
  weekDates,
  zonedDate,
  type IsoWeek,
} from '@/domain/planning/week';
import type { ScopedClient } from '@/server/tenant';

/**
 * Branchement du moteur de règles sur la base — PLAN.md §6.5.
 *
 * Ce module fait une seule chose : rassembler le contexte d'évaluation et
 * ranger les constats. Il ne contient **aucune règle** — c'est ce qui permet de
 * tester les règles sans base et de tester le branchement sans les rejouer.
 */

export interface AgreementVersion {
  id: string;
  idcc: string;
  version: number;
  effectiveFrom: Date;
  parameters: AgreementParameters;
}

/**
 * Version de convention applicable à une date.
 *
 * La plus récente **dont la date d'effet est antérieure** — pas simplement la
 * dernière. Recalculer une semaine de mars avec les paramètres publiés en juin
 * changerait le passé, ce que la matrice n° 1 interdit.
 */
export async function agreementFor(
  db: ScopedClient,
  onDate: Date,
): Promise<AgreementVersion | null> {
  const row = await db.collectiveAgreement.findFirst({
    where: { effectiveFrom: { lte: onDate } },
    orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
  });
  if (!row) return null;

  return {
    id: row.id,
    idcc: row.idcc,
    version: row.version,
    effectiveFrom: row.effectiveFrom,
    parameters: parseAgreementParameters(row.parameters),
  };
}

interface LoadedShift {
  id: string;
  membershipId: string | null;
  startAt: Date;
  endAt: Date;
  breakMinutes: number;
}

/**
 * Évalue la semaine d'une équipe et remplace ses constats.
 *
 * Les acquittements sont **reportés** sur les constats identiques : un manager
 * qui a justifié une alerte ne doit pas la revoir surgir parce qu'un collègue a
 * déplacé un créneau ailleurs dans la semaine.
 */
export async function evaluateSchedule(
  db: ScopedClient,
  scheduleId: string,
): Promise<Violation[]> {
  const schedule = await db.weeklySchedule.findUnique({
    where: { id: scheduleId },
  });
  if (!schedule) return [];

  const location = await db.location.findUnique({
    where: { id: schedule.locationId },
    select: { timezone: true },
  });
  if (!location) return [];

  const week: IsoWeek = {
    isoYear: schedule.isoYear,
    isoWeek: schedule.isoWeek,
  };
  const dates = weekDates(week);
  const agreement = await agreementFor(
    db,
    new Date(`${dates[0]}T00:00:00Z`),
  );
  // Sans convention chargée, on ne prétend pas contrôler : mieux vaut aucun
  // constat qu'un contrôle silencieusement partiel.
  if (!agreement) return [];

  const contexts = await buildContexts(
    db,
    schedule.teamId,
    week,
    location.timezone,
    agreement.parameters,
  );

  const violations = contexts.flatMap((context) => {
    const result = evaluate(context);
    return result.violations.map((entry) => ({
      ...entry,
      membershipId: context.membershipId,
    }));
  });

  const previous = await db.complianceViolation.findMany({
    where: { weeklyScheduleId: scheduleId },
  });
  const acknowledgedKeys = new Map(
    previous
      .filter((entry) => entry.acknowledgedAt !== null)
      .map((entry) => [
        violationKey(
          entry.membershipId,
          entry.ruleCode,
          entry.localDate?.toISOString().slice(0, 10) ?? null,
        ),
        entry,
      ]),
  );

  await db.complianceViolation.deleteMany({
    where: { weeklyScheduleId: scheduleId },
  });

  for (const entry of violations) {
    const carried = acknowledgedKeys.get(
      violationKey(entry.membershipId, entry.ruleCode, entry.localDate),
    );

    await db.complianceViolation.create({
      data: {
        weeklyScheduleId: scheduleId,
        membershipId: entry.membershipId,
        ruleCode: entry.ruleCode,
        severity: entry.severity,
        localDate: entry.localDate ? new Date(`${entry.localDate}T00:00:00Z`) : null,
        message: entry.message,
        context: entry.context,
        shiftIds: entry.shiftIds,
        agreementId: agreement.id,
        acknowledgedBy: carried?.acknowledgedBy ?? null,
        acknowledgedAt: carried?.acknowledgedAt ?? null,
        acknowledgementReason: carried?.acknowledgementReason ?? null,
      } as never,
    });
  }

  return violations;
}

function violationKey(
  membershipId: string | null,
  ruleCode: string,
  localDate: string | null,
): string {
  return `${membershipId ?? '-'}|${ruleCode}|${localDate ?? '-'}`;
}

/**
 * Évalue une semaine **et ses voisines**.
 *
 * Le repos quotidien se mesure entre dimanche soir et lundi matin : déplacer un
 * créneau du lundi peut créer une infraction dans la semaine précédente, qui
 * resterait sinon marquée conforme.
 */
export async function evaluateAround(
  db: ScopedClient,
  scheduleId: string,
): Promise<void> {
  const schedule = await db.weeklySchedule.findUnique({
    where: { id: scheduleId },
    select: { teamId: true, isoYear: true, isoWeek: true },
  });
  if (!schedule) return;

  const current = { isoYear: schedule.isoYear, isoWeek: schedule.isoWeek };
  const neighbours = [previousIsoWeek(current), nextIsoWeek(current)];

  await evaluateSchedule(db, scheduleId);

  for (const week of neighbours) {
    const sibling = await db.weeklySchedule.findUnique({
      where: {
        teamId_isoYear_isoWeek: {
          teamId: schedule.teamId,
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
        },
      },
      select: { id: true },
    });
    if (sibling) await evaluateSchedule(db, sibling.id);
  }
}

/** Un contexte par salarié rattaché à l'équipe. */
async function buildContexts(
  db: ScopedClient,
  teamId: string,
  week: IsoWeek,
  timeZone: string,
  parameters: AgreementParameters,
): Promise<ComplianceContext[]> {
  const assignments = await db.teamMember.findMany({
    where: { teamId },
    include: {
      membership: {
        include: {
          contracts: {
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { locationId: true },
  });
  if (!team) return [];

  const dates = weekDates(week);
  const first = dates[0] as string;
  const last = dates[6] as string;

  // Fenêtre élargie aux semaines voisines : c'est là que se mesurent les repos
  // de bord, qu'une lecture de sept jours manquerait par construction.
  const before = weekBounds(previousIsoWeek(week), timeZone);
  const after = weekBounds(nextIsoWeek(week), timeZone);

  const shifts = await db.shift.findMany({
    where: {
      membershipId: {
        in: assignments.map((assignment) => assignment.membershipId),
      },
      startAt: { gte: before.from, lt: after.to },
    },
    select: {
      id: true,
      membershipId: true,
      startAt: true,
      endAt: true,
      breakMinutes: true,
    },
  });

  const unassigned = await db.shift.findMany({
    where: {
      membershipId: null,
      startAt: { gte: before.from, lt: after.to },
      schedule: { teamId },
    },
    select: {
      id: true,
      membershipId: true,
      startAt: true,
      endAt: true,
      breakMinutes: true,
    },
  });

  const holidays = await db.holiday.findMany({
    where: {
      locationId: team.locationId,
      localDate: {
        gte: new Date(`${first}T00:00:00Z`),
        lte: new Date(`${last}T00:00:00Z`),
      },
    },
    select: { localDate: true },
  });

  const year = Number(first.slice(0, 4));
  const authorisedSundays = await db.authorisedSunday.findMany({
    where: {
      locationId: team.locationId,
      localDate: {
        gte: new Date(`${year}-01-01T00:00:00Z`),
        lte: new Date(`${year}-12-31T00:00:00Z`),
      },
    },
    select: { localDate: true },
  });

  const byMember = new Map<string, LoadedShift[]>();
  for (const shift of [...shifts, ...unassigned]) {
    const key = shift.membershipId ?? '__unassigned__';
    const list = byMember.get(key) ?? [];
    list.push(shift);
    byMember.set(key, list);
  }

  return Promise.all(
    assignments.map(async (assignment) => {
      const contract = assignment.membership.contracts[0];
      const own = byMember.get(assignment.membershipId) ?? [];

      const complianceShifts: ComplianceShift[] = own.map((shift) => ({
        id: shift.id,
        startAt: shift.startAt,
        endAt: shift.endAt,
        breakMinutes: shift.breakMinutes,
        assigned: shift.membershipId !== null,
      }));

      const sundaysWorkedBefore = await countSundaysWorked(
        db,
        assignment.membershipId,
        year,
        timeZone,
        first,
      );

      return {
        week,
        timeZone,
        membershipId: assignment.membershipId,
        contract: {
          workTimeArrangement:
            contract?.workTimeArrangement === 'FORFAIT_JOURS'
              ? 'FORFAIT_JOURS'
              : 'HOURLY',
          weeklyMinutes: contract
            ? Math.round(Number(contract.weeklyHours.toString()) * 60)
            : 0,
          forfaitDaysPerYear: contract?.forfaitDaysPerYear
            ? Number(contract.forfaitDaysPerYear.toString())
            : null,
          partTimeDerogationCode: null,
        },
        shifts: complianceShifts,
        // Les absences arrivent avec WP-06 ; la règle est déjà écrite et
        // testée, elle attend seulement sa source.
        absences: [],
        holidays: holidays.map((holiday) =>
          holiday.localDate.toISOString().slice(0, 10),
        ),
        authorisedSundays: authorisedSundays.map((sunday) =>
          sunday.localDate.toISOString().slice(0, 10),
        ),
        sundaysWorkedBefore,
        previousWeeklyMinutes: await previousWeeks(
          db,
          assignment.membershipId,
          week,
          timeZone,
          parameters.averagedWeeklyWork.windowWeeks - 1,
        ),
        forfait: null,
        parameters,
      } satisfies ComplianceContext;
    }),
  );
}

/** Dimanches déjà travaillés dans l'année, avant la semaine évaluée. */
async function countSundaysWorked(
  db: ScopedClient,
  membershipId: string,
  year: number,
  timeZone: string,
  beforeDate: string,
): Promise<number> {
  const shifts = await db.shift.findMany({
    where: {
      membershipId,
      startAt: {
        gte: new Date(`${year}-01-01T00:00:00Z`),
        lt: new Date(`${beforeDate}T00:00:00Z`),
      },
    },
    select: { startAt: true },
  });

  const sundays = new Set(
    shifts
      .map((shift) => zonedDate(shift.startAt, timeZone))
      .filter((date) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0),
  );
  return sundays.size;
}

/** Durées des semaines précédentes, la plus récente en tête. */
async function previousWeeks(
  db: ScopedClient,
  membershipId: string,
  week: IsoWeek,
  timeZone: string,
  count: number,
): Promise<number[]> {
  const result: number[] = [];
  let cursor = week;

  for (let index = 0; index < count; index += 1) {
    cursor = previousIsoWeek(cursor);
    const { from, to } = weekBounds(cursor, timeZone);
    const shifts = await db.shift.findMany({
      where: { membershipId, startAt: { gte: from, lt: to } },
      select: { startAt: true, endAt: true, breakMinutes: true },
    });

    // Une semaine sans créneau **enregistré** n'est pas une semaine à zéro
    // heure : c'est une semaine inconnue. La distinction compte pour la
    // moyenne glissante, qui serait sinon systématiquement tirée vers le bas.
    if (shifts.length === 0) break;

    result.push(
      shifts.reduce(
        (sum, shift) =>
          sum + shiftMinutes(shift.startAt, shift.endAt, shift.breakMinutes),
        0,
      ),
    );
  }

  return result;
}
