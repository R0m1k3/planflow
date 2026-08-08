import { can, inScope } from '@/domain/access/authorize';
import {
  absenteeism,
  headcount,
  labourCost,
  profileGaps,
  turnoverRate,
  upcomingDeadlines,
  type Deadline,
  type ProfileCompleteness,
} from '@/domain/hr/indicators';
import { shiftMinutes } from '@/domain/counters/week';
import { monthDates, monthLabel, type Month } from '@/domain/planning/month';
import { zonedMidnight } from '@/domain/planning/week';
import { query } from '@/server/context';

/**
 * Tableau de bord RH — WP-09.
 *
 * Trois exigences le gouvernent :
 *
 * 1. **Chaque indicateur est explicable.** Toute tuile porte l'identifiant de
 *    sa liste source ; un clic mène aux lignes. Un chiffre qu'on ne peut pas
 *    ouvrir ne se corrige pas, il se conteste.
 * 2. **Les agrégats respectent le périmètre.** Un manager d'un établissement ne
 *    voit pas les mouvements d'un autre. Le filtrage est en base, pas à
 *    l'affichage.
 * 3. **Les échéances remontent avant de tomber**, pas après.
 */

export type ListKey =
  | 'entrees'
  | 'sorties'
  | 'essais'
  | 'profils'
  | 'titres'
  | 'absences'
  | 'contrats';

export interface Tile {
  key: ListKey;
  label: string;
  value: string;
  tone: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info';
  hint: string;
}

export interface DashboardRow {
  id: string;
  membershipId: string;
  name: string;
  detail: string;
  date: string | null;
  tone: 'neutral' | 'warn' | 'danger' | 'info';
}

export interface Dashboard {
  month: Month;
  label: string;
  monthParam: string;
  previousParam: string;
  nextParam: string;
  location: { id: string; name: string } | null;
  locations: Array<{ id: string; name: string }>;
  tiles: Tile[];
  indicators: {
    closingHeadcount: number;
    averageHeadcount: number;
    turnoverRate: number | null;
    absenceDays: number;
    sickDays: number;
    absenteeismRate: number | null;
    plannedMinutes: number;
    labourCost: number | null;
  };
  lists: Record<ListKey, DashboardRow[]>;
  canSeeCost: boolean;
}

/** Fenêtres d'échéance, en jours. */
const TRIAL_WINDOW = 45;
const PERMIT_WINDOW = 90;

export async function getDashboard(
  month: Month,
  locationId?: string,
): Promise<Dashboard> {
  // `members.view` plutôt qu'une capacité dédiée : le tableau de bord n'est
  // qu'une lecture agrégée de l'annuaire et de ses mouvements. Créer une
  // capacité de plus donnerait un droit à administrer sans rien protéger de
  // nouveau.
  return query('members.view', async (db, actor) => {
    const allLocations = await db.location.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, employerContributionRate: true },
      orderBy: { name: 'asc' },
    });

    // Le périmètre s'applique **avant** l'agrégation : un manager d'un
    // établissement ne doit pas voir passer les mouvements d'un autre, même
    // fondus dans un total.
    const visible = allLocations.filter((location) =>
      inScope(actor, { locationId: location.id }),
    );
    const location =
      visible.find((candidate) => candidate.id === locationId) ??
      visible[0] ??
      null;

    const dates = monthDates(month);
    const from = dates[0] as string;
    const to = dates[dates.length - 1] as string;

    const locationFilter = location ? { locationId: location.id } : {};

    const contracts = await db.userContract.findMany({
      where: locationFilter,
      include: {
        membership: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    const nameOf = (contract: (typeof contracts)[number]) =>
      `${contract.membership.profile?.firstName ?? ''} ${contract.membership.profile?.lastName ?? contract.membership.employeeNumber}`.trim();

    const counts = headcount(
      contracts.map((contract) => ({
        membershipId: contract.membershipId,
        startDate: contract.startDate.toISOString().slice(0, 10),
        endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
      })),
      from,
      to,
    );

    const memberIds = [
      ...new Set(contracts.map((contract) => contract.membershipId)),
    ];

    // --- Absences ---------------------------------------------------------
    const timeOffs = await db.timeOff.findMany({
      where: {
        membershipId: { in: memberIds },
        status: 'ACCEPTED',
        startDate: { lte: new Date(`${to}T00:00:00Z`) },
        endDate: { gte: new Date(`${from}T00:00:00Z`) },
      },
      include: { absenceType: true },
    });

    const absence = absenteeism(
      timeOffs.map((entry) => ({
        membershipId: entry.membershipId,
        days: Number(entry.countedDays?.toString() ?? '0'),
        isSocialSecurity: entry.absenceType.isSocialSecurity,
        timeOffId: entry.id,
      })),
      // Base théorique : effectif moyen × jours ouvrables du mois.
      counts.average * workingDaysIn(dates),
    );

    // --- Heures planifiées et coût ---------------------------------------
    const canSeeCost = can(actor, 'planning.counters.view');
    let plannedMinutes = 0;
    let cost: number | null = null;

    if (location) {
      const timezone = 'Europe/Paris';
      const shifts = await db.shift.findMany({
        where: {
          membershipId: { in: memberIds },
          startAt: {
            gte: zonedMidnight(from, timezone),
            lt: zonedMidnight(
              new Date(new Date(`${to}T00:00:00Z`).getTime() + 86_400_000)
                .toISOString()
                .slice(0, 10),
              timezone,
            ),
          },
        },
        select: {
          membershipId: true,
          startAt: true,
          endAt: true,
          breakMinutes: true,
        },
      });

      plannedMinutes = shifts.reduce(
        (sum, shift) =>
          sum + shiftMinutes(shift.startAt, shift.endAt, shift.breakMinutes),
        0,
      );

      if (canSeeCost) {
        const rateBy = new Map(
          contracts.map((contract) => [
            contract.membershipId,
            Number(contract.hourlyRate?.toString() ?? '0'),
          ]),
        );
        const employerRate = Number(
          allLocations
            .find((entry) => entry.id === location.id)
            ?.employerContributionRate.toString() ?? '0',
        );

        // Un taux horaire absent vaut zéro et non une estimation : afficher un
        // coût inventé serait pire que d'afficher un coût partiel.
        const total = shifts.reduce((sum, shift) => {
          const rate = rateBy.get(shift.membershipId ?? '') ?? 0;
          if (rate === 0) return sum;
          return (
            sum +
            labourCost(
              shiftMinutes(shift.startAt, shift.endAt, shift.breakMinutes),
              rate,
              employerRate,
            )
          );
        }, 0);
        cost = Math.round(total * 100) / 100;
      }
    }

    // --- Échéances --------------------------------------------------------
    const today = new Date().toISOString().slice(0, 10);

    const trials: Deadline[] = upcomingDeadlines(
      contracts
        .filter((contract) => contract.trialEndDate && contract.status === 'ACTIVE')
        .map((contract) => ({
          id: contract.id,
          membershipId: contract.membershipId,
          name: nameOf(contract),
          dueDate: (contract.trialEndDate as Date).toISOString().slice(0, 10),
          label: 'Fin de période d’essai',
        })),
      today,
      TRIAL_WINDOW,
    );

    const permits = await db.workPermit.findMany({
      where: { membershipId: { in: memberIds } },
      include: {
        membership: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    const permitDeadlines: Deadline[] = upcomingDeadlines(
      permits.map((permit) => ({
        id: permit.id,
        membershipId: permit.membershipId,
        name: `${permit.membership.profile?.firstName ?? ''} ${permit.membership.profile?.lastName ?? permit.membership.employeeNumber}`.trim(),
        dueDate: permit.expiresAt.toISOString().slice(0, 10),
        label: permit.permitType,
      })),
      today,
      PERMIT_WINDOW,
    );

    // --- Dossiers incomplets ---------------------------------------------
    const memberships = await db.membership.findMany({
      where: { id: { in: memberIds }, archivedAt: null },
      include: { profile: true },
    });

    const gaps: ProfileCompleteness[] = memberships
      .map((membership) =>
        profileGaps({
          membershipId: membership.id,
          name: `${membership.profile?.firstName ?? ''} ${membership.profile?.lastName ?? membership.employeeNumber}`.trim(),
          birthDate: membership.profile?.birthDate ?? null,
          address: membership.profile?.addressLine1 ?? null,
          city: membership.profile?.city ?? null,
          phone: membership.profile?.phone ?? null,
          // Présence seulement : savoir qu'une valeur existe n'exige pas de la
          // déchiffrer.
          socialSecurityNumber: membership.profile?.socialSecurityNumberEnc ?? null,
          iban: membership.profile?.ibanEnc ?? null,
          hasContract: contracts.some(
            (contract) => contract.membershipId === membership.id,
          ),
        }),
      )
      .filter((entry) => entry.missing.length > 0);

    // --- Modifications de contrat ----------------------------------------
    const amendments = await db.amendment.findMany({
      where: {
        userContractId: { in: contracts.map((contract) => contract.id) },
        effectiveDate: {
          gte: new Date(`${from}T00:00:00Z`),
          lte: new Date(`${to}T00:00:00Z`),
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    const contractById = new Map(
      contracts.map((contract) => [contract.id, contract]),
    );

    const lists: Record<ListKey, DashboardRow[]> = {
      entrees: contracts
        .filter((contract) => counts.entries.includes(contract.membershipId))
        .map((contract) => ({
          id: contract.id,
          membershipId: contract.membershipId,
          name: nameOf(contract),
          detail: contract.contractType,
          date: contract.startDate.toISOString().slice(0, 10),
          tone: 'info' as const,
        })),
      sorties: contracts
        .filter((contract) => counts.exits.includes(contract.membershipId))
        .map((contract) => ({
          id: contract.id,
          membershipId: contract.membershipId,
          name: nameOf(contract),
          detail: contract.contractType,
          date: contract.endDate?.toISOString().slice(0, 10) ?? null,
          tone: 'neutral' as const,
        })),
      essais: trials.map((entry) => ({
        id: entry.id,
        membershipId: entry.membershipId,
        name: entry.name,
        detail:
          entry.severity === 'PASSED'
            ? `Échéance dépassée de ${Math.abs(entry.daysLeft)} jours`
            : `Dans ${entry.daysLeft} jours`,
        date: entry.dueDate,
        tone: entry.severity === 'PASSED' ? 'danger' : 'warn',
      })),
      titres: permitDeadlines.map((entry) => ({
        id: entry.id,
        membershipId: entry.membershipId,
        name: entry.name,
        detail:
          entry.severity === 'PASSED'
            ? `${entry.label} expiré depuis ${Math.abs(entry.daysLeft)} jours`
            : `${entry.label} — dans ${entry.daysLeft} jours`,
        date: entry.dueDate,
        tone: entry.severity === 'PASSED' ? 'danger' : 'warn',
      })),
      profils: gaps.map((entry) => ({
        id: entry.membershipId,
        membershipId: entry.membershipId,
        name: entry.name,
        detail: `Manque : ${entry.missing.join(', ')}`,
        date: null,
        tone: 'warn' as const,
      })),
      absences: timeOffs.map((entry) => ({
        id: entry.id,
        membershipId: entry.membershipId,
        name:
          memberships.find((member) => member.id === entry.membershipId)
            ?.profile?.firstName ?? 'Salarié',
        // Le journal des absences ne porte jamais le motif médical : c'est une
        // donnée de santé, et un tableau de bord n'en a aucun besoin.
        detail: entry.absenceType.isSocialSecurity
          ? `Absence — ${entry.countedDays?.toString() ?? '0'} j`
          : `${entry.absenceType.name} — ${entry.countedDays?.toString() ?? '0'} j`,
        date: entry.startDate.toISOString().slice(0, 10),
        tone: 'info' as const,
      })),
      contrats: amendments.map((amendment) => {
        const contract = contractById.get(amendment.userContractId);
        return {
          id: amendment.id,
          membershipId: contract?.membershipId ?? '',
          name: contract ? nameOf(contract) : 'Salarié',
          detail: amendment.reason ?? 'Avenant',
          date: amendment.effectiveDate.toISOString().slice(0, 10),
          tone: 'neutral' as const,
        };
      }),
    };

    const { formatMonthParam, nextMonth, previousMonth } = await import(
      '@/domain/planning/month'
    );

    return {
      month,
      label: monthLabel(month),
      monthParam: formatMonthParam(month),
      previousParam: formatMonthParam(previousMonth(month)),
      nextParam: formatMonthParam(nextMonth(month)),
      location: location ? { id: location.id, name: location.name } : null,
      locations: visible.map(({ id, name }) => ({ id, name })),
      tiles: [
        {
          key: 'profils',
          label: 'Profils incomplets',
          value: String(lists.profils.length),
          tone: lists.profils.length > 0 ? 'warn' : 'ok',
          hint: 'Dossiers auxquels il manque une pièce',
        },
        {
          key: 'essais',
          label: 'Fins de période d’essai',
          value: String(lists.essais.length),
          tone: lists.essais.some((row) => row.tone === 'danger')
            ? 'danger'
            : 'info',
          hint: `Échéances dans les ${TRIAL_WINDOW} jours`,
        },
        {
          key: 'titres',
          label: 'Titres de séjour',
          value: String(lists.titres.length),
          tone: lists.titres.some((row) => row.tone === 'danger')
            ? 'danger'
            : lists.titres.length > 0
              ? 'warn'
              : 'ok',
          hint: `Échéances dans les ${PERMIT_WINDOW} jours`,
        },
        {
          key: 'entrees',
          label: 'Entrées du mois',
          value: String(lists.entrees.length),
          tone: 'accent',
          hint: 'Contrats démarrés sur la période',
        },
        {
          key: 'sorties',
          label: 'Sorties du mois',
          value: String(lists.sorties.length),
          tone: 'neutral',
          hint: 'Contrats terminés sur la période',
        },
        {
          key: 'contrats',
          label: 'Avenants',
          value: String(lists.contrats.length),
          tone: 'neutral',
          hint: 'Modifications de contrat prenant effet ce mois',
        },
      ],
      indicators: {
        closingHeadcount: counts.closing,
        averageHeadcount: counts.average,
        turnoverRate: turnoverRate(counts),
        absenceDays: absence.totalDays,
        sickDays: absence.sickDays,
        absenteeismRate: absence.rate,
        plannedMinutes,
        labourCost: cost,
      },
      lists,
      canSeeCost,
    };
  }, locationId ? { locationId } : undefined);
}

/** Jours ouvrables d'un mois : base théorique de l'absentéisme. */
function workingDaysIn(dates: string[]): number {
  return dates.filter((date) => {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    return day !== 0;
  }).length;
}
