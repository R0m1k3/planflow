import { can } from '@/domain/access/authorize';
import { shiftMinutes } from '@/domain/counters/week';
import {
  formatMonthParam,
  monthDates,
  monthLabel,
  nextMonth,
  previousMonth,
  isoDayOfWeek,
  type Month,
} from '@/domain/planning/month';
import {
  dayHeadings,
  formatWeekParam,
  nextIsoWeek,
  previousIsoWeek,
  weekBounds,
  weekDates,
  weekLabel,
  zonedClock,
  zonedDate,
  zonedMidnight,
  type IsoWeek,
} from '@/domain/planning/week';
import { POSTE_CODES, type PosteCode } from '@/lib/design/postes';
import { query } from '@/server/context';
import type { ScopedClient } from '@/server/tenant';

/**
 * Les vues secondaires du planning — étiquettes et mois.
 *
 * Elles lisent **le même modèle** que la grille hebdomadaire : `Shift` reste
 * la seule source. Une vue qui recopierait les créneaux dans sa propre table
 * finirait par les afficher autrement, et personne ne saurait laquelle croire.
 */

const FALLBACK_POSTE: PosteCode = 'vte';

function posteOf(paletteKey: string | null | undefined): PosteCode {
  if (!paletteKey) return FALLBACK_POSTE;
  return (POSTE_CODES as readonly string[]).includes(paletteKey)
    ? (paletteKey as PosteCode)
    : FALLBACK_POSTE;
}

interface LocationRef {
  id: string;
  name: string;
  timezone: string;
}

/** Établissements visibles, avec celui qui est affiché. */
async function resolveLocation(
  db: ScopedClient,
  locationId: string | undefined,
): Promise<{ location: LocationRef | undefined; locations: LocationRef[] }> {
  const locations = await db.location.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true, timezone: true },
    orderBy: { name: 'asc' },
  });
  return {
    locations,
    location:
      locations.find((candidate) => candidate.id === locationId) ??
      locations[0],
  };
}

async function visibleScheduleIds(
  db: ScopedClient,
  locationId: string,
  seesDrafts: boolean,
  week?: IsoWeek,
): Promise<string[]> {
  const teams = await db.team.findMany({
    where: { locationId, archivedAt: null },
    select: { id: true },
  });
  const schedules = await db.weeklySchedule.findMany({
    where: {
      teamId: { in: teams.map((team) => team.id) },
      ...(week ? { isoYear: week.isoYear, isoWeek: week.isoWeek } : {}),
      ...(seesDrafts ? {} : { status: 'PUBLISHED' }),
    },
    select: { id: true },
  });
  return schedules.map((schedule) => schedule.id);
}

// ---------------------------------------------------------------------------
// Vue étiquettes
// ---------------------------------------------------------------------------

export interface LabelBoardEntry {
  id: string;
  time: string;
  who: string;
  unassigned: boolean;
}

export interface LabelBoardRow {
  labelId: string;
  name: string;
  poste: PosteCode;
  /** Sept cases, lundi → dimanche. */
  days: LabelBoardEntry[][];
  minutes: number;
}

export interface LabelBoard {
  location: LocationRef;
  locations: Array<{ id: string; name: string }>;
  label: string;
  headings: string[];
  weekParam: string;
  previousParam: string;
  nextParam: string;
  rows: LabelBoardRow[];
}

/**
 * La semaine vue par poste plutôt que par salarié.
 *
 * C'est la question du responsable d'ouverture : « la caisse est-elle tenue
 * samedi ? » — impossible à lire d'un coup d'œil sur une grille dont les
 * lignes sont des personnes.
 */
export async function getLabelBoard(
  week: IsoWeek,
  locationId?: string,
): Promise<LabelBoard | null> {
  return query(
    'planning.view',
    async (db, actor) => {
      const seesDrafts = can(actor, 'planning.view_unpublished');
      const { location, locations } = await resolveLocation(db, locationId);
      if (!location) return null;

      const dates = weekDates(week);
      const { from, to } = weekBounds(week, location.timezone);
      const scheduleIds = await visibleScheduleIds(
        db,
        location.id,
        seesDrafts,
        week,
      );

      const shifts = await db.shift.findMany({
        where: {
          weeklyScheduleId: { in: scheduleIds },
          startAt: { gte: from, lt: to },
        },
        orderBy: { startAt: 'asc' },
      });

      const labels = await db.label.findMany({
        where: { archivedAt: null },
        orderBy: { position: 'asc' },
      });

      const memberIds = [
        ...new Set(
          shifts
            .map((shift) => shift.membershipId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const members = await db.membership.findMany({
        where: { id: { in: memberIds } },
        include: { profile: { select: { firstName: true, lastName: true } } },
      });
      const nameById = new Map(
        members.map((member) => [
          member.id,
          `${member.profile?.firstName ?? ''} ${member.profile?.lastName ?? member.employeeNumber}`.trim(),
        ]),
      );

      const columnOf = new Map(dates.map((date, index) => [date, index]));
      const rowByLabel = new Map<string, LabelBoardRow>();

      const rowFor = (labelId: string | null): LabelBoardRow => {
        const key = labelId ?? 'sans-etiquette';
        const existing = rowByLabel.get(key);
        if (existing) return existing;

        const label = labels.find((candidate) => candidate.id === labelId);
        const created: LabelBoardRow = {
          labelId: key,
          name: label?.name ?? 'Sans étiquette',
          poste: posteOf(label?.paletteKey),
          days: Array.from({ length: 7 }, () => [] as LabelBoardEntry[]),
          minutes: 0,
        };
        rowByLabel.set(key, created);
        return created;
      };

      for (const shift of shifts) {
        const column = columnOf.get(zonedDate(shift.startAt, location.timezone));
        if (column === undefined) continue;

        const row = rowFor(shift.labelId);
        row.days[column]?.push({
          id: shift.id,
          time: `${zonedClock(shift.startAt, location.timezone)}–${zonedClock(shift.endAt, location.timezone)}`,
          who: shift.membershipId
            ? (nameById.get(shift.membershipId) ?? 'Salarié')
            : 'Non couvert',
          unassigned: !shift.membershipId,
        });
        row.minutes += shiftMinutes(
          shift.startAt,
          shift.endAt,
          shift.breakMinutes,
        );
      }

      // Les postes non planifiés restent affichés : un poste vide toute la
      // semaine est une information, pas une ligne à masquer.
      for (const label of labels) rowFor(label.id);

      const order = new Map(labels.map((label, index) => [label.id, index]));
      const rows = [...rowByLabel.values()].sort(
        (a, b) =>
          (order.get(a.labelId) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.labelId) ?? Number.MAX_SAFE_INTEGER),
      );

      return {
        location,
        locations: locations.map(({ id, name }) => ({ id, name })),
        label: weekLabel(week),
        headings: dayHeadings(week),
        weekParam: formatWeekParam(week),
        previousParam: formatWeekParam(previousIsoWeek(week)),
        nextParam: formatWeekParam(nextIsoWeek(week)),
        rows,
      } satisfies LabelBoard;
    },
    locationId ? { locationId } : undefined,
  );
}

// ---------------------------------------------------------------------------
// Vue mois
// ---------------------------------------------------------------------------

export interface MonthDay {
  isoDate: string;
  day: number;
  weekend: boolean;
}

export interface MonthRow {
  membershipId: string;
  name: string;
  /** Minutes travaillées par jour, dans l'ordre de `days`. */
  minutes: number[];
  totalMinutes: number;
  workedDays: number;
}

export interface MonthBoard {
  location: LocationRef;
  locations: Array<{ id: string; name: string }>;
  label: string;
  monthParam: string;
  previousParam: string;
  nextParam: string;
  days: MonthDay[];
  rows: MonthRow[];
}

/**
 * Le mois par salarié.
 *
 * Vue de contrôle plutôt que d'édition : elle sert à repérer une série de
 * journées trop longues ou un salarié sans repos, ce que sept colonnes ne
 * laissent pas voir.
 */
export async function getMonthBoard(
  month: Month,
  locationId?: string,
): Promise<MonthBoard | null> {
  return query(
    'planning.view',
    async (db, actor) => {
      const seesDrafts = can(actor, 'planning.view_unpublished');
      const { location, locations } = await resolveLocation(db, locationId);
      if (!location) return null;

      const dates = monthDates(month);
      const first = dates[0] as string;
      const last = dates[dates.length - 1] as string;
      const from = zonedMidnight(first, location.timezone);
      const to = zonedMidnight(
        new Date(new Date(`${last}T00:00:00Z`).getTime() + 86_400_000)
          .toISOString()
          .slice(0, 10),
        location.timezone,
      );

      const scheduleIds = await visibleScheduleIds(
        db,
        location.id,
        seesDrafts,
      );

      const shifts = await db.shift.findMany({
        where: {
          weeklyScheduleId: { in: scheduleIds },
          membershipId: { not: null },
          startAt: { gte: from, lt: to },
        },
        select: {
          membershipId: true,
          startAt: true,
          endAt: true,
          breakMinutes: true,
        },
      });

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

      const columnOf = new Map(dates.map((date, index) => [date, index]));
      const rowById = new Map<string, MonthRow>();

      for (const assignment of assignments) {
        if (rowById.has(assignment.membershipId)) continue;
        const profile = assignment.membership.profile;
        rowById.set(assignment.membershipId, {
          membershipId: assignment.membershipId,
          name: `${profile?.firstName ?? ''} ${profile?.lastName ?? assignment.membership.employeeNumber}`.trim(),
          minutes: dates.map(() => 0),
          totalMinutes: 0,
          workedDays: 0,
        });
      }

      for (const shift of shifts) {
        if (!shift.membershipId) continue;
        const row = rowById.get(shift.membershipId);
        if (!row) continue;

        const column = columnOf.get(zonedDate(shift.startAt, location.timezone));
        if (column === undefined) continue;

        const minutes = shiftMinutes(
          shift.startAt,
          shift.endAt,
          shift.breakMinutes,
        );
        const before = row.minutes[column] ?? 0;
        if (before === 0 && minutes > 0) row.workedDays += 1;
        row.minutes[column] = before + minutes;
        row.totalMinutes += minutes;
      }

      return {
        location,
        locations: locations.map(({ id, name }) => ({ id, name })),
        label: monthLabel(month),
        monthParam: formatMonthParam(month),
        previousParam: formatMonthParam(previousMonth(month)),
        nextParam: formatMonthParam(nextMonth(month)),
        days: dates.map((isoDate) => ({
          isoDate,
          day: Number(isoDate.slice(8, 10)),
          weekend: isoDayOfWeek(isoDate) >= 6,
        })),
        rows: [...rowById.values()].sort((a, b) =>
          a.name.localeCompare(b.name, 'fr'),
        ),
      } satisfies MonthBoard;
    },
    locationId ? { locationId } : undefined,
  );
}
