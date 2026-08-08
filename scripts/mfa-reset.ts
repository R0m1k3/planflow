/**
 * Retrait du second facteur depuis le serveur — accès « break glass »
 * (matrice n° 15).
 *
 * PlanFlow est auto-hébergé : il n'y a pas d'éditeur à appeler. Sans cette
 * issue, un administrateur qui perd à la fois son téléphone et ses codes de
 * secours ferme définitivement l'accès de l'entreprise à ses propres données —
 * et le second facteur, censé protéger, deviendrait le risque principal.
 *
 * Elle n'est délibérément pas exposée dans l'application : l'exécuter demande
 * un accès au serveur, c'est-à-dire déjà davantage que ce que le second facteur
 * protège. Le retrait est inscrit au journal d'audit, comme l'exige la matrice
 * pour un accès de ce type.
 *
 *     pnpm exec tsx scripts/mfa-reset.ts adresse@example.fr
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.argv[2]?.toLowerCase().trim();

  if (!email) {
    console.error(
      'Usage : pnpm exec tsx scripts/mfa-reset.ts <adresse électronique>',
    );
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, mfaEnrolledAt: true, memberships: { select: { id: true, accountId: true } } },
  });

  if (!user) {
    console.error(`Aucun compte pour ${email}.`);
    process.exitCode = 1;
    return;
  }

  if (!user.mfaEnrolledAt) {
    console.log(`${email} n'a pas de second facteur enregistré. Rien à faire.`);
    return;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { mfaSecretEnc: null, mfaEnrolledAt: null, mfaLastStep: null },
    }),
    prisma.mfaRecoveryCode.deleteMany({ where: { userId: user.id } }),
    // Les sessions ouvertes tombent avec le facteur : laisser vivre une session
    // établie sous l'ancien facteur viderait le retrait de son sens.
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedBy: 'mfa-reset' },
    }),
  ]);

  const membership = user.memberships[0];
  if (membership) {
    await prisma.auditLog.create({
      data: {
        accountId: membership.accountId,
        actorMembershipId: membership.id,
        action: 'security.mfa.break_glass_reset',
        entityType: 'User',
        entityId: user.id,
        before: { enrolled: true },
        after: { enrolled: false, via: 'scripts/mfa-reset.ts' },
      },
    });
  }

  console.log(
    `Second facteur retiré pour ${email}. Les sessions ouvertes sont révoquées.`,
  );
  console.log(
    'Le compte doit en réactiver un à la prochaine connexion si son rôle l’exige.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
