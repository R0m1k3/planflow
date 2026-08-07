import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Isolation multi-tenant au niveau base — PLAN.md §3.1.
 *
 * Ces tests parlent directement à PostgreSQL, sans passer par Prisma : ils
 * vérifient que l'isolation tient **même si la couche applicative est
 * contournée**. Un test qui passerait par l'extension Prisma ne prouverait que
 * l'extension.
 *
 * Point d'attention : un **superutilisateur contourne la RLS**, y compris avec
 * FORCE. Ces tests créent donc un rôle restreint, ce qui est aussi la
 * configuration attendue en production (voir README).
 */

const APP_ROLE = 'planflow_rls_test';
const APP_PASSWORD = 'rls-test-only';

const adminUrl = process.env.DATABASE_URL ?? '';
const enabled = adminUrl.length > 0;

let admin: Client;
let app: Client;
let accountA: string;
let accountB: string;

const describeIfDb = enabled ? describe : describe.skip;

describeIfDb('row-level security', () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: adminUrl });
    await admin.connect();

    // Rôle applicatif sans privilège particulier : c'est la seule façon de
    // voir les politiques s'appliquer.
    await admin.query(`DROP OWNED BY ${APP_ROLE}`).catch(() => undefined);
    await admin.query(`DROP ROLE IF EXISTS ${APP_ROLE}`).catch(() => undefined);
    await admin.query(
      `CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}' NOSUPERUSER NOBYPASSRLS`,
    );
    await admin.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`,
    );
    await admin.query(
      `GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`,
    );

    accountA = `rls-a-${Date.now()}`;
    accountB = `rls-b-${Date.now()}`;
    for (const id of [accountA, accountB]) {
      await admin.query(
        'INSERT INTO "Account" (id, name, "createdAt") VALUES ($1, $2, now())',
        [id, `Compte ${id}`],
      );
      await admin.query(
        'INSERT INTO "Location" (id, "accountId", name, timezone, "employerContributionRate") VALUES ($1, $2, $3, $4, $5)',
        [`${id}-loc`, id, `Établissement ${id}`, 'Europe/Paris', 0],
      );
    }

    const url = new URL(adminUrl);
    url.username = APP_ROLE;
    url.password = APP_PASSWORD;
    app = new Client({ connectionString: url.toString() });
    await app.connect();
  }, 30_000);

  afterAll(async () => {
    await app?.end().catch(() => undefined);
    for (const id of [accountA, accountB]) {
      await admin
        ?.query('DELETE FROM "Account" WHERE id = $1', [id])
        .catch(() => undefined);
    }
    await admin?.query(`DROP OWNED BY ${APP_ROLE}`).catch(() => undefined);
    await admin?.query(`DROP ROLE IF EXISTS ${APP_ROLE}`).catch(() => undefined);
    await admin?.end().catch(() => undefined);
  }, 30_000);

  it('le rôle applicatif n’est pas superutilisateur', async () => {
    // Sinon tous les tests suivants passeraient sans rien prouver.
    const { rows } = await app.query(
      'SELECT usesuper FROM pg_user WHERE usename = current_user',
    );
    expect(rows[0]?.usesuper).toBe(false);
  });

  it('ne renvoie rien tant que le compte courant n’est pas posé', async () => {
    const { rows } = await app.query('SELECT count(*)::int AS n FROM "Location"');
    expect(rows[0]?.n).toBe(0);
  });

  it('ne renvoie que les lignes du compte courant', async () => {
    await app.query('BEGIN');
    await app.query("SELECT set_config('app.account_id', $1, true)", [accountA]);
    const { rows } = await app.query(
      'SELECT "accountId" FROM "Location" ORDER BY id',
    );
    await app.query('COMMIT');

    expect(rows).toHaveLength(1);
    expect(rows[0]?.accountId).toBe(accountA);
  });

  it('refuse d’écrire pour un autre compte', async () => {
    await app.query('BEGIN');
    await app.query("SELECT set_config('app.account_id', $1, true)", [accountA]);

    await expect(
      app.query(
        'INSERT INTO "Location" (id, "accountId", name, timezone, "employerContributionRate") VALUES ($1, $2, $3, $4, $5)',
        [`intrus-${Date.now()}`, accountB, 'Intrusion', 'Europe/Paris', 0],
      ),
    ).rejects.toThrow(/row-level security/i);

    await app.query('ROLLBACK');
  });

  it('remet le compte à zéro à la fin de la transaction', async () => {
    // `set_config(..., true)` est local. Sans cela, une connexion rendue au
    // pool garderait le compte du client précédent — la pire fuite possible.
    await app.query('BEGIN');
    await app.query("SELECT set_config('app.account_id', $1, true)", [accountA]);
    await app.query('COMMIT');

    const { rows } = await app.query('SELECT count(*)::int AS n FROM "Location"');
    expect(rows[0]?.n).toBe(0);
  });
});

describeIfDb('immutabilité du journal d’audit', () => {
  let client: Client;
  let accountId: string;
  let entryId: string;

  beforeAll(async () => {
    client = new Client({ connectionString: adminUrl });
    await client.connect();
    accountId = `audit-${Date.now()}`;
    entryId = `entry-${Date.now()}`;
    await client.query(
      'INSERT INTO "Account" (id, name, "createdAt") VALUES ($1, $2, now())',
      [accountId, 'Compte audit'],
    );
    await client.query(
      'INSERT INTO "AuditLog" (id, "accountId", action, "entityType", "entityId", "occurredAt") VALUES ($1, $2, $3, $4, $5, now())',
      [entryId, accountId, 'test.action', 'Test', 'x'],
    );
  }, 30_000);

  afterAll(async () => {
    await client
      ?.query('DELETE FROM "Account" WHERE id = $1', [accountId])
      .catch(() => undefined);
    await client?.end().catch(() => undefined);
  }, 30_000);

  it('refuse la modification d’une entrée', async () => {
    await expect(
      client.query('UPDATE "AuditLog" SET action = $1 WHERE id = $2', [
        'falsifie',
        entryId,
      ]),
    ).rejects.toThrow(/append-only/i);
  });

  it('refuse la suppression d’une entrée', async () => {
    // Même un superutilisateur est arrêté : le trigger ne dépend pas des
    // privilèges, contrairement à la RLS.
    await expect(
      client.query('DELETE FROM "AuditLog" WHERE id = $1', [entryId]),
    ).rejects.toThrow(/append-only/i);
  });
});

describeIfDb('couverture des politiques', () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: adminUrl });
    await client.connect();
  }, 30_000);

  afterAll(async () => {
    await client?.end().catch(() => undefined);
  }, 30_000);

  it('toute table portant accountId est protégée', async () => {
    // Le mode de défaillance de la RLS n'est pas d'écrire une mauvaise règle,
    // c'est d'oublier d'en écrire une : la table répond alors à tout le monde,
    // en silence. Ce test échoue quand une table est ajoutée sans politique.
    const { rows } = await client.query<{
      table_name: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
      policies: number;
    }>(`
      SELECT c.relname AS table_name,
             c.relrowsecurity,
             c.relforcerowsecurity,
             (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND EXISTS (
          SELECT 1 FROM information_schema.columns col
          WHERE col.table_schema = 'public'
            AND col.table_name = c.relname
            AND col.column_name = 'accountId'
        )
      ORDER BY c.relname
    `);

    expect(rows.length).toBeGreaterThan(0);

    const unprotected = rows.filter(
      (row) =>
        !row.relrowsecurity || !row.relforcerowsecurity || row.policies < 2,
    );

    expect(
      unprotected.map((row) => row.table_name),
      'tables sans RLS forcée ou sans politique de lecture et d’écriture',
    ).toEqual([]);
  });
});
