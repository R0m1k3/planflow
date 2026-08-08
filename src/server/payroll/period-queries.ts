import { isExportStale } from '@/domain/hours/states';
import { formatMonthParam, monthOf } from '@/domain/planning/month';
import { query } from '@/server/context';

/**
 * Lectures des périodes de paie.
 *
 * La **péremption d'un export est déduite**, jamais lue : `generatedAt <
 * unlockedAt`. La stocker obligerait à réécrire une trace qui doit rester
 * append-only, et une trace réécrite ne prouve plus rien.
 */

export interface PeriodExport {
  id: string;
  checksum: string;
  lineCount: number;
  generatedAt: Date;
  stale: boolean;
}

export interface PeriodCard {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: 'OPEN' | 'LOCKED';
  version: number;
  lockedAt: Date | null;
  unlockedAt: Date | null;
  snapshotCount: number;
  /** Salariés entrés, sortis et extras sur la période. */
  entries: number;
  exits: number;
  extras: number;
  exports: PeriodExport[];
}

export interface PeriodsView {
  location: { id: string; name: string };
  locations: Array<{ id: string; name: string }>;
  periods: PeriodCard[];
  /** Mois proposé par défaut à la création. */
  suggestedMonth: string;
  canLock: boolean;
  canUnlock: boolean;
  canDelete: boolean;
}

export async function getPeriods(locationId?: string): Promise<PeriodsView | null> {
  const { can } = await import('@/domain/access/authorize');

  return query(
    'payroll.access',
    async (db, actor) => {
      const locations = await db.location.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      const location =
        locations.find((candidate) => candidate.id === locationId) ??
        locations[0];
      if (!location) return null;

      const periods = await db.payPeriod.findMany({
        where: { locationId: location.id },
        orderBy: { startDate: 'desc' },
        take: 24,
      });

      const exports = await db.payrollExport.findMany({
        where: { payPeriodId: { in: periods.map((period) => period.id) } },
        orderBy: { generatedAt: 'desc' },
      });

      const cards: PeriodCard[] = [];
      for (const period of periods) {
        const snapshotCount = await db.payPeriodSnapshot.count({
          where: { payPeriodId: period.id },
        });

        // Entrées et sorties de la période : ce sont les mouvements qui
        // expliquent un écart d'effectif au bulletin.
        const entries = await db.userContract.count({
          where: {
            locationId: location.id,
            startDate: { gte: period.startDate, lte: period.endDate },
          },
        });
        const exits = await db.userContract.count({
          where: {
            locationId: location.id,
            endDate: { gte: period.startDate, lte: period.endDate },
          },
        });
        const extras = await db.userContract.count({
          where: {
            locationId: location.id,
            contractType: { in: ['EXTRA', 'SAISONNIER', 'INTERIM'] },
            startDate: { lte: period.endDate },
          },
        });

        cards.push({
          id: period.id,
          label: period.label,
          startDate: period.startDate.toISOString().slice(0, 10),
          endDate: period.endDate.toISOString().slice(0, 10),
          status: period.status,
          version: period.version,
          lockedAt: period.lockedAt,
          unlockedAt: period.unlockedAt,
          snapshotCount,
          entries,
          exits,
          extras,
          exports: exports
            .filter((entry) => entry.payPeriodId === period.id)
            .map((entry) => ({
              id: entry.id,
              checksum: entry.checksum,
              lineCount: entry.lineCount,
              generatedAt: entry.generatedAt,
              stale: isExportStale(entry.generatedAt, period.unlockedAt),
            })),
        });
      }

      return {
        location,
        locations,
        periods: cards,
        suggestedMonth: formatMonthParam(monthOf(new Date())),
        canLock: can(actor, 'payroll.period.lock'),
        canUnlock: can(actor, 'payroll.period.unlock'),
        canDelete: can(actor, 'payroll.period.delete'),
      };
    },
    locationId ? { locationId } : undefined,
  );
}
