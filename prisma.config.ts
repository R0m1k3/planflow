import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

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
    url: env('DATABASE_URL'),
  },
});
