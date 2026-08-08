import {
  PAYROLL_ELEMENT_DEFINITIONS,
  type PayrollElementDefinition,
} from '@/domain/payroll/elements';
import { SILAE_OBSERVED_CODES, SILAE_SERVICE_CODES } from '@/domain/payroll/silae';
import type { Month } from '@/domain/planning/month';
import { query } from '@/server/context';
import { buildPayrollPeriod, type PayrollPeriod } from '@/server/payroll/build';

/**
 * Lectures de l'écran de paie.
 *
 * `payroll.access` ouvre le rapport, `payroll.export.silae` produit le
 * fichier : un responsable de magasin doit pouvoir contrôler ses heures sans
 * pouvoir transmettre au cabinet.
 */

export interface PayrollView extends PayrollPeriod {
  locations: Array<{ id: string; name: string }>;
  monthParam: string;
  previousParam: string;
  nextParam: string;
  label: string;
}

export async function getPayrollPeriod(
  month: Month,
  locationId?: string,
): Promise<PayrollView | null> {
  return query(
    'payroll.access',
    async (db) => {
      const locations = await db.location.findMany({
        where: { archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      const location =
        locations.find((candidate) => candidate.id === locationId) ??
        locations[0];
      if (!location) return null;

      const period = await buildPayrollPeriod(db, month, location.id);
      if (!period) return null;

      const { formatMonthParam, monthLabel, nextMonth, previousMonth } =
        await import('@/domain/planning/month');

      return {
        ...period,
        locations,
        label: monthLabel(month),
        monthParam: formatMonthParam(month),
        previousParam: formatMonthParam(previousMonth(month)),
        nextParam: formatMonthParam(nextMonth(month)),
      };
    },
    locationId ? { locationId } : undefined,
  );
}

export interface MappingRow extends PayrollElementDefinition {
  silaeCode: string | null;
  confirmed: boolean;
}

export interface MappingView {
  rows: MappingRow[];
  /** Codes relevés dans l'export de référence, proposés à la saisie. */
  knownCodes: string[];
  exports: Array<{
    id: string;
    periodStart: Date;
    periodEnd: Date;
    checksum: string;
    lineCount: number;
    generatedAt: Date;
  }>;
}

export async function getSilaeMapping(): Promise<MappingView> {
  return query('payroll.export.silae', async (db) => {
    const mappings = await db.silaeCodeMapping.findMany();
    const byKey = new Map(mappings.map((entry) => [entry.sourceKey, entry]));

    const exports = await db.payrollExport.findMany({
      orderBy: { generatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        checksum: true,
        lineCount: true,
        generatedAt: true,
      },
    });

    return {
      rows: PAYROLL_ELEMENT_DEFINITIONS.map((definition) => {
        const mapping = byKey.get(definition.key);
        return {
          ...definition,
          silaeCode: mapping?.silaeCode ?? null,
          confirmed: mapping?.confirmed ?? false,
        };
      }),
      knownCodes: [
        ...Object.values(SILAE_SERVICE_CODES),
        ...SILAE_OBSERVED_CODES,
      ],
      exports,
    };
  });
}
