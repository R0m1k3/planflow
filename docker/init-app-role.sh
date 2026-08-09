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
# Ce script ne s'exécute qu'à la **première** initialisation du volume. Pour une
# installation déjà en place, jouer le même SQL à la main (voir README).

APP_ROLE="${APP_DB_USER:-planflow_app}"
APP_PASSWORD="${APP_DB_PASSWORD:-planflow-app-interne}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
    CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
\$\$;

ALTER DATABASE ${POSTGRES_DB} OWNER TO ${APP_ROLE};
ALTER SCHEMA public OWNER TO ${APP_ROLE};
GRANT ALL ON SCHEMA public TO ${APP_ROLE};
SQL

echo "Rôle applicatif ${APP_ROLE} prêt — NOSUPERUSER NOBYPASSRLS, propriétaire de ${POSTGRES_DB}."
