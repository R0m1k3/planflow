import { describe, expect, it, vi } from 'vitest';

/**
 * Le module de configuration valide à la **première lecture**, pas à l'import :
 * Next.js évalue les modules serveur pendant la construction de l'image, où ni
 * la base ni la clé n'existent.
 *
 * Les valeurs doivent donc rester en place pendant la lecture — les restaurer
 * avant de lire ne prouverait rien, sinon que le module n'a rien lu.
 */
async function withEnv<T>(
  values: Record<string, string | undefined>,
  read: (env: typeof import('@/lib/env').env) => T,
): Promise<T> {
  const previous = { ...process.env };
  process.env = { ...previous, ...values } as NodeJS.ProcessEnv;
  try {
    vi.resetModules();
    const { env } = await import('@/lib/env');
    return read(env);
  } finally {
    process.env = previous;
  }
}

const VALID_KEY = Buffer.alloc(32, 7).toString('base64');

describe('configuration d’environnement', () => {
  it('accepte une configuration complète', async () => {
    const values = await withEnv(
      {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/planflow',
        ENCRYPTION_KEY: VALID_KEY,
        APP_URL: 'https://planflow.example',
      },
      (env) => ({ database: env.DATABASE_URL, app: env.APP_URL }),
    );

    expect(values.database).toContain('planflow');
    expect(values.app).toBe('https://planflow.example');
  });

  it('n’exige rien tant qu’aucune valeur n’est lue', async () => {
    // C'est ce qui rend l'image constructible sans les secrets de production :
    // importer le module ne doit pas suffire à le faire échouer.
    await expect(
      withEnv({ DATABASE_URL: undefined, ENCRYPTION_KEY: undefined }, () => 'ok'),
    ).resolves.toBe('ok');
  });

  it('refuse une clé de chiffrement qui ne fait pas 32 octets', async () => {
    await expect(
      withEnv(
        {
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/planflow',
          ENCRYPTION_KEY: Buffer.alloc(16, 1).toString('base64'),
        },
        (env) => env.ENCRYPTION_KEY,
      ),
    ).rejects.toThrow(/ENCRYPTION_KEY/);
  });

  it('refuse une URL de base non PostgreSQL', async () => {
    await expect(
      withEnv(
        {
          DATABASE_URL: 'mysql://user:pass@localhost:3306/planflow',
          ENCRYPTION_KEY: VALID_KEY,
        },
        (env) => env.DATABASE_URL,
      ),
    ).rejects.toThrow(/DATABASE_URL/);
  });

  it('refuse une configuration absente, à la lecture', async () => {
    await expect(
      withEnv(
        { DATABASE_URL: undefined, ENCRYPTION_KEY: undefined },
        (env) => env.DATABASE_URL,
      ),
    ).rejects.toThrow(/DATABASE_URL/);
  });
});
