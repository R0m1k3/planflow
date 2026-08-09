import { z } from 'zod';

/**
 * Environment contract, validated once at import.
 *
 * A missing DATABASE_URL should fail at boot with a readable message, not
 * surface later as an opaque driver error in the middle of a payroll export.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  /**
   * Application-level encryption key for the columns PLAN.md §3.6 requires at
   * rest (NIR, IBAN, BIC). 32 bytes, base64. Kept out of the database so a dump
   * alone does not disclose them.
   */
  ENCRYPTION_KEY: z
    .string()
    .refine(
      (value) => Buffer.from(value, 'base64').length === 32,
      'ENCRYPTION_KEY doit être 32 octets encodés en base64',
    ),

  /** Public origin, used for links in invitation and notification e-mails. */
  APP_URL: z.url().default('http://localhost:3000'),

  /**
   * Where employee documents live on disk, encrypted with ENCRYPTION_KEY.
   *
   * Kept out of the database: megabytes of scans would make every backup
   * impractical. Back this directory up alongside the database — one without
   * the other restores a dossier with missing pieces.
   */
  DOCUMENT_STORE: z.string().min(1).default('./storage/documents'),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuration d'environnement invalide :\n${details}`);
  }

  return parsed.data;
}

let cached: Env | null = null;

/**
 * Contrat d'environnement, validé à la **première lecture** et non à l'import.
 *
 * La différence n'est pas cosmétique : Next.js évalue les modules serveur
 * pendant la construction de l'image, où ni la base ni la clé de chiffrement
 * n'existent — ce sont des valeurs d'exécution. Valider à l'import rendait
 * l'image impossible à construire sans les secrets de production, c'est-à-dire
 * exigeait de les confier au constructeur.
 *
 * La garantie reste entière : la première lecture arrive au premier appel utile,
 * bien avant qu'une requête aboutisse, et échoue avec le même message.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, property) {
    cached ??= load();
    return cached[property as keyof Env];
  },
  has(_target, property) {
    cached ??= load();
    return property in cached;
  },
  ownKeys() {
    cached ??= load();
    return Reflect.ownKeys(cached);
  },
  getOwnPropertyDescriptor(_target, property) {
    cached ??= load();
    return Reflect.getOwnPropertyDescriptor(cached, property);
  },
});
