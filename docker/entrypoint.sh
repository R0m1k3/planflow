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

# Pose ou réaligne le rôle applicatif, si les identifiants d'amorçage sont
# fournis. Sans eux, ce script se tait : c'est alors `db-init` qui s'en charge.
node "${BOOTSTRAP_SCRIPT:-./docker/bootstrap-role.mjs}" || true

# Les identifiants d'amorçage ne vont pas plus loin : le serveur qui traite les
# requêtes ne doit pas les avoir sous la main. Une exécution de code arbitraire
# dans l'application n'y donnera pas accès, et l'isolation par la row-level
# security garde son sens.
unset POSTGRES_PASSWORD PGPASSWORD

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

  # Deux codes, deux causes voisines :
  #   P1010 — le rôle n'existe pas ;
  #   P1000 — il existe, mais son mot de passe ne correspond pas à celui de la
  #           pile, typiquement parce qu'il a été posé lors d'un déploiement
  #           antérieur avec une autre valeur.
  #
  # Les voir **ici** signifie que l'amorçage ci-dessus n'a pas fait son travail :
  # soit il n'a pas reçu d'identifiants, soit il a échoué. Le message renvoie
  # donc à ce qu'il a journalisé, et non à une manœuvre à improviser.
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
    echo " L'application sait poser ce rôle elle-même au démarrage. Les lignes"
    echo ' « [bootstrap] » plus haut disent pourquoi elle ne l’a pas fait :'
    echo ''
    echo "   • « Aucun identifiant d’amorçage fourni » — le service applicatif"
    echo '     n’a pas POSTGRES_PASSWORD. Ajoutez-le, ou lancez :'
    echo '         docker compose run --rm db-init'
    echo ''
    echo '   • « Provisionnement impossible » — le message qui suit indique'
    echo '     ce qui a échoué (base injoignable, mot de passe d’amorçage'
    echo '     erroné, droits insuffisants).'
    echo '════════════════════════════════════════════════════════════════'
    echo ''
  fi

  rm -f "$migration_log"
  exit 1
fi

cat "$migration_log"
rm -f "$migration_log"

exec node server.js
