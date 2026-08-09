import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Accès direct à la base, pour la mise en place des tests seulement.
 *
 * Certains états ne se posent pas par l'interface — retirer un second facteur
 * dont on a perdu le secret, par exemple. Les fabriquer ici garde la suite
 * rejouable sans ajouter au produit une porte qui n'aurait pas lieu d'exister.
 *
 * La connexion est **administrative**, distincte de celle de l'application :
 * cette dernière est soumise à la row-level security et ne voit rien hors du
 * compte courant, ce qui est précisément le but. Un harnais de test fabrique
 * l'état comme le ferait un exploitant, depuis le serveur.
 */
let client: PrismaClient | null = null;

function adminUrl(): string {
  const url = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('ADMIN_DATABASE_URL ou DATABASE_URL requis');
  return url;
}

function db(): PrismaClient {
  // Prisma 7 exige un adaptateur : le client applicatif n'est pas réutilisable
  // ici, il vit derrière `server-only`.
  client ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: adminUrl() }),
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

/**
 * Recule la date de dépôt d'une pièce.
 *
 * Aucune interface ne permet d'antidater, et c'est bien ainsi. Sans ce levier,
 * la moitié utile de la purge — celle qui efface — resterait invérifiable :
 * seule l'échéance atteinte la déclenche, et elle se compte en mois.
 *
 * La transaction pose `app.account_id` : la table est protégée par RLS, et une
 * mise à jour sans compte courant ne toucherait aucune ligne — en silence.
 */
export async function backdateDocument(
  name: string,
  months: number,
): Promise<void> {
  const document = await db().$queryRaw<Array<{ id: string; accountId: string }>>`
    SELECT id, "accountId" FROM "Document" WHERE name = ${name} LIMIT 1
  `;
  const found = document[0];
  if (!found) throw new Error(`Pièce introuvable : ${name}`);

  const uploadedAt = new Date();
  uploadedAt.setMonth(uploadedAt.getMonth() - months);

  await db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.account_id', ${found.accountId}, true)`;
    await tx.$executeRaw`UPDATE "Document" SET "uploadedAt" = ${uploadedAt} WHERE id = ${found.id}`;
  });
}

/**
 * Attribue un rôle à un membership, par son libellé.
 *
 * Aucun écran d'affectation n'existe encore : sans ce levier, l'effet d'un rôle
 * personnalisé — le critère d'acceptation de WP-01 — resterait invérifiable.
 */
export async function assignRole(
  membershipId: string,
  roleName: string,
): Promise<void> {
  const rows = await db().$queryRaw<Array<{ id: string; accountId: string }>>`
    SELECT id, "accountId" FROM "Role" WHERE name = ${roleName} LIMIT 1
  `;
  const role = rows[0];
  if (!role) throw new Error(`Rôle introuvable : ${roleName}`);

  const updated = await db().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.account_id', ${role.accountId}, true)`;
    return tx.$executeRaw`UPDATE "Membership" SET "roleId" = ${role.id} WHERE id = ${membershipId}`;
  });

  // Une mise à jour qui ne touche aucune ligne est indiscernable d'un succès :
  // le test échouerait bien plus loin, sur un refus d'accès inexpliqué.
  if (updated === 0) {
    throw new Error(`Aucun membership mis à jour : ${membershipId}`);
  }
}
