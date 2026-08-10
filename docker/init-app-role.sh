#!/bin/sh
set -eu

# Rôle de connexion de l'application — README « Configuration de la base ».
#
# **Un superutilisateur PostgreSQL contourne toute politique de sécurité au
# niveau ligne, y compris déclarée en FORCE.** Laisser l'application se
# connecter avec le compte d'amorçage désactiverait silencieusement la seconde
# couche d'isolation : les requêtes fonctionnent, les tests passent, et rien
# n'indique que la protection a disparu.
#
# Le rôle créé ici est **propriétaire de la base** — il lui faut ce droit pour
# appliquer les migrations, qui créent tables, déclencheurs et politiques — mais
# ni superutilisateur ni BYPASSRLS. C'est précisément pourquoi les politiques
# sont déclarées en FORCE : elles s'appliquent aussi au propriétaire.
#
# Joué par le conteneur `db` à la **première** initialisation du volume, puis
# par le service `db-init` à chaque `docker compose up`. Les deux sont
# nécessaires : `/docker-entrypoint-initdb.d` ne s'exécute qu'une fois, et une
# installation dont le volume existait déjà n'aurait jamais vu passer ce rôle.
# Le script est donc rejouable de bout en bout.

APP_ROLE="${APP_DB_USER:-planflow_app}"
APP_PASSWORD="${APP_DB_PASSWORD:-planflow-app-interne}"
DB_NAME="${POSTGRES_DB:-planflow}"
DB_USER="${POSTGRES_USER:-planflow}"

# Dans le conteneur `db`, l'hôte est local ; depuis `db-init`, c'est `db`.
# L'un et l'autre doivent aboutir au même SQL.
if [ -n "${PGHOST:-}" ]; then
  # Défaut aligné sur celui de la pile, et non sur celui de PostgreSQL : la
  # base écoute un port peu commun, et 5432 ne joindrait rien.
  set -- -h "$PGHOST" -p "${PGPORT:-5439}" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
else
  set -- -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1
fi

psql "$@" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
    CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    -- Le mot de passe peut avoir changé dans la configuration de la pile ;
    -- laisser l'ancien produirait un refus d'authentification illisible.
    ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${APP_PASSWORD}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
\$\$;

ALTER DATABASE ${DB_NAME} OWNER TO ${APP_ROLE};
ALTER SCHEMA public OWNER TO ${APP_ROLE};
GRANT ALL ON SCHEMA public TO ${APP_ROLE};

-- Objets déjà créés par un compte d'amorçage : sans ce transfert, le rôle
-- applicatif ne pourrait ni migrer ni lire ce qui existe déjà. Le cas se
-- produit dès qu'une base a tourné avant que ce rôle n'existe.
DO \$\$
DECLARE
  statement text;
BEGIN
  FOR statement IN
    SELECT format('ALTER TABLE %I.%I OWNER TO ${APP_ROLE}', schemaname, tablename)
    FROM pg_tables WHERE schemaname = 'public'
    UNION ALL
    SELECT format('ALTER SEQUENCE %I.%I OWNER TO ${APP_ROLE}', sequence_schema, sequence_name)
    FROM information_schema.sequences WHERE sequence_schema = 'public'
  LOOP
    EXECUTE statement;
  END LOOP;
END
\$\$;
SQL

echo "Rôle applicatif ${APP_ROLE} prêt — NOSUPERUSER NOBYPASSRLS, propriétaire de ${DB_NAME}."
