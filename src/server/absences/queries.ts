import { can } from '@/domain/access/authorize';
import { counterView, type LedgerEntry } from '@/domain/absences/ledger';
import { monthDates, monthLabel, type Month } from '@/domain/planning/month';
import { query } from '@/server/context';

/**
 * Lectures des absences — PLAN.md §7.
 *
 * Une règle de confidentialité gouverne ce module : **un manager voit qu'un
 * salarié est absent, pas pourquoi il est malade** (matrice n° 9). Le motif
 * médical est une donnée de santé, catégorie particulière du RGPD. Il n'est
 * donc pas chargé pour qui n'a pas la capacité de le lire — un champ absent de
 * la réponse ne peut pas fuiter par le HTML ni par un journal.
 */

export interface AbsenceRequest {
  id: string;
  membershipId: string;
  name: string;
  /** Libellé du type, ou « Absence » quand le motif est masqué. */
  typeLabel: string;
  colorKey: string;
  isSocialSecurity: boolean;
  startDate: string;
  endDate: string;
  startHalfDay: boolean;
  endHalfDay: boolean;
  days: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  comment: string | null;
  decisionComment: string | null;
  requestedAt: Date;
}

export interface CounterSummary {
  membershipId: string;
  name: string;
  counterType: string;
  accrued: number;
  taken: number;
  balance: number;
  projected: number;
}

export interface AbsenceBoard {
  month: Month;
  label: string;
  monthParam: string;
  previousParam: string;
  nextParam: string;
  days: string[];
  pending: AbsenceRequest[];
  inMonth: AbsenceRequest[];
  counters: CounterSummary[];
  absenceTypes: Array<{ id: string; code: string; name: string }>;
  people: Array<{ membershipId: string; name: string }>;
  canDecide: boolean;
  canAdjust: boolean;
  ownMembershipId: string;
}

const STATUS_LABEL = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  DECLINED: 'Refusée',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
} as const;

export function statusLabel(status: AbsenceRequest['status']): string {
  return STATUS_LABEL[status];
}

export async function getAbsenceBoard(month: Month): Promise<AbsenceBoard> {
  return query('timeoff.view_own', async (db, actor) => {
    const canSeeOthers = can(actor, 'timeoff.view_others');
    const canDecide = can(actor, 'timeoff.decide');
    const canAdjust = can(actor, 'counters.adjust');
    // Le motif médical suit les documents du dossier : qui peut lire un arrêt
    // de travail peut lire sa nature.
    const canSeeMedical = can(actor, 'members.documents.view');

    const dates = monthDates(month);
    const first = dates[0] as string;
    const last = dates[dates.length - 1] as string;

    const scope = canSeeOthers
      ? {}
      : { membershipId: actor.membershipId };

    const timeOffs = await db.timeOff.findMany({
      where: {
        ...scope,
        OR: [
          {
            startDate: {
              gte: new Date(`${first}T00:00:00Z`),
              lte: new Date(`${last}T00:00:00Z`),
            },
          },
          {
            endDate: {
              gte: new Date(`${first}T00:00:00Z`),
              lte: new Date(`${last}T00:00:00Z`),
            },
          },
          { status: 'PENDING' },
        ],
      },
      include: { absenceType: true },
      orderBy: { startDate: 'asc' },
    });

    const memberIds = [
      ...new Set(timeOffs.map((entry) => entry.membershipId)),
      actor.membershipId,
    ];
    const members = await db.membership.findMany({
      where: canSeeOthers ? {} : { id: { in: memberIds } },
      include: { profile: { select: { firstName: true, lastName: true } } },
    });
    const nameById = new Map(
      members.map((member) => [
        member.id,
        `${member.profile?.firstName ?? ''} ${member.profile?.lastName ?? member.employeeNumber}`.trim(),
      ]),
    );

    const toRequest = (entry: (typeof timeOffs)[number]): AbsenceRequest => ({
      id: entry.id,
      membershipId: entry.membershipId,
      name: nameById.get(entry.membershipId) ?? 'Salarié',
      // Un arrêt maladie s'affiche « Absence » pour qui n'a pas le droit d'en
      // connaître la nature.
      typeLabel:
        entry.absenceType.isSocialSecurity && !canSeeMedical
          ? 'Absence'
          : entry.absenceType.name,
      colorKey: entry.absenceType.colorKey,
      isSocialSecurity: entry.absenceType.isSocialSecurity,
      startDate: entry.startDate.toISOString().slice(0, 10),
      endDate: entry.endDate.toISOString().slice(0, 10),
      startHalfDay: entry.startHalfDay,
      endHalfDay: entry.endHalfDay,
      days: Number(entry.countedDays?.toString() ?? '0'),
      status: entry.status,
      comment:
        entry.absenceType.isSocialSecurity && !canSeeMedical
          ? null
          : entry.comment,
      decisionComment: entry.decisionComment,
      requestedAt: entry.requestedAt,
    });

    const requests = timeOffs.map(toRequest);
    const pending = requests.filter((entry) => entry.status === 'PENDING');
    const inMonth = requests.filter(
      (entry) => entry.startDate <= last && entry.endDate >= first,
    );

    const counters = await db.counter.findMany({
      where: canSeeOthers ? {} : { membershipId: actor.membershipId },
      include: { operations: true },
    });

    const { formatMonthParam, nextMonth, previousMonth } = await import(
      '@/domain/planning/month'
    );

    const absenceTypes = await db.absenceType.findMany({
      where: { archivedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    });

    return {
      month,
      label: monthLabel(month),
      monthParam: formatMonthParam(month),
      previousParam: formatMonthParam(previousMonth(month)),
      nextParam: formatMonthParam(nextMonth(month)),
      days: dates,
      pending,
      inMonth,
      counters: counters.map((counter) => {
        const entries: LedgerEntry[] = counter.operations.map((operation) => ({
          kind: operation.kind,
          quantity: Number(operation.quantity.toString()),
          unit: operation.unit,
          effectiveDate: operation.effectiveDate.toISOString().slice(0, 10),
        }));
        // La projection des acquisitions restantes arrive avec la clôture des
        // périodes de paie (WP-07) : d'ici là, le prévisionnel vaut le courant.
        const view = counterView(entries, 0);
        return {
          membershipId: counter.membershipId,
          name: nameById.get(counter.membershipId) ?? 'Salarié',
          counterType: counter.counterType,
          accrued: view.accrued,
          taken: view.taken,
          balance: view.balance,
          projected: view.projected,
        };
      }),
      absenceTypes,
      people: canSeeOthers
        ? members
            .map((member) => ({
              membershipId: member.id,
              name: nameById.get(member.id) ?? member.employeeNumber,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        : [
            {
              membershipId: actor.membershipId,
              name: nameById.get(actor.membershipId) ?? 'Moi',
            },
          ],
      canDecide,
      canAdjust,
      ownMembershipId: actor.membershipId,
    };
  });
}

/** Absences acceptées d'une période, pour la grille de planning. */
export async function acceptedAbsencesBetween(
  membershipIds: string[],
  from: string,
  to: string,
): Promise<
  Array<{
    membershipId: string;
    startDate: string;
    endDate: string;
    label: string;
    colorKey: string;
  }>
> {
  return query('planning.view', async (db) => {
    const rows = await db.timeOff.findMany({
      where: {
        membershipId: { in: membershipIds },
        status: 'ACCEPTED',
        startDate: { lte: new Date(`${to}T00:00:00Z`) },
        endDate: { gte: new Date(`${from}T00:00:00Z`) },
      },
      include: { absenceType: true },
    });

    return rows.map((row) => ({
      membershipId: row.membershipId,
      startDate: row.startDate.toISOString().slice(0, 10),
      endDate: row.endDate.toISOString().slice(0, 10),
      // La grille de planning n'a jamais besoin du motif médical : « Absence »
      // suffit à ne pas planifier quelqu'un.
      label: row.absenceType.isSocialSecurity
        ? 'Absence'
        : row.absenceType.name,
      colorKey: row.absenceType.colorKey,
    }));
  });
}
