// La mise en place lit la base directement pour rendre la suite rejouable ;
// sans cela DATABASE_URL n'existe que pour le serveur, pas pour les tests.
import 'dotenv/config';

import { defineConfig, devices } from '@playwright/test';

import { STORAGE_STATE } from './tests/e2e/storage';

/**
 * Certains environnements fournissent déjà un Chromium dont la révision ne
 * correspond pas à celle qu'attend cette version de Playwright.
 * PLAYWRIGHT_CHROMIUM_PATH permet de le réutiliser plutôt que d'en télécharger
 * un second.
 */
const chromiumOverride = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
  : {};

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Serial in CI so the single Postgres service is not raced.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
  },

  projects: [
    // Ouvre une session et enregistre le cookie ; les autres projets
    // le réutilisent.
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], ...chromiumOverride },
    },
    // Parcours d'authentification : doit partir d'un navigateur vierge.
    // Dépend tout de même de la mise en place, qui pose le second facteur du
    // compte de direction — sans lequel la connexion ne peut pas être jouée.
    {
      name: 'anonyme',
      testMatch: /(auth|reglages|acces|installation)\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], ...chromiumOverride },
    },
    {
      name: 'chromium',
      testIgnore:
        /(auth\.setup|auth\.spec|reglages\.spec|acces\.spec|installation\.spec)\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        ...chromiumOverride,
        storageState: STORAGE_STATE,
      },
    },
  ],

  webServer: {
    // Exercise the standalone server, which is what the Docker image runs.
    // `next start` is not compatible with `output: standalone`, and testing a
    // different server than the one deployed defeats the purpose of this suite.
    command: [
      'pnpm build',
      'cp -r .next/static .next/standalone/.next/static',
      'cp -r public .next/standalone/public',
      `node .next/standalone/server.js`,
    ].join(' && '),
    url: baseURL,
    // APP_URL fabrique les liens des messages — invitations comprises. Le
    // laisser sur sa valeur par défaut ferait pointer les liens vers un port
    // où rien n'écoute pendant les tests.
    env: { PORT: String(PORT), HOSTNAME: '127.0.0.1', APP_URL: baseURL },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
