#!/bin/sh
set -eu

# Démarrage du conteneur applicatif.
#
# La clé de chiffrement protège le NIR, l'IBAN, les secrets de second facteur et
# les pièces du dossier salarié. Elle doit exister avant que quoi que ce soit
# démarre — mais l'exiger en variable d'environnement rendait tout déploiement
# impossible sans une étape manuelle, et une variable d'environnement n'est de
# toute façon pas un bon coffre : elle s'affiche dans `docker inspect` et dans
# l'interface de gestion.
#
# Elle est donc produite au premier démarrage et conservée dans un volume
# **distinct** de la base et des documents : une sauvegarde de l'un ne doit pas
# emporter la clé de l'autre.
#
# `ENCRYPTION_KEY` fournie explicitement l'emporte toujours : un déploiement qui
# gère ses secrets par ailleurs ne doit pas être contrarié.

KEY_FILE="${ENCRYPTION_KEY_FILE:-/secrets/encryption.key}"
# Surchargeable pour pouvoir éprouver ce script hors d'une image.
MIGRATOR_DIR="${MIGRATOR_DIR:-/migrator}"

if [ -z "${ENCRYPTION_KEY:-}" ]; then
  if [ -f "$KEY_FILE" ]; then
    ENCRYPTION_KEY="$(cat "$KEY_FILE")"
  else
    mkdir -p "$(dirname "$KEY_FILE")"
    ENCRYPTION_KEY="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))")"
    # Écriture puis restriction : le fichier ne doit jamais être lisible par
    # d'autres, même brièvement.
    (umask 077; printf '%s' "$ENCRYPTION_KEY" > "$KEY_FILE")

    echo ''
    echo '════════════════════════════════════════════════════════════════'
    echo ' Clé de chiffrement produite au premier démarrage.'
    echo ''
    echo "   $ENCRYPTION_KEY"
    echo ''
    echo ' Conservez-la hors de ce serveur. Sans elle, le NIR, les IBAN et'
    echo ' les pièces du dossier salarié sont définitivement illisibles.'
    echo ''
    echo " Elle est stockée dans $KEY_FILE, sur un volume distinct de la"
    echo ' base et des documents — à sauvegarder séparément.'
    echo '════════════════════════════════════════════════════════════════'
    echo ''
  fi
fi

export ENCRYPTION_KEY

# Les migrations s'appliquent au démarrage : l'image se déploie sans étape
# séparée.
#
# Depuis /migrator, arbre séparé de celui de l'application : la CLI y trouve ses
# propres dépendances, et le fichier de configuration y résout `prisma/config`.
# Appelée par son chemin plutôt que par `.bin/prisma` — un lien symbolique
# recopié d'une image à l'autre est une dépendance de plus à la disposition des
# fichiers, et c'est exactement ce qui a cassé ici.
migration_log="$(mktemp)"
if ! ( cd "$MIGRATOR_DIR" && node node_modules/prisma/build/index.js migrate deploy ) \
    >"$migration_log" 2>&1; then
  cat "$migration_log"

  # Deux codes, deux causes voisines, même remède :
  #   P1010 — le rôle n'existe pas ;
  #   P1000 — il existe, mais son mot de passe ne correspond pas à celui de la
  #           pile, typiquement parce qu'il a été posé lors d'un déploiement
  #           antérieur avec une autre valeur.
  #
  # Dans les deux cas c'est `db-init` qui remet les choses d'aplomb : il crée le
  # rôle ou réaligne son mot de passe. Sans ce message, l'application redémarre
  # en boucle sur une erreur qui n'indique rien à faire.
  if grep -qE 'P1000|P1010' "$migration_log"; then
    role="${APP_DB_USER:-planflow_app}"
    echo ''
    echo '════════════════════════════════════════════════════════════════'
    if grep -q 'P1010' "$migration_log"; then
      echo " Le rôle « ${role} » n'existe pas dans cette base."
    else
      echo " Le rôle « ${role} » existe, mais son mot de passe ne correspond"
      echo ' pas à celui que porte la pile. Il a probablement été créé lors'
      echo " d'un déploiement antérieur, avec une autre valeur."
    fi
    echo ''
    echo ' Le service `db-init` crée ce rôle et réaligne son mot de passe à'
    echo " chaque démarrage. Vérifiez qu'il figure bien dans la pile, et ce"
    echo " qu'il a journalisé :"
    echo ''
    echo '     docker compose logs db-init'
    echo '     docker compose run --rm db-init'
    echo ''
    echo " La seconde commande le rejoue : il est fait pour être exécuté"
    echo " autant de fois qu'il le faut."
    echo '════════════════════════════════════════════════════════════════'
    echo ''
  fi

  rm -f "$migration_log"
  exit 1
fi

cat "$migration_log"
rm -f "$migration_log"

exec node server.js
