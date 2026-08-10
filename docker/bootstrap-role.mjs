/**
 * Pose le rôle applicatif depuis le conteneur de l'application.
 *
 * Le service `db-init` fait déjà ce travail, mais il suppose un orchestrateur
 * qui honore `depends_on: service_completed_successfully` — ce que Swarm ignore,
 * et ce qu'une pile déployée avant l'ajout du service ne contient même pas.
 * L'application se retrouve alors à redémarrer en boucle sur un refus
 * d'authentification que personne ne peut corriger sans intervenir à la main.
 *
 * Elle le corrige donc elle-même, **si** on lui confie de quoi le faire. Sans
 * `POSTGRES_PASSWORD`, ce script ne fait rien et se tait : un déploiement qui
 * préfère garder les identifiants d'amorçage hors du conteneur applicatif reste
 * libre de le faire.
 *
 * Le point d'entrée retire ces variables de l'environnement avant de lancer le
 * serveur : le processus qui sert les requêtes ne les voit jamais, et une
 * exécution de code arbitraire dans l'application n'y donne pas accès.
 */
import { Client } from 'pg';

const superUser = process.env.POSTGRES_USER ?? 'planflow';
const superPassword = process.env.POSTGRES_PASSWORD ?? '';
const database = process.env.POSTGRES_DB ?? 'planflow';
const host = process.env.POSTGRES_HOST ?? 'db';
const port = Number(process.env.POSTGRES_PORT_INTERNAL ?? 5432);

const appRole = process.env.APP_DB_USER ?? 'planflow_app';
const appPassword = process.env.APP_DB_PASSWORD ?? 'planflow-app-interne';

if (!superPassword) {
  console.log(
    '[bootstrap] Aucun identifiant d’amorçage fourni : le rôle applicatif est supposé déjà en place.',
  );
  process.exit(0);
}

/**
 * Un identifiant ne se met pas entre guillemets simples comme une valeur.
 * `quote_ident` n'étant pas disponible côté client, on refuse ce qui n'a pas la
 * forme d'un identifiant plutôt que de fabriquer une injection.
 */
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(appRole)) {
  console.error(`[bootstrap] Nom de rôle invalide : ${appRole}`);
  process.exit(1);
}

const client = new Client({
  host,
  port,
  user: superUser,
  password: superPassword,
  database,
});

try {
  await client.connect();

  // Le branchement se fait ici, pas dans un bloc `DO` : à l'intérieur d'un
  // `DO`, le corps est une **chaîne littérale**, et `$1` n'y est pas un
  // paramètre de requête — le serveur répond « bind message supplies 1
  // parameters, but prepared statement requires 0 ».
  const existing = await client.query(
    'SELECT 1 FROM pg_roles WHERE rolname = $1',
    [appRole],
  );

  // L'échappement est confié à PostgreSQL : un mot de passe peut contenir une
  // apostrophe, et la concaténer à la main serait une injection.
  const quoted = await client.query('SELECT quote_literal($1) AS literal', [
    appPassword,
  ]);
  const literal = quoted.rows[0].literal;

  const attributes = 'NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS';
  await client.query(
    existing.rowCount === 0
      ? `CREATE ROLE ${appRole} LOGIN PASSWORD ${literal} ${attributes}`
      : `ALTER ROLE ${appRole} WITH LOGIN PASSWORD ${literal} ${attributes}`,
  );

  await client.query(`ALTER DATABASE "${database}" OWNER TO ${appRole}`);
  await client.query(`ALTER SCHEMA public OWNER TO ${appRole}`);
  await client.query(`GRANT ALL ON SCHEMA public TO ${appRole}`);

  // Objets créés par le compte d'amorçage lors d'un déploiement antérieur :
  // sans ce transfert, le rôle applicatif ne pourrait ni migrer ni lire.
  await client.query(`
    DO $own$
    DECLARE statement text;
    BEGIN
      FOR statement IN
        SELECT format('ALTER TABLE %I.%I OWNER TO ${appRole}', schemaname, tablename)
        FROM pg_tables WHERE schemaname = 'public'
        UNION ALL
        SELECT format('ALTER SEQUENCE %I.%I OWNER TO ${appRole}', sequence_schema, sequence_name)
        FROM information_schema.sequences WHERE sequence_schema = 'public'
      LOOP
        EXECUTE statement;
      END LOOP;
    END
    $own$;`);

  console.log(
    `[bootstrap] Rôle ${appRole} prêt — NOSUPERUSER NOBYPASSRLS, propriétaire de ${database}.`,
  );
} catch (error) {
  // Non bloquant : le rôle est peut-être déjà correct et posé par `db-init`.
  // Faire échouer le démarrage ici priverait d'une installation qui marche.
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[bootstrap] Provisionnement impossible (${message}).`);

  // Le cas de très loin le plus fréquent, et le moins évident : le compte
  // d'amorçage lui-même est refusé.
  //
  // `POSTGRES_PASSWORD` n'est lu qu'à **l'initialisation du volume**. Un volume
  // créé lors d'un déploiement antérieur garde le mot de passe d'alors, et le
  // changer dans la pile n'y touche pas — le volume ne se réinitialise jamais.
  // Sans cette explication, on cherche indéfiniment du côté du rôle applicatif,
  // qui n'y est pour rien.
  if (/password authentication failed/i.test(message)) {
    console.error('');
    console.error(
      `[bootstrap] Le compte d’amorçage « ${superUser} » est lui-même refusé.`,
    );
    console.error(
      '[bootstrap] POSTGRES_PASSWORD n’est lu qu’à la création du volume de la',
    );
    console.error(
      '[bootstrap] base. Si ce volume vient d’un déploiement antérieur, il porte',
    );
    console.error(
      '[bootstrap] encore l’ancien mot de passe, et le changer dans la pile n’y',
    );
    console.error('[bootstrap] change rien.');
    console.error('');
    console.error('[bootstrap]   • Base encore vide — repartir d’un volume neuf :');
    console.error('[bootstrap]       docker compose down');
    console.error('[bootstrap]       docker volume rm planflow_db-data');
    console.error('[bootstrap]       docker compose up -d');
    console.error('');
    console.error('[bootstrap]   • Base à conserver — réaligner le mot de passe.');
    console.error(
      '[bootstrap]     Par la socket locale, qui ne demande pas l’ancien :',
    );
    console.error(
      `[bootstrap]       docker compose exec db psql -U ${superUser} \\`,
    );
    console.error(
      `[bootstrap]         -c "ALTER USER ${superUser} PASSWORD '<celui de la pile>';"`,
    );
    console.error('');
  }

  console.error(
    '[bootstrap] La suite dira si le rôle applicatif est utilisable en l’état.',
  );
} finally {
  await client.end().catch(() => undefined);
}
