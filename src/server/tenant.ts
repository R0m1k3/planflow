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
 * Budget d'une transaction de compte.
 *
 * Prisma applique 5 s par défaut, sans le dire. Comme **tout** accès aux
 * données passe par `withTenant`, ce défaut plafonne en réalité chaque requête
 * de l'application : une semaine de planning chargée sur un serveur occupé
 * échoue alors sur un `P2028` qui ne désigne ni la requête ni la cause.
 *
 * La valeur est donc posée ici, visible et discutable, plutôt que subie. Elle
 * reste un plafond : une transaction qui l'atteint est un défaut à corriger,
 * pas une lenteur à tolérer — mais elle doit échouer parce qu'elle est trop
 * lente, pas parce que la machine était chargée pendant deux secondes.
 */
const TRANSACTION_BUDGET_MS = 20_000;

/** Attente maximale d'une connexion libre avant de renoncer. */
const CONNECTION_WAIT_MS = 10_000;

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
  return scopedClientFor(accountId).$transaction(
    async (tx) => {
      // `set_config(..., true)` est local à la transaction, donc remis à zéro
      // automatiquement. Une connexion rendue au pool ne garde pas le compte
      // précédent — ce serait la pire fuite possible.
      await tx.$executeRaw`SELECT set_config('app.account_id', ${accountId}, true)`;

      return fn(tx as unknown as ScopedClient) as Promise<T>;
    },
    { timeout: TRANSACTION_BUDGET_MS, maxWait: CONNECTION_WAIT_MS },
  );
}

/**
 * Exécute `fn` au nom d'un utilisateur, **avant** que son compte soit connu.
 *
 * Sert au seul amorçage de session : trouver à quel compte un utilisateur
 * appartient suppose de lire son rattachement, et le rattachement est
 * lui-même filtré par compte. Sans cette porte étroite, la seule issue serait
 * de connecter l'application avec un rôle qui contourne la RLS — c'est-à-dire
 * de la désactiver partout pour résoudre un cas d'amorçage.
 *
 * La politique associée n'ouvre que les lignes dont l'utilisateur est le
 * titulaire (voir la migration `membership_self_read`).
 */
export async function withUser<T>(
  userId: string,
  fn: (db: ScopedClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx as unknown as ScopedClient) as Promise<T>;
  });
}

/**
 * Accès sans portée de compte, pour les opérations qui précèdent l'identité :
 * authentification par e-mail, acceptation d'invitation, migrations.
 *
 * Ne donne accès qu'aux tables **sans** colonne `accountId` — sessions,
 * utilisateurs, codes de secours. Les autres restent filtrées par la RLS, qui
 * ne laisse rien passer hors d'une transaction scopée.
 *
 * Volontairement nommé pour se voir en revue de code.
 */
export function unscoped(): PrismaClient {
  return prisma;
}

