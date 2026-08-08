import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Immutabilité du registre — critère d'acceptation de WP-06.
 *
 * La règle est **en base**, pas seulement dans l'application : une règle
 * applicative finit par être contournée par un script de reprise, une console
 * d'administration ou une migration pressée. Ces tests écrivent directement,
 * sans passer par les Server Actions, pour le prouver.
 */

const enabled = (process.env.DATABASE_URL ?? '').length > 0;
const describeIfDb = enabled ? describe : describe.skip;

const suffix = `ledger-${Date.now()}`;
const accountId = `${suffix}-account`;
const membershipId = `${suffix}-member`;

let unscoped: typeof import('@/server/tenant').unscoped;
let counterId = '';
let operationId = '';

describeIfDb('registre des compteurs', () => {
  beforeAll(async () => {
    process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 3).toString('base64');
    ({ unscoped } = await import('@/server/tenant'));
    const db = unscoped();

    await db.account.create({
      data: { id: accountId, name: `Compte ${suffix}` },
    });
    const role = await db.role.create({
      data: { accountId, key: 'employee', name: 'Employé' },
    });
    await db.membership.create({
      data: {
        id: membershipId,
        accountId,
        roleId: role.id,
        employeeNumber: 'L0001',
        status: 'ACTIVE',
      },
    });

    const counter = await db.counter.create({
      data: {
        accountId,
        membershipId,
        counterType: 'PAID_LEAVE',
        acquisitionPeriodStart: new Date('2026-06-01'),
        acquisitionPeriodEnd: new Date('2027-05-31'),
      },
    });
    counterId = counter.id;

    const operation = await db.ledgerOperation.create({
      data: {
        accountId,
        counterId,
        kind: 'ACCRUAL',
        quantity: 25,
        unit: 'DAY',
        effectiveDate: new Date('2026-06-01'),
        sourceType: 'SYSTEM',
      },
    });
    operationId = operation.id;
  });

  afterAll(async () => {
    if (!enabled) return;
    const db = unscoped();
    // Le trigger interdit DELETE sur les écritures : la suppression du compte
    // ne peut donc pas cascader. On le désactive le temps du ménage.
    await db.$executeRawUnsafe(
      'ALTER TABLE "LedgerOperation" DISABLE TRIGGER ledger_operation_append_only',
    );
    await db.account.delete({ where: { id: accountId } });
    await db.$executeRawUnsafe(
      'ALTER TABLE "LedgerOperation" ENABLE TRIGGER ledger_operation_append_only',
    );
  });

  it('refuse toute modification d’écriture', async () => {
    await expect(
      unscoped().ledgerOperation.update({
        where: { id: operationId },
        data: { quantity: 999 },
      }),
    ).rejects.toThrow(/append-only/);
  });

  it('refuse toute suppression d’écriture', async () => {
    await expect(
      unscoped().ledgerOperation.delete({ where: { id: operationId } }),
    ).rejects.toThrow(/append-only/);
  });

  it('accepte une contre-passation, qui laisse les deux écritures', async () => {
    // Une correction s'écrit ; elle ne se réécrit pas. Les deux lignes
    // coexistent, et le solde redevient juste par addition.
    const db = unscoped();
    await db.ledgerOperation.create({
      data: {
        accountId,
        counterId,
        kind: 'REGULARISATION',
        quantity: -25,
        unit: 'DAY',
        effectiveDate: new Date('2026-07-01'),
        sourceType: 'MANUAL',
        reason: 'Correction du solde d’ouverture',
        reversesId: operationId,
      },
    });

    const operations = await db.ledgerOperation.findMany({
      where: { counterId },
    });
    expect(operations).toHaveLength(2);

    const balance = operations.reduce(
      (sum, operation) => sum + Number(operation.quantity.toString()),
      0,
    );
    expect(balance).toBe(0);
  });

  it('n’accepte qu’une seule contre-passation par écriture', async () => {
    // `reversesId` est unique : contre-passer deux fois la même écriture
    // doublerait la correction, et le solde partirait dans l'autre sens.
    await expect(
      unscoped().ledgerOperation.create({
        data: {
          accountId,
          counterId,
          kind: 'REGULARISATION',
          quantity: -25,
          unit: 'DAY',
          effectiveDate: new Date('2026-07-02'),
          sourceType: 'MANUAL',
          reversesId: operationId,
        },
      }),
    ).rejects.toThrow();
  });
});
