import { fileURLToPath } from 'node:url';

import 'dotenv/config';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Les tests d'intégration parlent à une vraie base : ils se sautent
    // d'eux-mêmes quand DATABASE_URL est absente.
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    globals: false,
  },
});
