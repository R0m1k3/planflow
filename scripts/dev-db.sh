#!/usr/bin/env bash
# Base PostgreSQL de développement, locale et jetable.
#
# L'environnement d'exécution est éphémère : le répertoire de données disparaît
# entre deux sessions. Ce script est idempotent — il initialise si besoin,
# démarre sinon, et ne touche pas à un serveur déjà en marche.
#
# Le compte de connexion est ici l'administrateur du cluster, donc
# superutilisateur : il **contourne la row-level security** (voir
# src/server/db-guard.ts, qui l'avertit au démarrage et refuse en production).
# C'est acceptable en développement, et les tests d'isolation
# (tests/integration/rls.test.ts) créent de toute façon leur propre rôle
# restreint — sans quoi ils ne prouveraient rien.
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/tmp/planflow-pg}
PGPORT=${PGPORT:-55432}
DB=${DB:-planflow}
ADMIN=${ADMIN:-planflow}
APP_ROLE=${APP_ROLE:-planflow_app}
APP_PASSWORD=${APP_PASSWORD:-planflow-app-dev}

# PostgreSQL refuse de tourner en root ; on passe par le compte système.
as_postgres() { if [ "$(id -u)" = 0 ]; then su postgres -c "$1"; else sh -c "$1"; fi; }

mkdir -p "$PGDATA"
if [ "$(id -u)" = 0 ]; then chown -R postgres "$PGDATA"; fi

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  as_postgres "$PGBIN/initdb -D $PGDATA -U $ADMIN --auth=trust --encoding=UTF8 >/dev/null"
fi

if ! as_postgres "$PGBIN/pg_ctl -D $PGDATA status >/dev/null 2>&1"; then
  as_postgres "$PGBIN/pg_ctl -D $PGDATA -o '-p $PGPORT -k /tmp -c listen_addresses=127.0.0.1' -l $PGDATA/server.log -w start"
fi

psql() { "$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U "$ADMIN" -v ON_ERROR_STOP=1 "$@"; }

psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1 ||
  psql -d postgres -c "CREATE DATABASE $DB OWNER $ADMIN"

# Rôle applicatif, comme en production.
#
# `$ADMIN` est le superutilisateur d'amorçage : s'y connecter contournerait
# toute politique de sécurité au niveau ligne, y compris déclarée en FORCE. Les
# tests passeraient alors sans jamais éprouver la seconde couche d'isolation —
# elle serait présente en base et absente des faits.
psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$APP_ROLE'" | grep -q 1 ||
  psql -d postgres -c "CREATE ROLE $APP_ROLE LOGIN PASSWORD '$APP_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS"

psql -d postgres -c "ALTER DATABASE $DB OWNER TO $APP_ROLE"
psql -d "$DB" -c "ALTER SCHEMA public OWNER TO $APP_ROLE" -c "GRANT ALL ON SCHEMA public TO $APP_ROLE"

# Les objets déjà créés appartiennent encore au compte d'amorçage : sans ce
# transfert, le rôle applicatif ne pourrait ni migrer ni lire.
psql -d "$DB" -tAc "
  SELECT format('ALTER TABLE %I.%I OWNER TO $APP_ROLE;', schemaname, tablename)
  FROM pg_tables WHERE schemaname = 'public'
  UNION ALL
  SELECT format('ALTER SEQUENCE %I.%I OWNER TO $APP_ROLE;', sequence_schema, sequence_name)
  FROM information_schema.sequences WHERE sequence_schema = 'public'
  UNION ALL
  SELECT format('ALTER FUNCTION %I.%I() OWNER TO $APP_ROLE;', n.nspname, p.proname)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.pronargs = 0
" | psql -d "$DB" -q -f - >/dev/null 2>&1 || true

echo "postgres prêt sur 127.0.0.1:$PGPORT — DATABASE_URL=postgresql://$APP_ROLE:$APP_PASSWORD@127.0.0.1:$PGPORT/$DB"
