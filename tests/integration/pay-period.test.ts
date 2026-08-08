import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { IDCC_1517_PARAMETERS } from '@/domain/compliance/idcc1517';
import { zonedInstant } from '@/domain/planning/week';

/**
 * Périodes de paie — WP-07.
 *
 * Deux critères d'acceptation ne se démontrent qu'en base :
 *
 * - **Le verrouillage refuse toute mutation** dont la date tombe dans la
 *   période. Un contrôle applicatif qui laisserait passer une écriture rendrait
 *   faux un mois déjà transmis au cabinet.
 * - **Grille, rapport d'heures et instantané donnent des chiffres identiques.**
 *   Trois calculs séparés divergent, et l'écart ne se voit qu'au bulletin.
 */

const enabled = (process.env.DATABASE_URL ?? '').length > 0;
const describeIfDb = enabled ? describe : describe.skip;

const TZ = 'Europe/Paris';
const suffix = `period-${Date.now()}`;
const accountId = `${suffix}-account`;
const locationId = `${suffix}-loc`;
const teamId = `${suffix}-team`;
const membershipId = `${suffix}-member`;

let unscoped: typeof import('@/server/tenant').unscoped;
let withTenant: typeof import('@/server/tenant').withTenant;
let assertPeriodOpen: typeof import('@/server/payroll/periods').assertPeriodOpen;
let PeriodLockedError: typeof import('@/server/payroll/periods').PeriodLockedError;
let computeSnapshots: typeof import('@/server/payroll/periods').computeSnapshots;
let buildPayrollPeriod: typeof import('@/server/payroll/build').buildPayrollPeriod;

let periodId = '';

/** Août de l'an prochain : loin de tout ce que le seed pose. */
const YEAR = new Date().getUTCFullYear() + 3;
const MONTH = { year: YEAR, month: 8 };

describeIfDb('période de paie', () => {
  beforeAll(async () => {
    process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 3).toString('base64');
    ({ unscoped, withTenant } = await import('@/server/tenant'));
    ({ assertPeriodOpen, PeriodLockedError, computeSnapshots } = await import(
      '@/server/payroll/periods'
    ));
    ({ buildPayrollPeriod } = await import('@/server/payroll/build'));

    const db = unscoped();

    await db.account.create({ data: { id: accountId, name: `Compte ${suffix}` } });
    await db.location.create({
      data: {
        id: locationId,
        accountId,
        name: 'Établissement de test',
        timezone: TZ,
        employerContributionRate: 0,
      },
    });
    await db.team.create({
      data: { id: teamId, accountId, locationId, name: 'Vente' },
    });

    const role = await db.role.create({
      data: { accountId, key: 'employee', name: 'Employé' },
    });
    await db.membership.create({
      data: {
        id: membershipId,
        accountId,
        roleId: role.id,
        employeeNumber: 'P0001',
        silaeMatricule: '00001',
        status: 'ACTIVE',
      },
    });
    await db.employeeProfile.create({
      data: { membershipId, accountId, firstName: 'Test', lastName: 'Période' },
    });
    await db.userContract.create({
      data: {
        accountId,
        membershipId,
        locationId,
        contractType: 'CDI',
        startDate: new Date('2024-01-01'),
        workTimeArrangement: 'HOURLY',
        weeklyHours: 35,
      },
    });
    await db.teamMember.create({ data: { accountId, teamId, membershipId } });

    await db.collectiveAgreement.create({
      data: {
        accountId,
        idcc: '1517',
        name: 'Test',
        parameters: IDCC_1517_PARAMETERS,
        version: 1,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    // Deux créneaux : l'un avec réalisé saisi, l'autre sans — c'est le cas
    // qui vérifie que le prévu fait foi à défaut.
    const schedule = await db.weeklySchedule.create({
      data: { accountId, teamId, locationId, isoYear: YEAR, isoWeek: 32 },
    });
    await db.shift.create({
      data: {
        accountId,
        weeklyScheduleId: schedule.id,
        membershipId,
        localDate: new Date(`${YEAR}-08-03T00:00:00Z`),
        startAt: zonedInstant(`${YEAR}-08-03`, '09:00', TZ),
        endAt: zonedInstant(`${YEAR}-08-03`, '17:00', TZ),
        breakMinutes: 0,
      },
    });
    await db.shift.create({
      data: {
        accountId,
        weeklyScheduleId: schedule.id,
        membershipId,
        localDate: new Date(`${YEAR}-08-04T00:00:00Z`),
        startAt: zonedInstant(`${YEAR}-08-04`, '09:00', TZ),
        endAt: zonedInstant(`${YEAR}-08-04`, '17:00', TZ),
        breakMinutes: 0,
        actualStartAt: zonedInstant(`${YEAR}-08-04`, '09:00', TZ),
        actualEndAt: zonedInstant(`${YEAR}-08-04`, '19:00', TZ),
      },
    });

    const period = await db.payPeriod.create({
      data: {
        accountId,
        locationId,
        label: `Août ${YEAR}`,
        startDate: new Date(`${YEAR}-08-01T00:00:00Z`),
        endDate: new Date(`${YEAR}-08-31T00:00:00Z`),
      },
    });
    periodId = period.id;
  });

  afterAll(async () => {
    if (!enabled) return;
    await unscoped().account.delete({ where: { id: accountId } });
  });

  it('laisse passer une mutation sur une période ouverte', async () => {
    await withTenant(accountId, async (db) => {
      await expect(
        assertPeriodOpen(db, locationId, [`${YEAR}-08-10`]),
      ).resolves.toBeUndefined();
    });
  });

  it('retient le réalisé quand il est saisi, le prévu sinon', async () => {
    await withTenant(accountId, async (db) => {
      const payroll = await buildPayrollPeriod(db, MONTH, locationId);
      const hours = payroll?.rows[0]?.elements.find(
        (element) => element.key === 'WORKED_HOURS',
      );

      // 8 h prévues le 3, 10 h réalisées le 4 : 18 h au total, pas 16.
      expect(hours?.value).toBe(18 * 60);
    });
  });

  it('fige des instantanés identiques au rapport', async () => {
    // Le critère croisé : l'instantané vient de la **même fonction** que le
    // rapport et l'export. Trois calculs séparés divergeraient.
    await withTenant(accountId, async (db) => {
      const written = await computeSnapshots(db, periodId, MONTH, locationId);
      expect(written).toBe(1);

      const snapshot = await db.payPeriodSnapshot.findFirst({
        where: { payPeriodId: periodId },
      });
      const payroll = await buildPayrollPeriod(db, MONTH, locationId);
      const hours = payroll?.rows[0]?.elements.find(
        (element) => element.key === 'WORKED_HOURS',
      );

      expect(snapshot?.plannedMinutes).toBe(hours?.value);
      expect(snapshot?.workedDays).toBe(2);
    });
  });

  it('refuse toute mutation une fois la période verrouillée', async () => {
    await unscoped().payPeriod.update({
      where: { id: periodId },
      data: { status: 'LOCKED', lockedAt: new Date() },
    });

    await withTenant(accountId, async (db) => {
      await expect(
        assertPeriodOpen(db, locationId, [`${YEAR}-08-10`]),
      ).rejects.toBeInstanceOf(PeriodLockedError);

      // Bornes comprises : le 1er et le 31 sont dans la période.
      await expect(
        assertPeriodOpen(db, locationId, [`${YEAR}-08-01`]),
      ).rejects.toBeInstanceOf(PeriodLockedError);
      await expect(
        assertPeriodOpen(db, locationId, [`${YEAR}-08-31`]),
      ).rejects.toBeInstanceOf(PeriodLockedError);
    });
  });

  it('laisse passer une date hors de la période verrouillée', async () => {
    await withTenant(accountId, async (db) => {
      await expect(
        assertPeriodOpen(db, locationId, [`${YEAR}-09-01`]),
      ).resolves.toBeUndefined();
    });
  });

  it('recalcule intégralement les instantanés au nouveau verrouillage', async () => {
    await withTenant(accountId, async (db) => {
      const before = await db.payPeriodSnapshot.findFirst({
        where: { payPeriodId: periodId },
      });
      const again = await computeSnapshots(db, periodId, MONTH, locationId);
      const after = await db.payPeriodSnapshot.findFirst({
        where: { payPeriodId: periodId },
      });

      expect(again).toBe(1);
      // Nouvel enregistrement, même contenu : ils ne sont pas immuables au sens
      // strict, c'est le couple (instantané, export) qui porte la preuve.
      expect(after?.id).not.toBe(before?.id);
      expect(after?.plannedMinutes).toBe(before?.plannedMinutes);
    });
  });
});
