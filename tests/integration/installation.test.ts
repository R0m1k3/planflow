import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { adminPrisma } from './admin-db';

import { DEFAULT_TIMEZONE, type InstallationForm } from '@/domain/install/rules';
import { PERMISSION_CODES } from '@/domain/access/permissions';
import { installAccount, INSTALLATION_ID } from '@/server/install/install';
import { unscoped } from '@/server/tenant';

/**
 * Première installation, branchée sur la base — PLAN.md §5.
 *
 * Ce que les tests de règles ne peuvent pas montrer : que l'installation passe
 * **par la connexion de l'application**, soumise à la row-level security. C'est
 * le point délicat. Les politiques d'insertion exigent
 * `accountId = planflow_current_account()`, et le compte n'existe pas encore
 * quand la transaction s'ouvre. Si le réglage du compte courant venait à
 * manquer, chaque écriture serait refusée et l'instance resterait vide.
 *
 * Tout se joue dans une transaction **annulée** : le marqueur d'installation,
 * lui, ne se supprime pas — c'est sa raison d'être — donc un test qui le
 * poserait pour de bon condamnerait la base de développement.
 */

const enabled = (process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL ?? '')
  .length > 0;
const describeIfDb = enabled ? describe : describe.skip;

/** Sentinelle d'annulation : sortir par une erreur est ce qui défait tout. */
class Rollback extends Error {}

function form(overrides: Partial<InstallationForm> = {}): InstallationForm {
  const unique = Date.now();
  return {
    companyName: `Entreprise ${unique}`,
    locationName: 'Siège',
    timezone: DEFAULT_TIMEZONE,
    firstName: 'Camille',
    lastName: 'Ferrand',
    email: `Install.${unique}@Exemple.Test`,
    password: 'quatre chevaux blancs',
    passwordConfirmation: 'quatre chevaux blancs',
    ...overrides,
  };
}

/**
 * Joue l'installation puis annule. `fn` reçoit la transaction : c'est le seul
 * moment où le travail est visible.
 */
async function installThenRollback(
  input: InstallationForm,
  fn: (
    tx: Prisma.TransactionClient,
    instance: Awaited<ReturnType<typeof installAccount>>,
  ) => Promise<void>,
): Promise<void> {
  await expect(
    unscoped().$transaction(
      async (tx) => {
        const instance = await installAccount(tx, input, 'empreinte-factice');
        await fn(tx, instance);
        throw new Rollback();
      },
      { timeout: 30_000 },
    ),
  ).rejects.toBeInstanceOf(Rollback);
}

describeIfDb('première installation', () => {
  it('pose un compte utilisable depuis la connexion de l’application', async () => {
    const input = form();

    await installThenRollback(input, async (tx, instance) => {
      const account = await tx.account.findUniqueOrThrow({
        where: { id: instance.accountId },
      });
      expect(account.name).toBe(input.companyName);

      // Cinq rôles fournis, et le propriétaire détient tout : c'est lui qui
      // délègue ensuite. Un propriétaire amputé d'une capacité ne pourrait
      // jamais l'accorder à personne.
      const roles = await tx.role.findMany({
        where: { accountId: instance.accountId },
      });
      expect(roles).toHaveLength(5);
      expect(roles.every((role) => role.isSystem)).toBe(true);

      const owner = roles.find((role) => role.key === 'owner');
      if (!owner) throw new Error('Rôle propriétaire absent.');
      const ownerPermissions = await tx.rolePermission.count({
        where: { roleId: owner.id },
      });
      expect(ownerPermissions).toBe(PERMISSION_CODES.length);

      // L'employé, lui, ne doit surtout pas tout recevoir.
      const employee = roles.find((role) => role.key === 'employee');
      if (!employee) throw new Error('Rôle employé absent.');
      const employeePermissions = await tx.rolePermission.count({
        where: { roleId: employee.id },
      });
      expect(employeePermissions).toBeGreaterThan(0);
      expect(employeePermissions).toBeLessThan(PERMISSION_CODES.length);
    });
  });

  it('crée l’établissement avec le fuseau demandé', async () => {
    // Le fuseau décide des durées travaillées, changement d'heure compris : le
    // perdre en route fausserait les compteurs sans rien signaler.
    await installThenRollback(
      form({ timezone: 'America/Martinique' }),
      async (tx, instance) => {
        const location = await tx.location.findFirstOrThrow({
          where: { accountId: instance.accountId },
        });
        expect(location.timezone).toBe('America/Martinique');
        expect(location.name).toBe('Siège');
      },
    );
  });

  it('rattache le propriétaire à tous les établissements', async () => {
    await installThenRollback(form(), async (tx, instance) => {
      const membership = await tx.membership.findUniqueOrThrow({
        where: { id: instance.membershipId },
        include: { scopes: true, role: true, profile: true },
      });

      expect(membership.status).toBe('ACTIVE');
      expect(membership.role.key).toBe('owner');
      expect(membership.employeeNumber).toBe('E0001');
      expect(membership.profile?.lastName).toBe('Ferrand');

      // `allLocations` plutôt qu'un rattachement nommé : sans cela, la personne
      // qui installe l'instance perdrait la vue le jour du deuxième
      // établissement.
      expect(membership.scopes).toHaveLength(1);
      expect(membership.scopes[0]?.allLocations).toBe(true);
    });
  });

  it('replie la casse de l’adresse de connexion', async () => {
    const input = form();

    await installThenRollback(input, async (tx, instance) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: instance.userId },
      });
      expect(user.email).toBe(input.email.toLowerCase());
      expect(user.passwordHash).toBe('empreinte-factice');
    });
  });

  it('date l’installation dans le journal', async () => {
    await installThenRollback(form(), async (tx, instance) => {
      const entry = await tx.auditLog.findFirstOrThrow({
        where: { accountId: instance.accountId, action: 'install.complete' },
      });
      expect(entry.entityId).toBe(instance.accountId);
      expect(entry.actorMembershipId).toBe(instance.membershipId);
    });
  });
});

describeIfDb('marqueur d’installation', () => {
  it('rapporte une instance semée comme installée', async () => {
    // C'est la première ligne de `installAction` : sans ce constat, l'action
    // rouvrirait la création d'un propriétaire sur une instance en service.
    const { isInstalled, forgetInstallationState } = await import(
      '@/server/install/state'
    );
    forgetInstallationState();
    await expect(isInstalled()).resolves.toBe(true);
  });

  it('n’admet pas une seconde ligne', async () => {
    // Le garde-fou est en base, pas seulement dans l'action : deux requêtes
    // simultanées sur une instance vierge franchissent toutes deux le contrôle
    // applicatif, et c'est la clé primaire qui départage.
    const existing = await adminPrisma().installation.findFirst();
    expect(existing, 'la base de test doit être semée').not.toBeNull();

    await expect(
      unscoped().$transaction(async (tx) => {
        // Même précaution que l'installation elle-même : la politique de
        // lecture d'`Account` n'ouvre que le compte courant, et `create`
        // relit la ligne qu'il écrit.
        const accountId = randomUUID();
        await tx.$executeRaw`SELECT set_config('app.account_id', ${accountId}, true)`;
        await tx.account.create({
          data: { id: accountId, name: `Doublon ${Date.now()}` },
        });
        await tx.installation.create({
          data: { id: INSTALLATION_ID, accountId },
        });
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('refuse toute modification et toute suppression', async () => {
    // Une instance installée ne redevient pas vierge sur une requête de
    // l'application : sans cela, effacer une ligne rouvrirait la création d'un
    // propriétaire à n'importe quel visiteur.
    const db = adminPrisma();

    await expect(
      db.installation.update({
        where: { id: INSTALLATION_ID },
        data: { installedAt: new Date() },
      }),
    ).rejects.toThrow(/append-only/);

    await expect(
      db.installation.delete({ where: { id: INSTALLATION_ID } }),
    ).rejects.toThrow(/append-only/);
  });
});
