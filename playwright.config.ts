import { defineConfig, devices } from '@playwright/test';

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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
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
    env: { PORT: String(PORT), HOSTNAME: '127.0.0.1' },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
