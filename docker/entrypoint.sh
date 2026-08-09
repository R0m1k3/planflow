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
./node_modules/.bin/prisma migrate deploy

exec node server.js
