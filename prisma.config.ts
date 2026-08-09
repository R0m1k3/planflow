import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 moved the migration connection URL out of schema.prisma.
 *
 * Only the CLI reads this file. The application connects through the pg driver
 * adapter in src/server/db.ts, which is what lets WP-01 wrap every query in the
 * tenant-scoping extension required by PLAN.md §3.1.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    /*
     * Lu directement plutôt que par `env()`, qui échoue dès le **chargement**
     * du fichier de configuration quand la variable manque.
     *
     * Or ce fichier est chargé par toutes les commandes du CLI, y compris
     * `prisma generate`, qui ne se connecte à rien : la construction de l'image
     * devenait impossible sans fournir une base au constructeur. Les commandes
     * qui ont réellement besoin de l'URL — `migrate` — échouent d'elles-mêmes,
     * au moment où elle leur manque.
     */
    url: process.env.DATABASE_URL ?? '',
  },
});
