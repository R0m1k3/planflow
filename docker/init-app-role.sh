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
# Ce script est **rejouable**, et il le doit : `/docker-entrypoint-initdb.d` ne
# s'exécute qu'à la toute première initialisation du volume. Une installation
# déjà en place — un volume créé par une tentative antérieure, par exemple —
# n'aurait jamais vu passer ce rôle, et l'application échouerait à se connecter
# sans que rien n'explique pourquoi. Il est donc aussi joué à chaque démarrage
# de la pile, par le service `db-init`.

APP_ROLE="${APP_DB_USER:-planflow_app}"
APP_PASSWORD="${APP_DB_PASSWORD:-planflow-app-interne}"
DB_NAME="${POSTGRES_DB:-planflow}"
DB_USER="${POSTGRES_USER:-planflow}"

# Sans PGHOST, psql passe par la socket locale — le cas quand le script est
# joué par l'image postgres à l'initialisation. Avec, il passe par le réseau —
# le cas du service qui le rejoue à chaque démarrage.
psql -v ON_ERROR_STOP=1 --username "$DB_USER" --dbname "$DB_NAME" <<SQL
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
-- applicatif ne pourrait ni migrer ni lire ce qui existe déjà.
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
