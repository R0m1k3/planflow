import { inScope } from '@/domain/access/authorize';
import { shiftMinutes } from '@/domain/counters/week';
import {
  absenteeism,
  headcount,
  turnoverRate,
  type AbsenceInput,
  type HeadcountInput,
} from '@/domain/hr/indicators';
import {
  formatMonthParam,
  monthDates,
  monthLabel,
  previousMonth,
  type Month,
} from '@/domain/planning/month';
import { query } from '@/server/context';

/**
 * Analyses RH — PLAN.md §9, `/rh/analyses/{effectifs,heures,absences}`.
 *
 * Une série mensuelle, pas trois écrans qui recalculent chacun leur version.
 * Les trois analyses lisent le même tableau : c'est ce qui garantit qu'un
 * effectif moyen affiché en « effectifs » soit le même que le dénominateur du
 * taux d'absentéisme affiché en « absences ». Deux calculs séparés finiraient
 * par diverger d'un arrondi, et l'écart se plaide mal devant un CSE.
 *
 * Les indicateurs eux-mêmes viennent du domaine, testés aux bornes. Ce module
 * ne fait que rassembler les données et boucler sur les mois.
 */

export interface MonthPoint {
  month: Month;
  label: string;
  param: string;
  closingHeadcount: number;
  averageHeadcount: number;
  entries: number;
  exits: number;
  turnoverRate: number | null;
  absenceDays: number;
  sickDays: number;
  absenteeismRate: number | null;
  /** Minutes planifiées, pauses déduites. */
  plannedMinutes: number;
  /** Minutes réellement travaillées quand elles ont été saisies. */
  actualMinutes: number;
  theoreticalWorkedDays: number;
}

export interface AnalyticsSeries {
  location: { id: string; name: string } | null;
  locations: Array<{ id: string; name: string }>;
  /** Du plus ancien au plus récent : un graphique se lit dans ce sens. */
  points: MonthPoint[];
}

/** Jours ouvrables d'un mois — base théorique de l'absentéisme (dimanche exclu). */
function workingDaysIn(dates: string[]): number {
  return dates.filter(
    (date) => new Date(`${date}T00:00:00Z`).getUTCDay() !== 0,
  ).length;
}

function monthsEndingWith(last: Month, count: number): Month[] {
  const months: Month[] = [last];
  for (let index = 1; index < count; index += 1) {
    months.unshift(previousMonth(months[0] as Month));
  }
  return months;
}

export async function getAnalyticsSeries(
  lastMonth: Month,
  monthCount = 12,
  locationId?: string,
): Promise<AnalyticsSeries> {
  return query('members.view', async (db, actor) => {
    const allLocations = await db.location.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Le périmètre s'applique avant l'agrégation : un total consolidé ne doit
    // pas laisser deviner l'effectif d'un établissement qu'on n'a pas le droit
    // de lire.
    const visible = allLocations.filter((location) =>
      inScope(actor, { locationId: location.id }),
    );
    const location =
      visible.find((candidate) => candidate.id === locationId) ??
      visible[0] ??
      null;

    const months = monthsEndingWith(lastMonth, monthCount);
    const firstDate = monthDates(months[0] as Month)[0] as string;
    const lastDates = monthDates(months[months.length - 1] as Month);
    const lastDate = lastDates[lastDates.length - 1] as string;

    const locationFilter = location ? { locationId: location.id } : {};

    // Une seule lecture par nature, puis un découpage en mémoire. Douze
    // requêtes par indicateur donneraient le même résultat en douze fois plus
    // de temps, et rendraient l'écran inutilisable sur une année glissante.
    const contracts = await db.userContract.findMany({
      where: locationFilter,
      select: {
        membershipId: true,
        startDate: true,
        endDate: true,
      },
    });

    const contractInputs: HeadcountInput[] = contracts.map((contract) => ({
      membershipId: contract.membershipId,
      startDate: contract.startDate.toISOString().slice(0, 10),
      endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
    }));

    const timeOffs = await db.timeOff.findMany({
      where: {
        status: 'ACCEPTED',
        startDate: { lte: new Date(`${lastDate}T00:00:00Z`) },
        endDate: { gte: new Date(`${firstDate}T00:00:00Z`) },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        countedDays: true,
        absenceType: { select: { isSocialSecurity: true } },
      },
    });

    const shifts = await db.shift.findMany({
      where: {
        localDate: {
          gte: new Date(`${firstDate}T00:00:00Z`),
          lte: new Date(`${lastDate}T00:00:00Z`),
        },
      },
      select: {
        localDate: true,
        startAt: true,
        endAt: true,
        breakMinutes: true,
        actualStartAt: true,
        actualEndAt: true,
        actualBreakMinutes: true,
      },
    });

    const points = months.map((month) => {
      const dates = monthDates(month);
      const from = dates[0] as string;
      const to = dates[dates.length - 1] as string;

      const counts = headcount(contractInputs, from, to);

      // Une absence à cheval sur deux mois est rattachée au mois de son début :
      // `countedDays` a été figé à la décision et ne se redécoupe pas sans
      // refaire le décompte des fériés, ce qui produirait un autre chiffre que
      // celui écrit au registre des compteurs.
      const monthAbsences: AbsenceInput[] = timeOffs
        .filter((entry) => {
          const start = entry.startDate.toISOString().slice(0, 10);
          return start >= from && start <= to;
        })
        .map((entry) => ({
          membershipId: entry.id,
          timeOffId: entry.id,
          days: Number(entry.countedDays?.toString() ?? '0'),
          isSocialSecurity: entry.absenceType.isSocialSecurity,
        }));

      const theoreticalWorkedDays =
        workingDaysIn(dates) * Math.round(counts.average);
      const absence = absenteeism(monthAbsences, theoreticalWorkedDays);

      const monthShifts = shifts.filter((shift) => {
        const day = shift.localDate.toISOString().slice(0, 10);
        return day >= from && day <= to;
      });

      const plannedMinutes = monthShifts.reduce(
        (sum, shift) =>
          sum + shiftMinutes(shift.startAt, shift.endAt, shift.breakMinutes),
        0,
      );

      const actualMinutes = monthShifts.reduce((sum, shift) => {
        if (!shift.actualStartAt || !shift.actualEndAt) {
          // Sans heures réelles saisies, le prévu fait foi (PLAN.md §7.3) :
          // laisser un zéro creuserait un écart qui n'existe pas.
          return sum + shiftMinutes(shift.startAt, shift.endAt, shift.breakMinutes);
        }
        return (
          sum +
          shiftMinutes(
            shift.actualStartAt,
            shift.actualEndAt,
            shift.actualBreakMinutes ?? shift.breakMinutes,
          )
        );
      }, 0);

      return {
        month,
        label: monthLabel(month),
        param: formatMonthParam(month),
        closingHeadcount: counts.closing,
        averageHeadcount: counts.average,
        entries: counts.entries.length,
        exits: counts.exits.length,
        turnoverRate: turnoverRate(counts),
        absenceDays: absence.totalDays,
        sickDays: absence.sickDays,
        absenteeismRate: absence.rate,
        plannedMinutes,
        actualMinutes,
        theoreticalWorkedDays,
      };
    });

    return {
      location: location ? { id: location.id, name: location.name } : null,
      locations: visible,
      points,
    };
  }, locationId ? { locationId } : undefined);
}
