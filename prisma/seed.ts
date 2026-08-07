import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  SYSTEM_ROLES,
} from '../src/domain/access/permissions';

/**
 * Jeu de données de départ — PLAN.md §11.
 *
 * **Entièrement fictif.** Deux établissements, des équipes, et les rôles
 * fournis. Le mot de passe de démonstration n'a de sens qu'en développement ;
 * il est refusé si NODE_ENV vaut production.
 */

const DEMO_PASSWORD = 'planflow-demo-2026';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Le seed installe un compte de démonstration : refusé en production.',
    );
  }

  console.log('→ Capacités');
  for (const permission of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { category: permission.category, label: permission.label },
      create: permission,
    });
  }
  console.log(`  ${PERMISSION_DEFINITIONS.length} capacités`);

  console.log('→ Compte');
  const account = await prisma.account.upsert({
    where: { id: 'demo-account' },
    update: {},
    create: {
      id: 'demo-account',
      name: 'Maison Rivage',
      siren: '000000000',
      apeCode: '4759B',
      collectiveAgreementId: '1517',
    },
  });

  console.log('→ Rôles');
  const roleIds = new Map<string, string>();
  for (const role of SYSTEM_ROLES) {
    const created = await prisma.role.upsert({
      where: { accountId_key: { accountId: account.id, key: role.key } },
      update: { name: role.name },
      create: {
        accountId: account.id,
        key: role.key,
        name: role.name,
        isSystem: true,
      },
    });
    roleIds.set(role.key, created.id);

    const codes = DEFAULT_ROLE_PERMISSIONS[role.key];
    const permissions = await prisma.permission.findMany({
      where: { code: { in: codes } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: created.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
    console.log(`  ${role.name} — ${permissions.length} capacités`);
  }

  console.log('→ Établissements');
  const locations = [
    { id: 'loc-nantes', name: 'Nantes Atlantis' },
    { id: 'loc-rennes', name: 'Rennes Alma' },
  ];
  for (const location of locations) {
    await prisma.location.upsert({
      where: { id: location.id },
      update: { name: location.name },
      create: {
        id: location.id,
        accountId: account.id,
        name: location.name,
        employerContributionRate: 42,
      },
    });
    for (const [index, team] of ['Vente', 'Caisse', 'Réserve'].entries()) {
      await prisma.team.upsert({
        where: { id: `${location.id}-${index}` },
        update: {},
        create: {
          id: `${location.id}-${index}`,
          accountId: account.id,
          locationId: location.id,
          name: team,
          position: index,
        },
      });
    }
  }

  console.log('→ Comptes utilisateurs');
  const passwordHash = await hash(DEMO_PASSWORD, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const people = [
    { email: 'direction@example.test', firstName: 'Camille', lastName: 'Ferrand', role: 'owner', all: true },
    { email: 'manager.nantes@example.test', firstName: 'Jonas', lastName: 'Meyer', role: 'manager', all: false },
    { email: 'manager.rennes@example.test', firstName: 'Inès', lastName: 'Bakhti', role: 'manager', all: false },
    { email: 'salarie@example.test', firstName: 'Rémi', lastName: 'Chartier', role: 'employee', all: false },
  ];

  for (const [index, person] of people.entries()) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: {},
      create: {
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        passwordHash,
      },
    });

    const membership = await prisma.membership.upsert({
      where: {
        accountId_employeeNumber: {
          accountId: account.id,
          employeeNumber: `E${String(index + 1).padStart(4, '0')}`,
        },
      },
      update: { userId: user.id, status: 'ACTIVE' },
      create: {
        accountId: account.id,
        userId: user.id,
        roleId: roleIds.get(person.role) as string,
        employeeNumber: `E${String(index + 1).padStart(4, '0')}`,
        status: 'ACTIVE',
      },
    });

    await prisma.membershipScope.deleteMany({
      where: { membershipId: membership.id },
    });
    await prisma.membershipScope.create({
      data: {
        accountId: account.id,
        membershipId: membership.id,
        allLocations: person.all,
        locationId: person.all
          ? null
          : person.email.includes('rennes')
            ? 'loc-rennes'
            : 'loc-nantes',
      },
    });
    console.log(`  ${person.email} — ${person.role}`);
  }

  console.log('→ Durées de conservation');
  const retention = [
    ['Shift', 12, 'creation', 'Décompte des horaires : 1 an minimum (matrice n° 21).'],
    ['ForfaitDayEntry', 36, 'creation', 'Décompte des jours de forfait : 3 ans minimum.'],
    ['UserContract', 60, 'contract_end', 'Pièces contractuelles : 5 ans.'],
    ['PersonnelRegister', 60, 'employee_departure', 'Registre du personnel : 5 ans après le départ.'],
    ['PayrollVariable', 72, 'period_end', "Éléments d'assiette transmis à Silae : 6 ans."],
  ] as const;

  for (const [objectType, durationMonths, startPoint, justification] of retention) {
    await prisma.retentionPolicy.upsert({
      where: {
        accountId_objectType_effectiveFrom: {
          accountId: account.id,
          objectType,
          effectiveFrom: new Date('2026-01-01'),
        },
      },
      update: { durationMonths, startPoint, justification },
      create: {
        accountId: account.id,
        objectType,
        durationMonths,
        startPoint,
        justification,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
  }
  console.log(`  ${retention.length} politiques`);

  console.log(`\nMot de passe de démonstration : ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
