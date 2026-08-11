import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  SYSTEM_ROLES,
} from '@/domain/access/permissions';
import {
  FIRST_EMPLOYEE_NUMBER,
  normaliseInstallation,
  type InstallationForm,
} from '@/domain/install/rules';
import { hashPassword } from '@/server/auth/session';
import { installReferentials } from '@/server/install/referentials';

/**
 * Contenu d'une instance neuve — PLAN.md §5.
 *
 * Le seed, lui, installe une démonstration : des salariés fictifs, des
 * plannings, des absences. Il refuse de tourner en production, et c'est bien
 * ainsi. Il restait donc un trou : après les migrations, une instance de
 * production a le schéma et rien d'autre — pas de compte, pas d'utilisateur,
 * personne pour se connecter.
 *
 * Ce module comble ce trou : catalogue des capacités, rôles fournis, compte,
 * établissement, propriétaire, puis les **référentiels** sans lesquels rien ne
 * s'accroche (voir `referentials.ts`). Aucune donnée d'exemple : pas un
 * salarié, pas un créneau, pas une absence.
 */

export interface InstalledInstance {
  accountId: string;
  membershipId: string;
  userId: string;
}

/**
 * Pose le contenu minimal d'un compte dans une transaction déjà ouverte.
 *
 * Séparé de l'action pour deux raisons. La transaction appartient à l'appelant,
 * qui seul peut y écrire le marqueur d'installation dans le même souffle — un
 * compte à demi installé, sans marqueur, laisserait l'écran ouvert sur une base
 * déjà peuplée. Et cette forme se laisse éprouver contre une vraie base dans
 * une transaction que le test annule, ce qu'une fonction qui scelle
 * l'installation ne permettrait pas : le marqueur, lui, ne se supprime pas.
 */
export async function installAccount(
  tx: Prisma.TransactionClient,
  form: InstallationForm,
  passwordHash: string,
): Promise<InstalledInstance> {
  const data = normaliseInstallation(form);

  // L'identifiant est tiré ici, et non laissé à la base, parce qu'il faut
  // l'annoncer **avant** de créer le compte.
  //
  // La politique d'insertion d'`Account` accepte tout — il faut bien pouvoir
  // créer le premier. Mais sa politique de lecture, elle, n'ouvre que le compte
  // courant, et un `INSERT ... RETURNING` relit la ligne qu'il vient d'écrire :
  // sans compte courant, l'insertion réussit et la relecture est refusée.
  // Poser le compte d'abord est la même règle que partout ailleurs — une
  // transaction porte son compte — appliquée à celle qui le crée.
  const accountId = randomUUID();
  await tx.$executeRaw`SELECT set_config('app.account_id', ${accountId}, true)`;

  const account = await tx.account.create({
    data: { id: accountId, name: data.companyName },
  });

  // Référentiel global, sans compte : les capacités sont définies par le
  // produit. L'upsert vaut pour une instance dont le catalogue a déjà été posé
  // par un seed ou une migration de données.
  for (const permission of PERMISSION_DEFINITIONS) {
    await tx.permission.upsert({
      where: { code: permission.code },
      update: { category: permission.category, label: permission.label },
      create: permission,
    });
  }

  const permissionIds = new Map(
    (await tx.permission.findMany({ select: { id: true, code: true } })).map(
      (permission) => [permission.code, permission.id],
    ),
  );

  const roleIds = new Map<string, string>();
  for (const role of SYSTEM_ROLES) {
    const created = await tx.role.create({
      data: {
        accountId: account.id,
        key: role.key,
        name: role.name,
        isSystem: true,
      },
    });
    roleIds.set(role.key, created.id);

    await tx.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS[role.key]
        .map((code) => permissionIds.get(code))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: created.id, permissionId })),
      skipDuplicates: true,
    });
  }

  const location = await tx.location.create({
    data: {
      accountId: account.id,
      name: data.locationName,
      timezone: data.timezone,
    },
  });

  // Étiquettes, types d'absence, convention d'amorce, conservation et jours
  // fériés. Ce ne sont pas des exemples : sans eux, l'instance a le schéma et
  // rien à quoi l'accrocher — pas de demande d'absence saisissable, pas de
  // créneau nommé, et un moteur de règles muet.
  await installReferentials(tx, account.id, location.id);

  const user = await tx.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash,
    },
  });

  const membership = await tx.membership.create({
    data: {
      accountId: account.id,
      userId: user.id,
      roleId: roleIds.get('owner') as string,
      employeeNumber: FIRST_EMPLOYEE_NUMBER,
      status: 'ACTIVE',
    },
  });

  // Le registre du personnel exige le nom, et il le lit sur le dossier et non
  // sur le compte : la plupart des salariés n'ont pas de compte.
  await tx.employeeProfile.create({
    data: {
      membershipId: membership.id,
      accountId: account.id,
      firstName: data.firstName,
      lastName: data.lastName,
    },
  });

  // Tous les établissements, y compris ceux qui n'existent pas encore : la
  // personne qui installe l'instance ne doit pas perdre la vue sur le deuxième
  // établissement le jour de son ouverture.
  await tx.membershipScope.create({
    data: {
      accountId: account.id,
      membershipId: membership.id,
      allLocations: true,
    },
  });

  // Première entrée du journal, et elle compte : elle date la création du
  // compte propriétaire, seul accès à l'instance jusqu'à la première
  // invitation. Le journal est append-only.
  await tx.auditLog.create({
    data: {
      accountId: account.id,
      actorMembershipId: membership.id,
      action: 'install.complete',
      entityType: 'Account',
      entityId: account.id,
      after: {
        companyName: data.companyName,
        locationName: data.locationName,
        timezone: data.timezone,
        ownerEmail: data.email,
      },
    },
  });

  return {
    accountId: account.id,
    membershipId: membership.id,
    userId: user.id,
  };
}

/** Empreinte du mot de passe du propriétaire. */
export function hashOwnerPassword(password: string): Promise<string> {
  // Hors transaction, à dessein : argon2 est délibérément lent, et le faire
  // tourner une connexion ouverte immobiliserait celle-ci pour rien.
  return hashPassword(password);
}

/** Identifiant unique de la ligne d'installation, contraint en base. */
export const INSTALLATION_ID = 'singleton';
