import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { env } from '@/lib/env';

/**
 * Prisma client singleton.
 *
 * WP-01 wraps this with the tenant-scoping extension required by PLAN.md §3.1,
 * so every query is filtered by the session's account and scope, with
 * PostgreSQL row-level security behind it as defence in depth. Nothing outside
 * this module should construct a client.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

/**
 * Client construit à la **première utilisation**, pas à l'import.
 *
 * Next.js évalue les modules serveur pendant la construction de l'image, où
 * aucune base n'existe : ouvrir la connexion à l'import rendait l'image
 * impossible à construire sans une base joignable et sans les secrets de
 * production. Une connexion est un objet d'exécution.
 */
function client(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = client();
    const value = Reflect.get(instance, property) as unknown;
    // Les méthodes doivent rester liées à leur client : détachées du proxy,
    // elles perdraient leur `this`.
    return typeof value === 'function' ? value.bind(instance) : value;
  },
  has(_target, property) {
    return property in client();
  },
});
