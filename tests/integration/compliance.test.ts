import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { IDCC_1517_PARAMETERS } from '@/domain/compliance/idcc1517';
import { zonedInstant } from '@/domain/planning/week';

/**
 * Le moteur branché sur la base — PLAN.md §12.2.
 *
 * Ce que ces tests vérifient, et que les tests de règles ne peuvent pas
 * vérifier : qu'une semaine ancienne reste évaluée avec les paramètres qui
 * s'appliquaient **alors**. C'est l'exigence n° 1 de la matrice — reproduire à
 * l'identique une paie antérieure après un changement de règle — et elle ne se
 * démontre qu'avec deux versions coexistantes en base.
 */

const enabled = (process.env.DATABASE_URL ?? '').length > 0;
const describeIfDb = enabled ? describe : describe.skip;

const TZ = 'Europe/Paris';
const suffix = `cmp-${Date.now()}`;
const accountId = `${suffix}-account`;
const locationId = `${suffix}-loc`;
const teamId = `${suffix}-team`;
const membershipId = `${suffix}-member`;

let agreementFor: typeof import('@/server/compliance/evaluate').agreementFor;
let evaluateSchedule: typeof import('@/server/compliance/evaluate').evaluateSchedule;
let withTenant: typeof import('@/server/tenant').withTenant;
let unscoped: typeof import('@/server/tenant').unscoped;

/** 10 h de travail : conforme à 10 h, non conforme à 8 h. */
function tenHourShift(scheduleId: string, date: string) {
  return {
    accountId,
    weeklyScheduleId: scheduleId,
    membershipId,
    localDate: new Date(`${date}T00:00:00Z`),
    startAt: zonedInstant(date, '08:00', TZ),
    endAt: zonedInstant(date, '18:00', TZ),
    breakMinutes: 0,
  };
}

describeIfDb('moteur de conformité en base', () => {
  let marchSchedule = '';
  let augustSchedule = '';

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 3).toString('base64');
    ({ agreementFor, evaluateSchedule } = await import(
      '@/server/compliance/evaluate'
    ));
    ({ withTenant, unscoped } = await import('@/server/tenant'));

    const db = unscoped();

    await db.account.create({
      data: { id: accountId, name: `Compte ${suffix}` },
    });
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
        employeeNumber: 'T0001',
        status: 'ACTIVE',
      },
    });
    await db.employeeProfile.create({
      data: { membershipId, accountId, firstName: 'Test', lastName: 'Salarié' },
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

    // Deux versions coexistantes. La v2 durcit la durée quotidienne et ne
    // prend effet qu'au 1er juillet.
    await db.collectiveAgreement.create({
      data: {
        accountId,
        idcc: '1517',
        name: 'Version initiale',
        parameters: IDCC_1517_PARAMETERS,
        version: 1,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
    await db.collectiveAgreement.create({
      data: {
        accountId,
        idcc: '1517',
        name: 'Version durcie',
        parameters: { ...IDCC_1517_PARAMETERS, maxDailyWorkMinutes: 8 * 60 },
        version: 2,
        effectiveFrom: new Date('2026-07-01'),
      },
    });

    // Semaine 11 de 2026 (9 mars) et semaine 33 (10 août) : mêmes créneaux.
    const march = await db.weeklySchedule.create({
      data: { accountId, teamId, locationId, isoYear: 2026, isoWeek: 11 },
    });
    const august = await db.weeklySchedule.create({
      data: { accountId, teamId, locationId, isoYear: 2026, isoWeek: 33 },
    });
    marchSchedule = march.id;
    augustSchedule = august.id;

    await db.shift.create({ data: tenHourShift(march.id, '2026-03-09') });
    await db.shift.create({ data: tenHourShift(august.id, '2026-08-10') });
  });

  afterAll(async () => {
    if (!enabled) return;
    await unscoped().account.delete({ where: { id: accountId } });
  });

  it('choisit la version en vigueur à la date, pas la plus récente', async () => {
    await withTenant(accountId, async (db) => {
      const inMarch = await agreementFor(db, new Date('2026-03-09'));
      const inAugust = await agreementFor(db, new Date('2026-08-10'));

      expect(inMarch?.version).toBe(1);
      expect(inAugust?.version).toBe(2);
    });
  });

  it('n’applique pas rétroactivement une règle plus dure', async () => {
    // Le cœur de l'exigence : 10 h de travail passent en mars sous la v1 et
    // déclenchent en août sous la v2, avec exactement les mêmes créneaux.
    await withTenant(accountId, async (db) => {
      const march = await evaluateSchedule(db, marchSchedule);
      const august = await evaluateSchedule(db, augustSchedule);

      expect(march.map((entry) => entry.ruleCode)).not.toContain(
        'MAX_DAILY_WORK',
      );
      expect(august.map((entry) => entry.ruleCode)).toContain('MAX_DAILY_WORK');
    });
  });

  it('mémorise la version appliquée sur chaque constat', async () => {
    await withTenant(accountId, async (db) => {
      const stored = await db.complianceViolation.findFirst({
        where: { weeklyScheduleId: augustSchedule, ruleCode: 'MAX_DAILY_WORK' },
      });
      const agreement = await agreementFor(db, new Date('2026-08-10'));

      // Sans elle, un constat ancien devient inexplicable dès que les
      // paramètres changent.
      expect(stored?.agreementId).toBe(agreement?.id);
    });
  });

  it('conserve l’acquittement d’une réévaluation à l’autre', async () => {
    await withTenant(accountId, async (db) => {
      const before = await db.complianceViolation.findFirst({
        where: { weeklyScheduleId: augustSchedule, ruleCode: 'MAX_DAILY_WORK' },
      });
      if (!before) throw new Error('Constat attendu introuvable.');
      await db.complianceViolation.update({
        where: { id: before.id },
        data: {
          acknowledgedBy: membershipId,
          acknowledgedAt: new Date(),
          acknowledgementReason: 'Inventaire annuel',
        },
      });

      // Un manager qui a justifié une alerte ne doit pas la revoir surgir
      // parce qu'un collègue a déplacé un créneau ailleurs dans la semaine.
      await evaluateSchedule(db, augustSchedule);

      const after = await db.complianceViolation.findFirst({
        where: { weeklyScheduleId: augustSchedule, ruleCode: 'MAX_DAILY_WORK' },
      });
      expect(after?.acknowledgementReason).toBe('Inventaire annuel');
      expect(after?.id).not.toBe(before.id);
    });
  });

  it('refuse de réécrire le contenu d’une version de convention', async () => {
    // Le figeage est en base, pas seulement dans l'application : une paie
    // antérieure doit rester reproductible même si quelqu'un écrit
    // directement en SQL.
    const db = unscoped();
    const agreement = await db.collectiveAgreement.findFirst({
      where: { accountId, version: 1 },
    });
    if (!agreement) throw new Error('Convention de test introuvable.');

    await expect(
      db.collectiveAgreement.update({
        where: { id: agreement.id },
        data: { parameters: { altered: true } },
      }),
    ).rejects.toThrow(/figé/);

    // L'approbation, elle, reste possible : c'est un acte postérieur légitime.
    await expect(
      db.collectiveAgreement.update({
        where: { id: agreement.id },
        data: { approvedBy: membershipId, approvedAt: new Date() },
      }),
    ).resolves.toBeTruthy();
  });
});
