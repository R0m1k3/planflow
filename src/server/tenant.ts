import { Prisma, type PrismaClient } from '@prisma/client';

import { prisma } from '@/server/db';

/**
 * Isolation multi-tenant — PLAN.md §3.1.
 *
 * Deux couches indépendantes :
 *
 * 1. `SET LOCAL app.account_id` active les politiques RLS de PostgreSQL, qui
 *    filtrent en base quoi qu'il arrive côté application.
 * 2. L'extension Prisma injecte `accountId` dans chaque `where` et chaque
 *    `create`, pour que le filtre soit aussi visible dans le plan de requête
 *    et que l'erreur, quand il y en a une, soit lisible.
 *
 * La première seule laisserait passer des requêtes qui ramènent zéro ligne sans
 * dire pourquoi ; la seconde seule tomberait avec le premier `$queryRaw`.
 */

/**
 * Modèles portant une colonne `accountId`, **dérivés du schéma**.
 *
 * Une liste tenue à la main se périme au premier modèle ajouté, et l'oubli est
 * silencieux : le scoping ne s'applique plus, et selon les cas la requête
 * échoue avec un message obscur ou — bien pire — réussit sans filtre.
 * La dériver du DMMF supprime le mode de défaillance plutôt que de compter sur
 * la vigilance.
 */
const SCOPED_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) =>
      model.fields.some(
        (field) => field.name === 'accountId' && field.kind === 'scalar',
      ),
    )
    .map((model) => model.name),
);

const READ_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

const CREATE_OPERATIONS = new Set(['create', 'createMany', 'upsert']);

export type ScopedClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$transaction' | '$extends'
>;

/**
 * Un client étendu par compte. Mémorisé : `$extends` construit un proxy à
 * chaque appel, et on en ferait un par requête HTTP sinon.
 */
const scopedClients = new Map<string, ReturnType<typeof buildScopedClient>>();

function scopedClientFor(accountId: string) {
  const existing = scopedClients.get(accountId);
  if (existing) return existing;
  const client = buildScopedClient(accountId);
  scopedClients.set(accountId, client);
  return client;
}

function buildScopedClient(accountId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const input = args as Record<string, unknown>;

          if (READ_OPERATIONS.has(operation)) {
            input.where = { ...(input.where as object), accountId };
          }

          if (CREATE_OPERATIONS.has(operation)) {
            if (operation === 'createMany') {
              const data = input.data;
              input.data = Array.isArray(data)
                ? data.map((row) => ({ ...(row as object), accountId }))
                : { ...(data as object), accountId };
            } else if (operation === 'upsert') {
              input.where = { ...(input.where as object), accountId };
              input.create = { ...(input.create as object), accountId };
            } else {
              input.data = { ...(input.data as object), accountId };
            }
          }

          return query(input);
        },
      },
    },
  });
}

/**
 * Exécute `fn` dans une transaction portant le compte courant.
 *
 * Tout accès aux données d'un compte passe par ici. Le périmètre vient de la
 * session serveur, jamais d'un paramètre client — c'est la règle qui rend
 * l'isolation vérifiable plutôt que confiante.
 */
export async function withTenant<T>(
  accountId: string,
  fn: (db: ScopedClient) => Promise<T>,
): Promise<T> {
  // La transaction est ouverte **depuis le client étendu**, pour que le `tx`
  // qu'elle fournit porte l'extension et partage la connexion sur laquelle
  // `set_config` est posé. L'inverse — étendre le `tx` — n'est pas possible :
  // Prisma retire `$extends` du client de transaction.
  return scopedClientFor(accountId).$transaction(async (tx) => {
    // `set_config(..., true)` est local à la transaction, donc remis à zéro
    // automatiquement. Une connexion rendue au pool ne garde pas le compte
    // précédent — ce serait la pire fuite possible.
    await tx.$executeRaw`SELECT set_config('app.account_id', ${accountId}, true)`;

    return fn(tx as unknown as ScopedClient) as Promise<T>;
  });
}

/**
 * Accès sans portée de compte, pour les opérations qui précèdent l'identité :
 * authentification par e-mail, acceptation d'invitation, migrations.
 *
 * Volontairement nommé pour se voir en revue de code.
 */
export function unscoped(): PrismaClient {
  return prisma;
}

