import { splitOvertime, splitComplementary } from '@/domain/compliance/overtime';
import { shiftMinutes } from '@/domain/counters/week';
import {
  PAYROLL_ELEMENTS,
  elementDefinition,
  type PayrollElementKey,
} from '@/domain/payroll/elements';
import type { SilaeLine } from '@/domain/payroll/silae';
import { monthDates, type Month } from '@/domain/planning/month';
import {
  isoWeekOf,
  weekBounds,
  zonedDate,
  zonedMidnight,
} from '@/domain/planning/week';
import { agreementFor } from '@/server/compliance/evaluate';
import type { ScopedClient } from '@/server/tenant';

/**
 * Construction des éléments de paie d'une période — PLAN.md §8.
 *
 * Les heures viennent des créneaux **réalisés quand ils le sont**, planifiés
 * sinon. Sans pointeuse, c'est le manager qui saisit le réalisé ; tant qu'il ne
 * l'a pas fait, le planifié est la meilleure information disponible, et
 * l'attendre indéfiniment ne produirait aucune paie.
 */

export interface PayrollRowElement {
  key: PayrollElementKey;
  label: string;
  /** Minutes pour les heures, jours entiers pour les jours. */
  value: number;
  unit: 'HOURS' | 'DAYS';
  silaeCode: string | null;
  confirmed: boolean;
}

export interface PayrollRow {
  membershipId: string;
  employeeNumber: string;
  silaeMatricule: string | null;
  name: string;
  forfaitJours: boolean;
  elements: PayrollRowElement[];
}

export interface PayrollPeriod {
  month: Month;
  startDate: string;
  endDate: string;
  location: { id: string; name: string; timezone: string };
  rows: PayrollRow[];
  /** Manques qui empêchent l'export : matricule absent, code non mappé. */
  blockers: string[];
}

/** Un salarié dont on suit le mois entier, minute par minute. */
interface Tally {
  workedMinutes: number;
  workedDays: Set<string>;
  sundayMinutes: number;
  holidayMinutes: number;
  /** Minutes travaillées par semaine ISO, pour découper les majorations. */
  byWeek: Map<string, number>;
}

export async function buildPayrollPeriod(
  db: ScopedClient,
  month: Month,
  locationId: string,
): Promise<PayrollPeriod | null> {
  const location = await db.location.findUnique({
    where: { id: locationId },
    select: { id: true, name: true, timezone: true },
  });
  if (!location) return null;

  const dates = monthDates(month);
  const startDate = dates[0] as string;
  const endDate = dates[dates.length - 1] as string;

  const from = zonedMidnight(startDate, location.timezone);
  const to = zonedMidnight(
    new Date(new Date(`${endDate}T00:00:00Z`).getTime() + 86_400_000)
      .toISOString()
      .slice(0, 10),
    location.timezone,
  );

  const agreement = await agreementFor(db, new Date(`${startDate}T00:00:00Z`));
  if (!agreement) return null;

  const teams = await db.team.findMany({
    where: { locationId, archivedAt: null },
    select: { id: true },
  });
  const assignments = await db.teamMember.findMany({
    where: { teamId: { in: teams.map((team) => team.id) } },
    include: {
      membership: {
        include: {
          profile: { select: { firstName: true, lastName: true } },
          contracts: {
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  const memberIds = [
    ...new Set(assignments.map((assignment) => assignment.membershipId)),
  ];

  const shifts = await db.shift.findMany({
    where: { membershipId: { in: memberIds }, startAt: { gte: from, lt: to } },
    select: {
      membershipId: true,
      startAt: true,
      endAt: true,
      breakMinutes: true,
      actualStartAt: true,
      actualEndAt: true,
      actualBreakMinutes: true,
    },
  });

  const holidays = await db.holiday.findMany({
    where: {
      locationId,
      localDate: {
        gte: new Date(`${startDate}T00:00:00Z`),
        lte: new Date(`${endDate}T00:00:00Z`),
      },
    },
    select: { localDate: true },
  });
  const holidayDates = new Set(
    holidays.map((holiday) => holiday.localDate.toISOString().slice(0, 10)),
  );

  const mappings = await db.silaeCodeMapping.findMany();
  const mappingByKey = new Map(
    mappings.map((mapping) => [mapping.sourceKey, mapping]),
  );

  const tallies = new Map<string, Tally>();
  const tallyFor = (membershipId: string): Tally => {
    const existing = tallies.get(membershipId);
    if (existing) return existing;
    const created: Tally = {
      workedMinutes: 0,
      workedDays: new Set(),
      sundayMinutes: 0,
      holidayMinutes: 0,
      byWeek: new Map(),
    };
    tallies.set(membershipId, created);
    return created;
  };

  for (const shift of shifts) {
    if (!shift.membershipId) continue;
    const tally = tallyFor(shift.membershipId);

    // Réalisé s'il est saisi, planifié sinon. Le réalisé prime dès qu'il
    // existe : c'est lui qui est dû.
    const start = shift.actualStartAt ?? shift.startAt;
    const end = shift.actualEndAt ?? shift.endAt;
    const pause = shift.actualBreakMinutes ?? shift.breakMinutes;
    const minutes = shiftMinutes(start, end, pause);
    if (minutes === 0) continue;

    const date = zonedDate(start, location.timezone);
    tally.workedMinutes += minutes;
    tally.workedDays.add(date);

    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (weekday === 0) tally.sundayMinutes += minutes;
    if (holidayDates.has(date)) tally.holidayMinutes += minutes;

    // Les majorations se calculent par semaine, pas sur le mois : 45 h une
    // semaine et 25 h la suivante ne font pas 70 h sans majoration.
    const week = isoWeekOf(start);
    const key = `${week.isoYear}-${week.isoWeek}`;
    tally.byWeek.set(key, (tally.byWeek.get(key) ?? 0) + minutes);
  }

  const rows: PayrollRow[] = [];
  const blockers = new Set<string>();

  for (const assignment of assignments) {
    const membership = assignment.membership;
    const contract = membership.contracts[0];
    const tally = tallies.get(assignment.membershipId);
    const forfaitJours = contract?.workTimeArrangement === 'FORFAIT_JOURS';

    const weeklyMinutes = contract
      ? Math.round(Number(contract.weeklyHours.toString()) * 60)
      : 0;
    // Durée mensuelle contractuelle : 35 h hebdomadaires valent 151,67 h par
    // mois, soit 52 semaines réparties sur 12 mois.
    const monthlyContractMinutes = Math.round((weeklyMinutes * 52) / 12);

    const elements: PayrollRowElement[] = [];
    const push = (key: PayrollElementKey, value: number) => {
      if (value <= 0) return;
      const definition = elementDefinition(key);
      const mapping = mappingByKey.get(key);
      elements.push({
        key,
        label: definition.label,
        value,
        unit: definition.unit,
        silaeCode: mapping?.silaeCode ?? null,
        confirmed: mapping?.confirmed ?? false,
      });
    };

    if (forfaitJours) {
      // Les jours de forfait ne sont pas des heures : les exporter comme telles
      // produirait une paie fausse (PLAN.md §6.4).
      push(PAYROLL_ELEMENTS.FORFAIT_DAYS, tally?.workedDays.size ?? 0);
    } else {
      push(PAYROLL_ELEMENTS.WORKED_DAYS, tally?.workedDays.size ?? 0);
      push(PAYROLL_ELEMENTS.WORKED_HOURS, tally?.workedMinutes ?? 0);

      const missing = monthlyContractMinutes - (tally?.workedMinutes ?? 0);
      // Un salarié sous contrat sans aucun créneau planifié apparaît quand
      // même, avec sa durée contractuelle entière en heures manquantes :
      // l'export de référence contient exactement ce cas.
      push(PAYROLL_ELEMENTS.MISSING_HOURS, missing);

      let overtime25 = 0;
      let overtime50 = 0;
      let complementary10 = 0;
      let complementary25 = 0;

      for (const weekMinutes of tally?.byWeek.values() ?? []) {
        if (weeklyMinutes > 0 && weeklyMinutes < agreement.parameters.weeklyReferenceMinutes) {
          const split = splitComplementary(
            weekMinutes,
            weeklyMinutes,
            agreement.parameters,
          );
          complementary10 += split.firstTierMinutes;
          complementary25 += split.beyondMinutes + split.overCapMinutes;
        } else {
          const split = splitOvertime(weekMinutes, agreement.parameters);
          for (const slice of split.slices) {
            if (slice.ratePercent >= 50) overtime50 += slice.minutes;
            else overtime25 += slice.minutes;
          }
        }
      }

      push(PAYROLL_ELEMENTS.OVERTIME_25, overtime25);
      push(PAYROLL_ELEMENTS.OVERTIME_50, overtime50);
      push(PAYROLL_ELEMENTS.COMPLEMENTARY_10, complementary10);
      push(PAYROLL_ELEMENTS.COMPLEMENTARY_25, complementary25);
    }

    push(PAYROLL_ELEMENTS.SUNDAY_HOURS, tally?.sundayMinutes ?? 0);
    push(PAYROLL_ELEMENTS.HOLIDAY_HOURS, tally?.holidayMinutes ?? 0);

    if (elements.length === 0) continue;

    const name =
      `${membership.profile?.firstName ?? ''} ${membership.profile?.lastName ?? membership.employeeNumber}`.trim();

    if (!membership.silaeMatricule) {
      blockers.add(`${name} (${membership.employeeNumber}) : matricule Silae absent.`);
    }
    for (const element of elements) {
      if (!element.silaeCode) {
        blockers.add(`« ${element.label} » : aucun code Silae associé.`);
      } else if (!element.confirmed) {
        blockers.add(
          `« ${element.label} » → ${element.silaeCode} : correspondance non confirmée par le gestionnaire de paie.`,
        );
      }
    }

    rows.push({
      membershipId: assignment.membershipId,
      employeeNumber: membership.employeeNumber,
      silaeMatricule: membership.silaeMatricule,
      name,
      forfaitJours,
      elements,
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return {
    month,
    startDate,
    endDate,
    location,
    rows,
    blockers: [...blockers],
  };
}

/** Traduit une période en lignes CSV. */
export function toSilaeLines(period: PayrollPeriod): SilaeLine[] {
  return period.rows.flatMap((row) =>
    row.elements.map((element) => ({
      matricule: row.silaeMatricule ?? '',
      code: element.silaeCode ?? '',
      value: element.value,
      kind: element.unit,
      // Les agrégats couvrent la période de paie entière. Les absences, qui
      // portent leurs propres dates, arriveront avec le lot suivant.
      startDate: period.startDate,
      endDate: period.endDate,
    })),
  );
}

/** Semaines ISO couvrant le mois, pour information à l'écran. */
export function weeksOfMonth(month: Month, timeZone: string): string[] {
  const dates = monthDates(month);
  const weeks = new Set<string>();
  for (const date of dates) {
    const week = isoWeekOf(new Date(`${date}T12:00:00Z`));
    weeks.add(`${week.isoYear}-W${String(week.isoWeek).padStart(2, '0')}`);
    void weekBounds(week, timeZone);
  }
  return [...weeks];
}
