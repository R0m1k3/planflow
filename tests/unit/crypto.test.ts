import { describe, expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/planflow';
process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 3).toString('base64');

const crypto = await import('@/server/crypto');

describe('chiffrement des colonnes sensibles', () => {
  it('fait un aller-retour fidèle', () => {
    const nir = '1 85 04 44 109 123 45';
    expect(crypto.decrypt(crypto.encrypt(nir))).toBe(nir);
  });

  it('préserve les accents et les caractères non latins', () => {
    const value = 'Rémi Chartier — 电子';
    expect(crypto.decrypt(crypto.encrypt(value))).toBe(value);
  });

  it('produit un chiffré différent à chaque appel', () => {
    // Un IV constant ferait apparaître deux salariés au même IBAN comme
    // identiques dans la base, sans jamais déchiffrer quoi que ce soit.
    const a = crypto.encrypt('FR7630006000011234567890189');
    const b = crypto.encrypt('FR7630006000011234567890189');
    expect(a.equals(b)).toBe(false);
  });

  it('rejette un chiffré modifié', () => {
    // GCM authentifie : une altération est détectée au lieu de produire du
    // clair corrompu qu'on prendrait pour une donnée valide.
    const payload = crypto.encrypt('FR7630006000011234567890189');
    const last = payload.length - 1;
    payload.writeUInt8(payload.readUInt8(last) ^ 0xff, last);
    expect(() => crypto.decrypt(payload)).toThrow();
  });

  it('rejette un chiffré tronqué', () => {
    const payload = crypto.encrypt('valeur');
    expect(() => crypto.decrypt(payload.subarray(0, 8))).toThrow(/trop court/);
  });

  it('accepte un Uint8Array, comme le renvoie Prisma', () => {
    const payload = crypto.encrypt('valeur');
    const asArray = new Uint8Array(payload);
    expect(crypto.decrypt(asArray)).toBe('valeur');
  });

  it('gère les valeurs absentes sans lever', () => {
    expect(crypto.encryptOptional(null)).toBeNull();
    expect(crypto.encryptOptional('')).toBeNull();
    expect(crypto.decryptOptional(null)).toBeNull();
  });
});

describe('jetons', () => {
  it('produit des jetons uniques et suffisamment longs', () => {
    const tokens = new Set(
      Array.from({ length: 200 }, () => crypto.generateToken()),
    );
    expect(tokens.size).toBe(200);
    for (const token of tokens) expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('ne stocke jamais le jeton en clair', () => {
    const token = crypto.generateToken();
    const hash = crypto.hashToken(token);
    expect(hash).not.toContain(token);
    expect(hash).toHaveLength(64);
    expect(crypto.hashToken(token)).toBe(hash);
  });

  it('compare à temps constant sans se tromper', () => {
    expect(crypto.safeEqual('abc', 'abc')).toBe(true);
    expect(crypto.safeEqual('abc', 'abd')).toBe(false);
    expect(crypto.safeEqual('abc', 'abcd')).toBe(false);
  });
});
