import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Accès direct à la base, pour la mise en place des tests seulement.
 *
 * Certains états ne se posent pas par l'interface — retirer un second facteur
 * dont on a perdu le secret, par exemple. Les fabriquer ici garde la suite
 * rejouable sans ajouter au produit une porte qui n'aurait pas lieu d'exister.
 */
let client: PrismaClient | null = null;

function db(): PrismaClient {
  // Prisma 7 exige un adaptateur : le client applicatif n'est pas réutilisable
  // ici, il vit derrière `server-only`.
  client ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  return client;
}

/** Remet un compte à l'état « aucun second facteur », sans effet s'il n'en a pas. */
export async function resetMfa(email: string): Promise<void> {
  const user = await db().user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return;

  await db().user.update({
    where: { id: user.id },
    data: { mfaSecretEnc: null, mfaEnrolledAt: null, mfaLastStep: null },
  });
  await db().mfaRecoveryCode.deleteMany({ where: { userId: user.id } });
}
