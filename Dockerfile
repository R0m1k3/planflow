# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- dependencies -----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- build ------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm db:generate && pnpm build

# CLI Prisma pour les migrations au démarrage, installée à plat.
#
# `node_modules/prisma` de pnpm ne se recopie pas : ses dépendances vivent dans
# le magasin virtuel `.pnpm`, sous un répertoire au nom haché. En prélever
# quelques répertoires à la main donne une CLI qui se lance et s'arrête sur
# « Cannot find module '@prisma/config' ». npm produit une disposition plate,
# copiable telle quelle.
#
# La version est lue dans package.json : la figer ici la ferait diverger au
# premier changement.
RUN PRISMA_VERSION="$(node -p "require('/app/package.json').devDependencies.prisma")" \
 && npm install --prefix /migrator --no-save --no-audit --no-fund "prisma@${PRISMA_VERSION}"

# ---- runtime ----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# Tout ce qui sert aux migrations vit à part, dans /migrator : modules, schéma
# et fichier de configuration.
#
# Les superposer aux modules de l'application les ferait entrer en collision —
# la sortie `standalone` de pnpm porte `react` en lien symbolique vers son
# magasin interne, là où l'installation npm de la CLI l'apporte en répertoire
# réel. Deux arbres séparés n'ont rien à s'écraser.
COPY --from=build --chown=nextjs:nodejs /migrator/node_modules /migrator/node_modules
COPY --from=build --chown=nextjs:nodejs /app/prisma /migrator/prisma
COPY --from=build --chown=nextjs:nodejs /app/prisma.config.ts /migrator/prisma.config.ts

# `output: standalone` emits a server bundle carrying only the modules it uses.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./docker/entrypoint.sh
COPY --chown=nextjs:nodejs docker/bootstrap-role.mjs ./docker/bootstrap-role.mjs

# Le bit exécutable est posé **dans l'image**, sans dépendre de celui du fichier
# source. `COPY` recopie le mode d'origine, et ce mode se perd hors d'un clone
# git : archive envoyée à Portainer, contexte reconstitué, système de fichiers
# qui ne porte pas la permission.
#
# La panne que cela produit ne ressemble à rien : la forme exec de `CMD` échoue
# **avant** le premier octet de sortie, si bien que le conteneur s'arrête sans
# une ligne de journal. On cherche alors un défaut applicatif là où il n'y a
# jamais eu de processus.
RUN chmod +x ./docker/entrypoint.sh

# Créé dans l'image, et non laissé au montage : un volume nommé hérite du
# propriétaire du répertoire qu'il recouvre, et sans cela l'application —
# qui ne tourne pas en root — ne pourrait pas y écrire.
RUN mkdir -p /data/documents /secrets && chown -R nextjs:nodejs /data /secrets

USER nextjs
# Port peu courant jusque **dans** l'image : le reverse-proxy porte alors la
# même valeur partout, et rien ne rappelle un 3000 par défaut. Surchargeable
# par la pile, qui aligne publication, sonde de santé et serveur sur une
# unique variable.
EXPOSE 9317
ENV PORT=9317 HOSTNAME=0.0.0.0

CMD ["./docker/entrypoint.sh"]
