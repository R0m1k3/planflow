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

echo "postgres prêt sur 127.0.0.1:$PGPORT — DATABASE_URL=postgresql://$ADMIN@127.0.0.1:$PGPORT/$DB"
