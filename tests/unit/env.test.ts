import { describe, expect, it, vi } from 'vitest';

/**
 * The env module validates at import, so each case needs a fresh module
 * registry with process.env set beforehand.
 */
async function loadEnv(values: Record<string, string | undefined>) {
  const previous = { ...process.env };
  process.env = { ...previous, ...values } as NodeJS.ProcessEnv;
  try {
    vi.resetModules();
    return await import('@/lib/env');
  } finally {
    process.env = previous;
  }
}

const VALID_KEY = Buffer.alloc(32, 7).toString('base64');

describe('configuration d’environnement', () => {
  it('accepte une configuration complète', async () => {
    const { env } = await loadEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/planflow',
      ENCRYPTION_KEY: VALID_KEY,
      APP_URL: 'https://planflow.example',
    });

    expect(env.DATABASE_URL).toContain('planflow');
    expect(env.APP_URL).toBe('https://planflow.example');
  });

  it('refuse une clé de chiffrement qui ne fait pas 32 octets', async () => {
    await expect(
      loadEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/planflow',
        ENCRYPTION_KEY: Buffer.alloc(16, 1).toString('base64'),
      }),
    ).rejects.toThrow(/ENCRYPTION_KEY/);
  });

  it('refuse une URL de base non PostgreSQL', async () => {
    await expect(
      loadEnv({
        DATABASE_URL: 'mysql://user:pass@localhost:3306/planflow',
        ENCRYPTION_KEY: VALID_KEY,
      }),
    ).rejects.toThrow(/DATABASE_URL/);
  });
});
