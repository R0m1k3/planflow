import {
  buildRows,
  shiftState,
  type BoardRow,
  type BoardShiftInput,
} from '@/domain/planning/board';
import type { ShiftState } from '@/components/planning/ShiftChip';
import {
  dayHeadings,
  formatWeekParam,
  nextIsoWeek,
  previousIsoWeek,
  weekBounds,
  weekDates,
  weekLabel,
  zonedClock,
  zonedMidnight,
  type IsoWeek,
} from '@/domain/planning/week';
import { can } from '@/domain/access/authorize';
import { query } from '@/server/context';
import { POSTE_CODES, type PosteCode } from '@/lib/design/postes';
import type { ScopedClient } from '@/server/tenant';

/**
 * Lecture de la grille hebdomadaire.
 *
 * Une section par équipe : c'est la maille de publication constatée dans
 * l'audit — chaque section porte son propre bouton « Dépublier », pas
 * l'établissement entier.
 */

export interface BoardSection {
  teamId: string;
  teamName: string;
  /** Vrai quand la semaine existe mais reste masquée faute de capacité. */
  hidden: boolean;
  scheduleId: string | null;
  status: 'DRAFT' | 'VALIDATED' | 'PUBLISHED';
  version: number;
  publishedAt: Date | null;
  rows: BoardRow[];
  unassignedRow: BoardRow | null;
  alerts: BoardAlert[];
  /** Créneaux portant au moins un constat, pour le badge de cellule. */
  flaggedShiftIds: string[];
}

export interface BoardAlert {
  id: string;
  ruleCode: string;
  severity: 'INFO' | 'WARNING' | 'BLOCKING';
  message: string;
  localDate: string | null;
  membershipId: string | null;
  shiftIds: string[];
  acknowledged: boolean;
  acknowledgementReason: string | null;
}

export interface BoardLabel {
  id: string;
  code: string;
  name: string;
  poste: PosteCode;
}

export interface WeekBoard {
  location: { id: string; name: string; timezone: string };
  locations: Array<{ id: string; name: string }>;
  week: IsoWeek;
  label: string;
  headings: string[];
  dates: string[];
  previousParam: string;
  nextParam: string;
  weekParam: string;
  sections: BoardSection[];
  labels: BoardLabel[];
  totals: { plannedMinutes: number; shifts: number; unassigned: number };
}

/** Poste par défaut quand le créneau ne porte pas d'étiquette. */
const FALLBACK_POSTE: PosteCode = 'vte';

function posteOf(paletteKey: string | null | undefined): PosteCode {
  if (!paletteKey) return FALLBACK_POSTE;
  return (POSTE_CODES as readonly string[]).includes(paletteKey)
    ? (paletteKey as PosteCode)
    : FALLBACK_POSTE;
}

export async function listLocations(): Promise<
  Array<{ id: string; name: string; timezone: string }>
> {
  return query('planning.view', async (db) => {
    return db.location.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, timezone: true },
      orderBy: { name: 'asc' },
    });
  });
}

export async function getWeekBoard(
  week: IsoWeek,
  locationId?: string,
): Promise<WeekBoard | null> {
  return query(
    'planning.view',
    async (db, actor) => {
      // Un salarié ne voit que ce qui est publié : un brouillon est une
      // intention de manager, pas une information sur laquelle organiser sa
      // semaine. La restriction est **serveur** — masquer côté écran laisserait
      // les créneaux dans la charge utile.
      const seesDrafts = can(actor, 'planning.view_unpublished');

      const locations = await db.location.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true, timezone: true },
        orderBy: { name: 'asc' },
      });

      const location =
        locations.find((candidate) => candidate.id === locationId) ??
        locations[0];
      if (!location) return null;

      const dates = weekDates(week);
      const { from, to } = weekBounds(week, location.timezone);

      const teams = await db.team.findMany({
        where: { locationId: location.id, archivedAt: null },
        orderBy: { position: 'asc' },
        select: { id: true, name: true },
      });

      const schedules = await db.weeklySchedule.findMany({
        where: {
          teamId: { in: teams.map((team) => team.id) },
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
          ...(seesDrafts ? {} : { status: 'PUBLISHED' }),
        },
      });
      const scheduleByTeam = new Map(
        schedules.map((schedule) => [schedule.teamId, schedule]),
      );

      // Repos posés sur la semaine. Seul le compensateur alimente le compteur
      // RC du bandeau ; le repos hebdomadaire est chargé avec, parce que les
      // deux se posent sur la même table et que filtrer ici coûterait une
      // seconde requête pour une distinction que le domaine fait déjà.
      const rests = await db.rest.findMany({
        where: {
          weeklyScheduleId: { in: schedules.map((schedule) => schedule.id) },
        },
        select: {
          weeklyScheduleId: true,
          membershipId: true,
          restType: true,
          minutes: true,
        },
      });

      const shifts = await db.shift.findMany({
        where: {
          weeklyScheduleId: { in: schedules.map((schedule) => schedule.id) },
          // Bornes en instants : un créneau de nuit du dimanche appartient à
          // cette semaine par son début, quel que soit son jour de fin.
          startAt: { gte: from, lt: to },
        },
        select: {
          id: true,
          weeklyScheduleId: true,
          membershipId: true,
          startAt: true,
          endAt: true,
          breakMinutes: true,
          isValidated: true,
          note: true,
          labelId: true,
        },
      });

      const labels = await db.label.findMany({
        where: { archivedAt: null },
        orderBy: { position: 'asc' },
        select: { id: true, code: true, name: true, paletteKey: true },
      });
      const paletteById = new Map(
        labels.map((label) => [label.id, label.paletteKey]),
      );

      const people = await loadPeople(db, teams.map((team) => team.id));

      // Les absences acceptées s'affichent sur la grille : planifier quelqu'un
      // qui est en congé est l'erreur que cette bande empêche.
      const allMemberIds = [...people.values()]
        .flat()
        .map((person) => person.membershipId);
      const absences = await db.timeOff.findMany({
        where: {
          membershipId: { in: allMemberIds },
          status: 'ACCEPTED',
          startDate: { lte: new Date(`${dates[6]}T00:00:00Z`) },
          endDate: { gte: new Date(`${dates[0]}T00:00:00Z`) },
        },
        include: { absenceType: true },
      });
      const absenceInputs = absences.map((absence) => ({
        membershipId: absence.membershipId,
        startDate: absence.startDate.toISOString().slice(0, 10),
        endDate: absence.endDate.toISOString().slice(0, 10),
        // La grille n'a jamais besoin du motif médical : « Absence » suffit à
        // ne pas planifier quelqu'un, et c'est une donnée de santé.
        label: absence.absenceType.isSocialSecurity
          ? 'Absence'
          : absence.absenceType.name,
        colorKey: absence.absenceType.colorKey,
      }));

      // Les constats sont lus, jamais recalculés à l'affichage : ils datent de
      // la dernière écriture, avec la version de convention qui s'appliquait
      // alors. Les recalculer ici les ferait diverger de ce qui a été acquitté.
      const alerts = await db.complianceViolation.findMany({
        where: { weeklyScheduleId: { in: schedules.map((s) => s.id) } },
        orderBy: [{ severity: 'asc' }, { localDate: 'asc' }],
      });

      const sections = teams.map((team) => {
        const schedule = scheduleByTeam.get(team.id) ?? null;
        const isPublished = schedule?.status === 'PUBLISHED';
        const hidden = !seesDrafts && !schedule;
        const teamShifts: BoardShiftInput[] = shifts
          .filter((shift) => shift.weeklyScheduleId === schedule?.id)
          .map((shift) => ({
            id: shift.id,
            membershipId: shift.membershipId,
            startAt: shift.startAt,
            endAt: shift.endAt,
            breakMinutes: shift.breakMinutes,
            poste: posteOf(paletteById.get(shift.labelId ?? '')),
            isValidated: shift.isValidated,
            note: shift.note,
          }));

        const { rows, unassignedRow } = buildRows(
          people.get(team.id) ?? [],
          teamShifts,
          dates,
          location.timezone,
          isPublished,
          absenceInputs,
          rests
            .filter((rest) => rest.weeklyScheduleId === schedule?.id)
            .map((rest) => ({
              membershipId: rest.membershipId,
              restType: rest.restType,
              minutes: rest.minutes,
            })),
        );

        const teamAlerts = alerts
          .filter((alert) => alert.weeklyScheduleId === schedule?.id)
          .map((alert) => ({
            id: alert.id,
            ruleCode: alert.ruleCode,
            severity: alert.severity,
            message: alert.message,
            localDate: alert.localDate?.toISOString().slice(0, 10) ?? null,
            membershipId: alert.membershipId,
            shiftIds: alert.shiftIds,
            acknowledged: alert.acknowledgedAt !== null,
            acknowledgementReason: alert.acknowledgementReason,
          }));

        return {
          teamId: team.id,
          teamName: team.name,
          hidden,
          scheduleId: schedule?.id ?? null,
          status: schedule?.status ?? 'DRAFT',
          version: schedule?.version ?? 0,
          publishedAt: schedule?.publishedAt ?? null,
          rows,
          unassignedRow,
          alerts: teamAlerts,
          flaggedShiftIds: [
            ...new Set(
              teamAlerts
                .filter((alert) => alert.severity !== 'INFO')
                .flatMap((alert) => alert.shiftIds),
            ),
          ],
        } satisfies BoardSection;
      });

      const plannedMinutes = sections
        .flatMap((section) => section.rows)
        .reduce((total, row) => total + row.counters.plannedMinutes, 0);

      return {
        location,
        locations: locations.map(({ id, name }) => ({ id, name })),
        week,
        label: weekLabel(week),
        headings: dayHeadings(week),
        dates,
        weekParam: formatWeekParam(week),
        previousParam: formatWeekParam(previousIsoWeek(week)),
        nextParam: formatWeekParam(nextIsoWeek(week)),
        sections,
        labels: labels.map((label) => ({
          id: label.id,
          code: label.code,
          name: label.name,
          poste: posteOf(label.paletteKey),
        })),
        totals: {
          plannedMinutes,
          shifts: shifts.filter((shift) => shift.membershipId).length,
          unassigned: shifts.filter((shift) => !shift.membershipId).length,
        },
      } satisfies WeekBoard;
    },
    locationId ? { locationId } : undefined,
  );
}

/** Salariés rattachés à chaque équipe, avec leur durée contractuelle. */
async function loadPeople(
  db: ScopedClient,
  teamIds: string[],
): Promise<Map<string, Awaited<ReturnType<typeof toPerson>>[]>> {
  const assignments = await db.teamMember.findMany({
    where: { teamId: { in: teamIds } },
    orderBy: [{ position: 'asc' }],
    include: {
      membership: {
        include: {
          profile: { select: { firstName: true, lastName: true } },
          contracts: {
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            take: 1,
            select: {
              weeklyHours: true,
              workTimeArrangement: true,
              jobTitleId: true,
            },
          },
        },
      },
    },
  });

  const jobTitleIds = [
    ...new Set(
      assignments
        .flatMap((assignment) => assignment.membership.contracts)
        .map((contract) => contract.jobTitleId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const jobTitles = await db.jobTitle.findMany({
    where: { id: { in: jobTitleIds } },
    select: { id: true, name: true },
  });
  const jobTitleById = new Map(jobTitles.map((job) => [job.id, job.name]));

  const byTeam = new Map<string, Awaited<ReturnType<typeof toPerson>>[]>();
  for (const assignment of assignments) {
    const list = byTeam.get(assignment.teamId) ?? [];
    list.push(toPerson(assignment, jobTitleById));
    byTeam.set(assignment.teamId, list);
  }
  return byTeam;
}

function toPerson(
  assignment: {
    membershipId: string;
    membership: {
      employeeNumber: string;
      profile: { firstName: string; lastName: string } | null;
      contracts: Array<{
        weeklyHours: { toString(): string };
        workTimeArrangement: string;
        jobTitleId: string | null;
      }>;
    };
  },
  jobTitleById: Map<string, string>,
) {
  const contract = assignment.membership.contracts[0];
  const forfaitJours = contract?.workTimeArrangement === 'FORFAIT_JOURS';
  return {
    membershipId: assignment.membershipId,
    firstName: assignment.membership.profile?.firstName ?? '',
    lastName:
      assignment.membership.profile?.lastName ??
      assignment.membership.employeeNumber,
    job: contract?.jobTitleId
      ? (jobTitleById.get(contract.jobTitleId) ?? 'Poste à préciser')
      : 'Poste à préciser',
    forfaitJours,
    contractMinutes: contract
      ? Math.round(Number(contract.weeklyHours.toString()) * 60)
      : 0,
  };
}

/**
 * Vue jour : qui est présent, et quand.
 *
 * Elle répond à une question différente de la vue semaine — « qui tient la
 * caisse à 14 h » plutôt que « qui fait combien d'heures » — d'où une requête
 * distincte plutôt qu'un filtrage de la grille hebdomadaire.
 */

export interface DayLaneShift {
  id: string;
  poste: PosteCode;
  /** Minutes depuis minuit local ; peut dépasser 1440 sur un créneau de nuit. */
  startMinutes: number;
  endMinutes: number;
  state: ShiftState;
}

export interface DayLane {
  id: string;
  name: string;
  job: string;
  initials: string;
  unassigned: boolean;
  shifts: DayLaneShift[];
}

export interface DayBoard {
  location: { id: string; name: string; timezone: string };
  locations: Array<{ id: string; name: string }>;
  isoDate: string;
  label: string;
  previousDate: string;
  nextDate: string;
  lanes: DayLane[];
  fromHour: number;
  toHour: number;
}

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

function shiftDate(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00Z`);
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export async function getDayBoard(
  isoDate: string,
  locationId?: string,
): Promise<DayBoard | null> {
  return query(
    'planning.view',
    async (db, actor) => {
      const seesDrafts = can(actor, 'planning.view_unpublished');

      const locations = await db.location.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true, timezone: true },
        orderBy: { name: 'asc' },
      });
      const location =
        locations.find((candidate) => candidate.id === locationId) ??
        locations[0];
      if (!location) return null;

      const from = zonedMidnight(isoDate, location.timezone);
      const to = zonedMidnight(shiftDate(isoDate, 1), location.timezone);

      const teams = await db.team.findMany({
        where: { locationId: location.id, archivedAt: null },
        select: { id: true },
      });
      const schedules = await db.weeklySchedule.findMany({
        where: {
          teamId: { in: teams.map((team) => team.id) },
          ...(seesDrafts ? {} : { status: 'PUBLISHED' }),
        },
        select: { id: true, status: true },
      });
      const statusById = new Map(
        schedules.map((schedule) => [schedule.id, schedule.status]),
      );

      const shifts = await db.shift.findMany({
        where: {
          weeklyScheduleId: { in: schedules.map((schedule) => schedule.id) },
          startAt: { gte: from, lt: to },
        },
        orderBy: { startAt: 'asc' },
      });

      const labels = await db.label.findMany({
        select: { id: true, paletteKey: true },
      });
      const paletteById = new Map(
        labels.map((label) => [label.id, label.paletteKey]),
      );

      const memberIds = [
        ...new Set(
          shifts
            .map((shift) => shift.membershipId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const members = await db.membership.findMany({
        where: { id: { in: memberIds } },
        include: {
          profile: { select: { firstName: true, lastName: true } },
          contracts: {
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            take: 1,
            select: { jobTitleId: true },
          },
        },
      });
      const jobTitles = await db.jobTitle.findMany({
        select: { id: true, name: true },
      });
      const jobTitleById = new Map(jobTitles.map((job) => [job.id, job.name]));

      const laneById = new Map<string, DayLane>();
      for (const member of members) {
        const jobTitleId = member.contracts[0]?.jobTitleId;
        laneById.set(member.id, {
          id: member.id,
          name: `${member.profile?.firstName ?? ''} ${member.profile?.lastName ?? member.employeeNumber}`.trim(),
          job: jobTitleId
            ? (jobTitleById.get(jobTitleId) ?? 'Poste à préciser')
            : 'Poste à préciser',
          initials:
            `${member.profile?.firstName?.charAt(0) ?? ''}${member.profile?.lastName?.charAt(0) ?? ''}`.toUpperCase(),
          unassigned: false,
          shifts: [],
        });
      }

      const unassignedLane: DayLane = {
        id: 'unassigned',
        name: 'Non assigné',
        job: 'Besoins à couvrir',
        initials: '?',
        unassigned: true,
        shifts: [],
      };

      for (const shift of shifts) {
        const startMinutes = localMinutes(shift.startAt, location.timezone);
        let endMinutes = localMinutes(shift.endAt, location.timezone);
        // Un créneau de nuit finit « avant » son début en heure murale : le
        // reporter au lendemain garde la barre continue au lieu de l'inverser.
        if (endMinutes <= startMinutes) endMinutes += 24 * 60;

        const isPublished =
          statusById.get(shift.weeklyScheduleId) === 'PUBLISHED';
        const lane = shift.membershipId
          ? laneById.get(shift.membershipId)
          : unassignedLane;
        lane?.shifts.push({
          id: shift.id,
          poste: posteOf(paletteById.get(shift.labelId ?? '')),
          startMinutes,
          endMinutes,
          state: shiftState(shift.isValidated, isPublished, shift.membershipId),
        });
      }

      const lanes = [...laneById.values()]
        .filter((lane) => lane.shifts.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      if (unassignedLane.shifts.length > 0) lanes.push(unassignedLane);

      // L'amplitude s'ajuste à la journée réelle : figer 06 h–21 h couperait
      // un inventaire de nuit, et étirerait une journée creuse.
      const all = lanes.flatMap((lane) => lane.shifts);
      const fromHour = all.length
        ? Math.max(0, Math.floor(Math.min(...all.map((s) => s.startMinutes)) / 60) - 1)
        : 7;
      const toHour = all.length
        ? Math.min(30, Math.ceil(Math.max(...all.map((s) => s.endMinutes)) / 60) + 1)
        : 21;

      return {
        location,
        locations: locations.map(({ id, name }) => ({ id, name })),
        isoDate,
        label: DAY_FORMAT.format(new Date(`${isoDate}T00:00:00Z`)),
        previousDate: shiftDate(isoDate, -1),
        nextDate: shiftDate(isoDate, 1),
        lanes,
        fromHour,
        toHour: Math.max(toHour, fromHour + 4),
      } satisfies DayBoard;
    },
    locationId ? { locationId } : undefined,
  );
}

/** Minutes depuis minuit, en heure locale de l'établissement. */
function localMinutes(instant: Date, timeZone: string): number {
  const [hours, minutes] = zonedClock(instant, timeZone).split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}
