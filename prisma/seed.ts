import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  SYSTEM_ROLES,
} from '../src/domain/access/permissions';
import {
  isoWeekOf,
  previousIsoWeek,
  weekDates,
  zonedInstant,
} from '../src/domain/planning/week';
import { POSTE_CODES, POSTE_LABELS } from '../src/lib/design/postes';
import {
  IDCC_1517_PARAMETERS,
  IDCC_1517_PROVENANCE,
} from '../src/domain/compliance/idcc1517';
import { frenchHolidays } from '../src/domain/absences/holidays';
import { PAYROLL_ELEMENT_DEFINITIONS } from '../src/domain/payroll/elements';
import { evaluateSchedule } from '../src/server/compliance/evaluate';
import { withTenant } from '../src/server/tenant';

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
      // Remet le compteur d'échecs à zéro : sans cela, des exécutions
      // répétées des tests finissent par verrouiller le compte au bout de
      // huit tentatives, et l'échec suivant est incompréhensible.
      update: { failedAttempts: 0, lockedUntil: null, passwordHash },
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

  console.log('→ Contrats et dossiers');
  const contractSpecs = [
    { number: 'E0001', type: 'CDI', hours: 39, forfait: false, location: 'loc-nantes' },
    { number: 'E0002', type: 'CDI', hours: 0, forfait: true, location: 'loc-nantes' },
    { number: 'E0003', type: 'CDI', hours: 35, forfait: false, location: 'loc-rennes' },
    { number: 'E0004', type: 'CDD', hours: 24, forfait: false, location: 'loc-nantes' },
  ] as const;

  for (const spec of contractSpecs) {
    const membership = await prisma.membership.findUnique({
      where: {
        accountId_employeeNumber: {
          accountId: account.id,
          employeeNumber: spec.number,
        },
      },
    });
    if (!membership) continue;

    const holder = membership.userId
      ? await prisma.user.findUnique({ where: { id: membership.userId } })
      : null;

    await prisma.employeeProfile.upsert({
      where: { membershipId: membership.id },
      update: {},
      create: {
        membershipId: membership.id,
        accountId: account.id,
        firstName: holder?.firstName ?? 'Prénom',
        lastName: holder?.lastName ?? 'À compléter',
        city: 'Nantes',
        phone: '00 00 00 00 00',
      },
    });

    const existing = await prisma.userContract.findFirst({
      where: { membershipId: membership.id },
    });
    if (existing) continue;

    await prisma.userContract.create({
      data: {
        accountId: account.id,
        membershipId: membership.id,
        locationId: spec.location,
        contractType: spec.type,
        startDate: new Date('2024-01-08'),
        workTimeArrangement: spec.forfait ? 'FORFAIT_JOURS' : 'HOURLY',
        weeklyHours: spec.forfait ? 0 : spec.hours,
        forfaitDaysPerYear: spec.forfait ? 218 : null,
        forfaitAgreementRef: spec.forfait ? 'CONV-2024-002' : null,
        forfaitAgreedAt: spec.forfait ? new Date('2024-01-05') : null,
        monthlySalary: 2100,
      },
    });
  }
  console.log(`  ${contractSpecs.length} contrats`);


  console.log('→ Étiquettes de planning');
  for (const [index, code] of POSTE_CODES.entries()) {
    await prisma.label.upsert({
      where: { accountId_code: { accountId: account.id, code: code.toUpperCase() } },
      update: { name: POSTE_LABELS[code], paletteKey: code, position: index },
      create: {
        accountId: account.id,
        code: code.toUpperCase(),
        name: POSTE_LABELS[code],
        paletteKey: code,
        position: index,
      },
    });
  }
  console.log(`  ${POSTE_CODES.length} étiquettes`);

  console.log('→ Intitulés de poste');
  const jobTitles = [
    'Responsable de magasin',
    'Adjoint·e de direction',
    'Vendeur·se conseil',
    'Hôte·sse de caisse',
    'Employé·e de réserve',
  ];
  const jobTitleIds = new Map<string, string>();
  for (const name of jobTitles) {
    const created = await prisma.jobTitle.upsert({
      where: { accountId_name: { accountId: account.id, name } },
      update: {},
      create: { accountId: account.id, name },
    });
    jobTitleIds.set(name, created.id);
  }

  console.log('→ Salariés sans compte applicatif');
  // La majorité d'une équipe de vente ne se connecte jamais à l'outil : ces
  // salariés existent en planning et en paie, sans identifiants.
  const staff = [
    { number: 'E0005', first: 'Sofia', last: 'Marchetti', job: 'Vendeur·se conseil', hours: 35, team: 0, location: 'loc-nantes' },
    { number: 'E0006', first: 'Yanis', last: 'Trabelsi', job: 'Vendeur·se conseil', hours: 30, team: 0, location: 'loc-nantes' },
    { number: 'E0007', first: 'Léa', last: 'Nguyen', job: 'Hôte·sse de caisse', hours: 24, team: 1, location: 'loc-nantes' },
    { number: 'E0008', first: 'Marius', last: 'Kowalski', job: 'Hôte·sse de caisse', hours: 35, team: 1, location: 'loc-nantes' },
    { number: 'E0009', first: 'Awa', last: 'Diallo', job: 'Employé·e de réserve', hours: 35, team: 2, location: 'loc-nantes' },
    { number: 'E0010', first: 'Théo', last: 'Berger', job: 'Vendeur·se conseil', hours: 28, team: 0, location: 'loc-rennes' },
    { number: 'E0011', first: 'Clara', last: 'Fontaine', job: 'Hôte·sse de caisse', hours: 35, team: 1, location: 'loc-rennes' },
    { number: 'E0012', first: 'Noé', last: 'Perrin', job: 'Employé·e de réserve', hours: 20, team: 2, location: 'loc-rennes' },
  ] as const;

  for (const person of staff) {
    const membership = await prisma.membership.upsert({
      where: {
        accountId_employeeNumber: {
          accountId: account.id,
          employeeNumber: person.number,
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        accountId: account.id,
        roleId: roleIds.get('employee') as string,
        employeeNumber: person.number,
        status: 'ACTIVE',
      },
    });

    await prisma.employeeProfile.upsert({
      where: { membershipId: membership.id },
      update: { firstName: person.first, lastName: person.last },
      create: {
        membershipId: membership.id,
        accountId: account.id,
        firstName: person.first,
        lastName: person.last,
        city: person.location === 'loc-rennes' ? 'Rennes' : 'Nantes',
      },
    });

    const existing = await prisma.userContract.findFirst({
      where: { membershipId: membership.id },
    });
    if (!existing) {
      await prisma.userContract.create({
        data: {
          accountId: account.id,
          membershipId: membership.id,
          locationId: person.location,
          contractType: 'CDI',
          startDate: new Date('2024-09-02'),
          workTimeArrangement: 'HOURLY',
          weeklyHours: person.hours,
          jobTitleId: jobTitleIds.get(person.job) ?? null,
          monthlySalary: 1900,
        },
      });
    }

    await prisma.teamMember.upsert({
      where: {
        teamId_membershipId: {
          teamId: `${person.location}-${person.team}`,
          membershipId: membership.id,
        },
      },
      update: {},
      create: {
        accountId: account.id,
        teamId: `${person.location}-${person.team}`,
        membershipId: membership.id,
      },
    });
  }
  console.log(`  ${staff.length} salariés`);

  console.log('→ Rattachements des titulaires de comptes');
  // Les quatre comptes applicatifs planifient aussi : sans rattachement, ils
  // n'apparaîtraient pas dans la grille.
  const accountHolders = [
    { number: 'E0001', team: 'loc-nantes-0', job: 'Responsable de magasin' },
    { number: 'E0002', team: 'loc-nantes-0', job: 'Adjoint·e de direction' },
    { number: 'E0003', team: 'loc-rennes-0', job: 'Responsable de magasin' },
    { number: 'E0004', team: 'loc-nantes-1', job: 'Hôte·sse de caisse' },
  ] as const;

  for (const holder of accountHolders) {
    const membership = await prisma.membership.findUnique({
      where: {
        accountId_employeeNumber: {
          accountId: account.id,
          employeeNumber: holder.number,
        },
      },
    });
    if (!membership) continue;

    await prisma.userContract.updateMany({
      where: { membershipId: membership.id },
      data: { jobTitleId: jobTitleIds.get(holder.job) ?? null },
    });

    await prisma.teamMember.upsert({
      where: {
        teamId_membershipId: {
          teamId: holder.team,
          membershipId: membership.id,
        },
      },
      update: {},
      create: {
        accountId: account.id,
        teamId: holder.team,
        membershipId: membership.id,
      },
    });
  }

  console.log('→ Plannings');
  await seedPlanning(account.id);


  console.log('→ Convention collective');
  // Effectif-datée : la version ne se met pas à jour, elle se remplace par une
  // suivante datée. Un trigger PostgreSQL refuse de modifier son contenu.
  const agreement = await prisma.collectiveAgreement.findFirst({
    where: { accountId: account.id, idcc: '1517', version: 1 },
  });
  if (!agreement) {
    await prisma.collectiveAgreement.create({
      data: {
        accountId: account.id,
        idcc: '1517',
        name: 'Commerces de détail non alimentaires',
        parameters: IDCC_1517_PARAMETERS,
        version: 1,
        effectiveFrom: new Date('2026-01-01'),
        source:
          'Sources secondaires publiques — À VALIDER contre le texte consolidé Legifrance',
      },
    });
  }
  console.log('  IDCC 1517 version 1');

  console.log('→ Registre de paramétrage juridique');
  // L'origine de chaque valeur — ordre public, convention, accord d'entreprise
  // — décide de ce qui se négocie et de ce qui s'impose. Elle est enregistrée
  // avec sa source, pas seulement commentée dans le code.
  for (const entry of IDCC_1517_PROVENANCE) {
    await prisma.legalConfigEntry.upsert({
      where: {
        accountId_domain_key_effectiveFrom: {
          accountId: account.id,
          domain: 'temps',
          key: entry.key,
          effectiveFrom: new Date('2026-01-01'),
        },
      },
      update: { value: entry.value, source: entry.source },
      create: {
        accountId: account.id,
        domain: 'temps',
        key: entry.key,
        value: `${entry.label} : ${entry.value}`,
        source: `[${entry.origin}] ${entry.source}`,
        population: 'Tous salariés',
        effectiveFrom: new Date('2026-01-01'),
      },
    });
  }
  console.log(`  ${IDCC_1517_PROVENANCE.length} paramètres tracés`);

  console.log('→ Jours fériés et dimanches autorisés');
  // Calculés, pas listés : une table écrite à la main est juste l'année où on
  // l'écrit. Un férié manquant se décompte comme un jour de congé, et le
  // salarié perd un jour sans que personne ne le voie.
  const currentYear = new Date().getUTCFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  let holidayCount = 0;

  for (const location of locations) {
    for (const year of years) {
      for (const holiday of frenchHolidays(year)) {
        await prisma.holiday.upsert({
          where: {
            locationId_localDate: {
              locationId: location.id,
              localDate: new Date(`${holiday.isoDate}T00:00:00Z`),
            },
          },
          update: { name: holiday.name },
          create: {
            accountId: account.id,
            locationId: location.id,
            localDate: new Date(`${holiday.isoDate}T00:00:00Z`),
            name: holiday.name,
            // Seul le 1er mai est chômé de droit. Les trois jours garantis par
            // la convention sont choisis par l'employeur : ils ne se devinent
            // pas ici.
            isPaidOff: holiday.isoDate.slice(5) === '05-01',
          },
        });
        holidayCount += 1;
      }
    }

    // Douze dimanches du maire au plus, liste arrêtée avant le 31 décembre
    // pour l'année suivante (L3132-26). Valeurs de démonstration.
    const sundays = [
      `${currentYear}-01-11`,
      `${currentYear}-06-28`,
      `${currentYear}-07-05`,
      `${currentYear}-08-30`,
      `${currentYear}-09-06`,
      `${currentYear}-11-29`,
      `${currentYear}-12-06`,
      `${currentYear}-12-13`,
      `${currentYear}-12-20`,
    ];
    for (const date of sundays) {
      await prisma.authorisedSunday.upsert({
        where: {
          locationId_localDate: {
            locationId: location.id,
            localDate: new Date(`${date}T00:00:00Z`),
          },
        },
        update: {},
        create: {
          accountId: account.id,
          locationId: location.id,
          localDate: new Date(`${date}T00:00:00Z`),
          reference: 'Arrêté municipal de démonstration',
        },
      });
    }
  }
  console.log(`  ${holidayCount} jours fériés sur ${years.length} années`);

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



  console.log('→ Types d’absence');
  // `silaeCode` reste **null** : les codes AB-* du dossier sont connus, leur
  // signification ne l'est pas. Les associer ici reviendrait à deviner à quel
  // type d'absence correspond AB-300, ce qui produirait une paie fausse.
  const absenceTypes = [
    { code: 'CP', name: 'Congés payés', colorKey: 'cp', isPaid: true, social: false, notice: 30 },
    { code: 'RTT', name: 'RTT', colorKey: 'rtt', isPaid: true, social: false, notice: 7 },
    { code: 'MAL', name: 'Arrêt maladie', colorKey: 'maladie', isPaid: false, social: true, notice: null },
    { code: 'SS', name: 'Congé sans solde', colorKey: 'sans-solde', isPaid: false, social: false, notice: 15 },
    { code: 'RC', name: 'Repos compensateur', colorKey: 'rtt', isPaid: true, social: false, notice: 7 },
  ] as const;

  for (const type of absenceTypes) {
    await prisma.absenceType.upsert({
      where: { accountId_code: { accountId: account.id, code: type.code } },
      update: { name: type.name, colorKey: type.colorKey },
      create: {
        accountId: account.id,
        code: type.code,
        name: type.name,
        colorKey: type.colorKey,
        isPaid: type.isPaid,
        countsAsWorkTime: false,
        affectsPaidLeaveAccrual: !type.social,
        isSocialSecurity: type.social,
        requiresJustification: type.social,
        minNoticeDays: type.notice,
      },
    });
  }
  console.log(`  ${absenceTypes.length} types`);

  console.log('→ Absences de démonstration');
  const cpType = await prisma.absenceType.findFirst({
    where: { accountId: account.id, code: 'CP' },
  });
  const malType = await prisma.absenceType.findFirst({
    where: { accountId: account.id, code: 'MAL' },
  });
  const demoMembers = await prisma.membership.findMany({
    where: { accountId: account.id, employeeNumber: { in: ['E0005', 'E0007'] } },
  });

  const today = new Date();
  const iso = (offsetDays: number) =>
    new Date(today.getTime() + offsetDays * 86_400_000)
      .toISOString()
      .slice(0, 10);

  const demoAbsences = [
    // Acceptée, en cours : elle doit apparaître sur la grille de planning.
    { member: 'E0005', type: cpType?.id, from: iso(1), to: iso(5), status: 'ACCEPTED' as const, days: 5 },
    // En attente : elle doit apparaître dans la file à traiter.
    { member: 'E0007', type: malType?.id, from: iso(-2), to: iso(2), status: 'PENDING' as const, days: 4 },
  ];

  for (const absence of demoAbsences) {
    const membership = demoMembers.find(
      (member) => member.employeeNumber === absence.member,
    );
    if (!membership || !absence.type) continue;

    const existing = await prisma.timeOff.findFirst({
      where: { membershipId: membership.id },
    });
    if (existing) continue;

    const created = await prisma.timeOff.create({
      data: {
        accountId: account.id,
        membershipId: membership.id,
        absenceTypeId: absence.type,
        startDate: new Date(`${absence.from}T00:00:00Z`),
        endDate: new Date(`${absence.to}T00:00:00Z`),
        countedDays: absence.days,
        status: absence.status,
        requestedBy: membership.id,
        ...(absence.status === 'ACCEPTED'
          ? { decidedBy: membership.id, decidedAt: new Date() }
          : {}),
      },
    });

    if (absence.status !== 'ACCEPTED') continue;

    // L'acceptation écrit au registre : le solde bouge parce qu'une écriture a
    // été posée, jamais parce qu'un champ a été décrémenté.
    const year = today.getUTCMonth() >= 5 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
    const counter = await prisma.counter.create({
      data: {
        accountId: account.id,
        membershipId: membership.id,
        counterType: 'PAID_LEAVE',
        acquisitionPeriodStart: new Date(`${year}-06-01T00:00:00Z`),
        acquisitionPeriodEnd: new Date(`${year + 1}-05-31T00:00:00Z`),
      },
    });
    await prisma.ledgerOperation.createMany({
      data: [
        {
          accountId: account.id,
          counterId: counter.id,
          kind: 'ACCRUAL',
          quantity: 25,
          unit: 'DAY',
          effectiveDate: new Date(`${year}-06-01T00:00:00Z`),
          sourceType: 'SYSTEM',
        },
        {
          accountId: account.id,
          counterId: counter.id,
          kind: 'TAKEN',
          quantity: -absence.days,
          unit: 'DAY',
          effectiveDate: new Date(`${absence.from}T00:00:00Z`),
          sourceType: 'TIMEOFF',
          sourceId: created.id,
        },
      ],
    });
  }
  console.log(`  ${demoAbsences.length} absences`);

  console.log('→ Correspondances Silae');
  // Semées **non confirmées**, y compris quand le code se lit dans son libellé
  // (`EV-HDimanche`). Proposer n'est pas confirmer : seul le gestionnaire de
  // paie sait si le code est le bon dans ce dossier, et l'export refuse de
  // tourner tant qu'il ne l'a pas dit.
  for (const definition of PAYROLL_ELEMENT_DEFINITIONS) {
    if (!definition.suggestedCode) continue;
    const existing = await prisma.silaeCodeMapping.findFirst({
      where: { accountId: account.id, sourceKey: definition.key },
    });
    if (existing) continue;

    await prisma.silaeCodeMapping.create({
      data: {
        accountId: account.id,
        sourceKey: definition.key,
        silaeCode: definition.suggestedCode,
        label: definition.label,
        kind: definition.kind,
        confirmed: false,
      },
    });
  }
  console.log(
    `  ${PAYROLL_ELEMENT_DEFINITIONS.filter((d) => d.suggestedCode).length} proposées, aucune confirmée`,
  );

  console.log('→ Matricules Silae');
  // Fictifs, à la forme observée dans le dossier : cinq chiffres cadrés à zéro.
  const withoutMatricule = await prisma.membership.findMany({
    where: { accountId: account.id, silaeMatricule: null },
    orderBy: { employeeNumber: 'asc' },
  });
  for (const [index, membership] of withoutMatricule.entries()) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { silaeMatricule: String(90_000 + index + 1).padStart(5, '0') },
    });
  }
  console.log(`  ${withoutMatricule.length} matricules attribués`);

  console.log('→ Évaluation de conformité');
  // Le seed produit des plannings, donc des constats : les laisser à calculer
  // au premier affichage donnerait une grille faussement conforme.
  const schedules = await prisma.weeklySchedule.findMany({
    where: { accountId: account.id },
    select: { id: true },
  });
  let violations = 0;
  await withTenant(account.id, async (db) => {
    for (const schedule of schedules) {
      violations += (await evaluateSchedule(db, schedule.id)).length;
    }
  });
  console.log(`  ${violations} constats sur ${schedules.length} semaines`);

  console.log(`\nMot de passe de démonstration : ${DEMO_PASSWORD}`);
}

/**
 * Deux semaines de planning : la précédente publiée, la courante en brouillon.
 *
 * Semer les deux états est délibéré — c'est la seule façon de voir en un coup
 * d'œil que la publication est bien **par équipe** et que les créneaux d'une
 * semaine publiée se distinguent d'un brouillon.
 */
async function seedPlanning(accountId: string): Promise<void> {
  const current = isoWeekOf(new Date());
  const previous = previousIsoWeek(current);

  const teams = await prisma.team.findMany({
    where: { accountId },
    orderBy: [{ locationId: 'asc' }, { position: 'asc' }],
  });
  const locations = await prisma.location.findMany({ where: { accountId } });
  const timezoneOf = new Map(locations.map((l) => [l.id, l.timezone]));

  const labels = await prisma.label.findMany({ where: { accountId } });
  const labelOf = new Map(labels.map((label) => [label.paletteKey, label.id]));

  /** Poste dominant de l'équipe, par position. */
  const teamPoste = ['vte', 'cai', 'res'];

  /** Trois plages types du commerce de détail. */
  const patterns = [
    { start: '09:00', end: '17:00', pause: 60 },
    { start: '11:00', end: '19:00', pause: 60 },
    { start: '13:00', end: '20:00', pause: 30 },
  ];

  let shiftsCreated = 0;

  for (const week of [previous, current]) {
    const dates = weekDates(week);

    for (const team of teams) {
      const timezone = timezoneOf.get(team.locationId) ?? 'Europe/Paris';
      const members = await prisma.teamMember.findMany({
        where: { teamId: team.id },
        orderBy: { position: 'asc' },
      });
      if (members.length === 0) continue;

      const schedule = await prisma.weeklySchedule.upsert({
        where: {
          teamId_isoYear_isoWeek: {
            teamId: team.id,
            isoYear: week.isoYear,
            isoWeek: week.isoWeek,
          },
        },
        update: {},
        create: {
          accountId,
          teamId: team.id,
          locationId: team.locationId,
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
          status: week === previous ? 'PUBLISHED' : 'DRAFT',
          publishedAt: week === previous ? new Date() : null,
        },
      });

      const already = await prisma.shift.count({
        where: { weeklyScheduleId: schedule.id },
      });
      if (already > 0) continue;

      const poste = teamPoste[team.position] ?? 'vte';
      const labelId = labelOf.get(poste) ?? null;

      for (const [index, member] of members.entries()) {
        const pattern = patterns[index % patterns.length] as (typeof patterns)[number];
        // Deux jours de repos glissants : la semaine de six jours consécutifs
        // est justement ce que les règles de convention interdisent.
        const rest = new Set([(index * 2) % 7, ((index * 2) + 1) % 7]);

        for (const [dayIndex, date] of dates.entries()) {
          if (rest.has(dayIndex)) continue;
          await prisma.shift.create({
            data: {
              accountId,
              weeklyScheduleId: schedule.id,
              membershipId: member.membershipId,
              localDate: new Date(`${date}T00:00:00Z`),
              startAt: zonedInstant(date, pattern.start, timezone),
              endAt: zonedInstant(date, pattern.end, timezone),
              breakMinutes: pattern.pause,
              labelId,
              isValidated: week === previous,
            },
          });
          shiftsCreated += 1;
        }
      }

      // Un besoin non couvert par équipe sur la semaine courante : c'est l'état
      // normal d'un planning en construction, et la ligne dédiée doit s'afficher.
      if (week === current) {
        const saturday = dates[5] as string;
        await prisma.shift.create({
          data: {
            accountId,
            weeklyScheduleId: schedule.id,
            membershipId: null,
            localDate: new Date(`${saturday}T00:00:00Z`),
            startAt: zonedInstant(saturday, '10:00', timezone),
            endAt: zonedInstant(saturday, '18:00', timezone),
            breakMinutes: 60,
            labelId,
          },
        });
        shiftsCreated += 1;
      }
    }
  }

  console.log(`  ${shiftsCreated} créneaux sur 2 semaines`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
