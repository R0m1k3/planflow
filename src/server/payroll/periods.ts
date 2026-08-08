import { fallsInLockedPeriod } from '@/domain/hours/states';
import type { Month } from '@/domain/planning/month';
import { agreementFor } from '@/server/compliance/evaluate';
import { buildPayrollPeriod } from '@/server/payroll/build';
import type { ScopedClient } from '@/server/tenant';

/**
 * Périodes de paie — PLAN.md §4.6 et WP-07.
 *
 * Le verrouillage fige les instantanés et **interdit** toute mutation dont la
 * date tombe dans la période. Le déverrouillage existe : c'est une décision qui
 * exige une justification, parce qu'elle périme tout export déjà transmis au
 * cabinet.
 */

export class PeriodLockedError extends Error {
  constructor(label: string) {
    super(
      `La période de paie « ${label} » est verrouillée. Déverrouillez-la, ou passez la correction en régularisation sur la période suivante.`,
    );
    this.name = 'PeriodLockedError';
  }
}

/**
 * Refuse une mutation qui tomberait dans une période verrouillée.
 *
 * Appelé **avant** l'écriture, jamais après : une transaction annulée laisse
 * quand même passer les effets de bord non transactionnels.
 */
export async function assertPeriodOpen(
  db: ScopedClient,
  locationId: string,
  isoDates: string[],
): Promise<void> {
  if (isoDates.length === 0) return;

  const sorted = [...isoDates].sort();
  const periods = await db.payPeriod.findMany({
    where: {
      locationId,
      status: 'LOCKED',
      startDate: { lte: new Date(`${sorted[sorted.length - 1]}T00:00:00Z`) },
      endDate: { gte: new Date(`${sorted[0]}T00:00:00Z`) },
    },
    select: { label: true, startDate: true, endDate: true, status: true },
  });
  if (periods.length === 0) return;

  const asStrings = periods.map((period) => ({
    startDate: period.startDate.toISOString().slice(0, 10),
    endDate: period.endDate.toISOString().slice(0, 10),
    status: period.status,
  }));

  for (const isoDate of sorted) {
    if (fallsInLockedPeriod(isoDate, asStrings)) {
      const blocking = periods.find(
        (period) =>
          isoDate >= period.startDate.toISOString().slice(0, 10) &&
          isoDate <= period.endDate.toISOString().slice(0, 10),
      );
      throw new PeriodLockedError(blocking?.label ?? 'période');
    }
  }
}

/**
 * Écrit les instantanés de la période.
 *
 * Ils viennent de **la même fonction** que le rapport de paie et l'export :
 * `buildPayrollPeriod`. C'est ce qui garantit le critère d'acceptation — grille,
 * rapport d'heures et instantané donnent des chiffres identiques. Trois
 * calculs séparés divergeraient, et l'écart ne se verrait qu'au bulletin.
 */
export async function computeSnapshots(
  db: ScopedClient,
  payPeriodId: string,
  month: Month,
  locationId: string,
): Promise<number> {
  const period = await buildPayrollPeriod(db, month, locationId);
  if (!period) return 0;

  const agreement = await agreementFor(
    db,
    new Date(`${period.startDate}T00:00:00Z`),
  );

  // Un nouveau verrouillage **recalcule intégralement** : les instantanés ne
  // sont pas immuables au sens strict, c'est le couple (instantané, export)
  // qui porte la preuve.
  await db.payPeriodSnapshot.deleteMany({ where: { payPeriodId } });

  let written = 0;
  for (const row of period.rows) {
    const elements = new Map(
      row.elements.map((element) => [element.key, element.value]),
    );

    await db.payPeriodSnapshot.create({
      data: {
        payPeriodId,
        membershipId: row.membershipId,
        plannedMinutes: elements.get('WORKED_HOURS') ?? 0,
        actualMinutes: elements.get('WORKED_HOURS') ?? 0,
        absenceMinutes: 0,
        workedDays:
          elements.get('WORKED_DAYS') ?? elements.get('FORFAIT_DAYS') ?? 0,
        overtimeByBracket: [
          { ratePercent: 25, minutes: elements.get('OVERTIME_25') ?? 0 },
          { ratePercent: 50, minutes: elements.get('OVERTIME_50') ?? 0 },
        ],
        absenceBreakdown: [],
        variables: row.elements.map((element) => ({
          key: element.key,
          value: element.value,
          unit: element.unit,
        })),
        agreementId: agreement?.id ?? null,
      } as never,
    });
    written += 1;
  }

  return written;
}
