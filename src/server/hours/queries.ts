import { can } from '@/domain/access/authorize';
import { formatMinutes } from '@/domain/counters/week';
import { hoursView, sumHours, type ShiftHours } from '@/domain/hours/states';
import { monthDates, type Month } from '@/domain/planning/month';
import { zonedClock, zonedDate, zonedMidnight } from '@/domain/planning/week';
import { query } from '@/server/context';

/**
 * Rapport d'heures — PLAN.md §7.3.
 *
 * Les trois grandeurs sont affichées côte à côte : prévu, réalisé, écart. C'est
 * la seule façon de voir qu'un salarié fait systématiquement une heure de plus
 * que son planning — un écart isolé se remarque, un écart chronique ne se voit
 * que sur un tableau.
 */

export interface HoursShiftRow {
  id: string;
  localDate: string;
  plannedRange: string;
  actualRange: string | null;
  plannedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  hasActual: boolean;
  isValidated: boolean;
  locked: boolean;
}

export interface HoursEmployeeRow {
  membershipId: string;
  name: string;
  plannedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  payableMinutes: number;
  allValidated: boolean;
  shifts: HoursShiftRow[];
}

export interface HoursReport {
  month: Month;
  label: string;
  monthParam: string;
  previousParam: string;
  nextParam: string;
  location: { id: string; name: string; timezone: string };
  locations: Array<{ id: string; name: string }>;
  rows: HoursEmployeeRow[];
  totals: {
    plannedMinutes: number;
    actualMinutes: number;
    deltaMinutes: number;
    payableMinutes: number;
  };
  canEdit: boolean;
  canValidate: boolean;
  /** Périodes verrouillées recouvrant le mois. */
  lockedLabels: string[];
}

export async function getHoursReport(
  month: Month,
  locationId?: string,
): Promise<HoursReport | null> {
  return query(
    'hours.view',
    async (db, actor) => {
      const locations = await db.location.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true, timezone: true },
        orderBy: { name: 'asc' },
      });
      const location =
        locations.find((candidate) => candidate.id === locationId) ??
        locations[0];
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

      const teams = await db.team.findMany({
        where: { locationId: location.id, archivedAt: null },
        select: { id: true },
      });
      const assignments = await db.teamMember.findMany({
        where: { teamId: { in: teams.map((team) => team.id) } },
        include: {
          membership: {
            include: {
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      const memberIds = [
        ...new Set(assignments.map((assignment) => assignment.membershipId)),
      ];

      const shifts = await db.shift.findMany({
        where: {
          membershipId: { in: memberIds },
          startAt: { gte: from, lt: to },
        },
        orderBy: { startAt: 'asc' },
      });

      // Les périodes verrouillées ferment la saisie : afficher un champ qui
      // sera refusé à l'envoi serait une invitation à perdre son temps.
      const lockedPeriods = await db.payPeriod.findMany({
        where: {
          locationId: location.id,
          status: 'LOCKED',
          startDate: { lte: new Date(`${endDate}T00:00:00Z`) },
          endDate: { gte: new Date(`${startDate}T00:00:00Z`) },
        },
        select: { label: true, startDate: true, endDate: true },
      });
      const isLocked = (isoDate: string) =>
        lockedPeriods.some(
          (period) =>
            isoDate >= period.startDate.toISOString().slice(0, 10) &&
            isoDate <= period.endDate.toISOString().slice(0, 10),
        );

      const byMember = new Map<string, typeof shifts>();
      for (const shift of shifts) {
        if (!shift.membershipId) continue;
        const list = byMember.get(shift.membershipId) ?? [];
        list.push(shift);
        byMember.set(shift.membershipId, list);
      }

      const rows: HoursEmployeeRow[] = [];
      for (const assignment of assignments) {
        const own = byMember.get(assignment.membershipId) ?? [];
        if (own.length === 0) continue;

        const asHours: ShiftHours[] = own.map((shift) => ({
          startAt: shift.startAt,
          endAt: shift.endAt,
          breakMinutes: shift.breakMinutes,
          actualStartAt: shift.actualStartAt,
          actualEndAt: shift.actualEndAt,
          actualBreakMinutes: shift.actualBreakMinutes,
          isValidated: shift.isValidated,
        }));
        const total = sumHours(asHours);

        const profile = assignment.membership.profile;
        rows.push({
          membershipId: assignment.membershipId,
          name: `${profile?.firstName ?? ''} ${profile?.lastName ?? assignment.membership.employeeNumber}`.trim(),
          plannedMinutes: total.plannedMinutes,
          actualMinutes: total.actualMinutes,
          deltaMinutes: total.deltaMinutes,
          payableMinutes: total.payableMinutes,
          allValidated: total.isValidated,
          shifts: own.map((shift) => {
            const view = hoursView({
              startAt: shift.startAt,
              endAt: shift.endAt,
              breakMinutes: shift.breakMinutes,
              actualStartAt: shift.actualStartAt,
              actualEndAt: shift.actualEndAt,
              actualBreakMinutes: shift.actualBreakMinutes,
              isValidated: shift.isValidated,
            });
            const localDate = zonedDate(shift.startAt, location.timezone);

            return {
              id: shift.id,
              localDate,
              plannedRange: `${zonedClock(shift.startAt, location.timezone)}–${zonedClock(shift.endAt, location.timezone)}`,
              actualRange:
                shift.actualStartAt && shift.actualEndAt
                  ? `${zonedClock(shift.actualStartAt, location.timezone)}–${zonedClock(shift.actualEndAt, location.timezone)}`
                  : null,
              plannedMinutes: view.plannedMinutes,
              actualMinutes: view.actualMinutes,
              deltaMinutes: view.deltaMinutes,
              hasActual: view.hasActual,
              isValidated: view.isValidated,
              locked: isLocked(localDate),
            };
          }),
        });
      }

      rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

      const { formatMonthParam, monthLabel, nextMonth, previousMonth } =
        await import('@/domain/planning/month');

      return {
        month,
        label: monthLabel(month),
        monthParam: formatMonthParam(month),
        previousParam: formatMonthParam(previousMonth(month)),
        nextParam: formatMonthParam(nextMonth(month)),
        location,
        locations: locations.map(({ id, name }) => ({ id, name })),
        rows,
        totals: {
          plannedMinutes: rows.reduce((sum, row) => sum + row.plannedMinutes, 0),
          actualMinutes: rows.reduce((sum, row) => sum + row.actualMinutes, 0),
          deltaMinutes: rows.reduce((sum, row) => sum + row.deltaMinutes, 0),
          payableMinutes: rows.reduce((sum, row) => sum + row.payableMinutes, 0),
        },
        canEdit: can(actor, 'hours.edit_actual'),
        canValidate: can(actor, 'hours.validate'),
        lockedLabels: lockedPeriods.map((period) => period.label),
      };
    },
    locationId ? { locationId } : undefined,
  );
}

export { formatMinutes };
