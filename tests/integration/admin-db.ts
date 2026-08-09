import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Connexion administrative, pour la mise en place des tests d'intégration.
 *
 * L'application se connecte avec un rôle **soumis à la row-level security** :
 * il ne voit rien hors du compte courant, et ne peut pas créer de compte de
 * toutes pièces. C'est exactement ce qu'on attend de lui.
 *
 * Ces tests fabriquent pourtant des comptes entiers pour éprouver l'isolation
 * entre eux. Ils passent donc par la connexion d'amorçage, comme le ferait un
 * exploitant depuis le serveur — jamais par celle de l'application, dont la
 * limitation est le sujet même de plusieurs de ces tests.
 */
export function adminDatabaseUrl(): string {
  return process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
}

let client: PrismaClient | null = null;

export function adminPrisma(): PrismaClient {
  client ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: adminDatabaseUrl() }),
  });
  return client;
}
