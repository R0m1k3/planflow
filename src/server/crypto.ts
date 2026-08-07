import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
  createHash,
} from 'node:crypto';

import { env } from '@/lib/env';

/**
 * Chiffrement applicatif des colonnes sensibles — PLAN.md §3.6.
 *
 * NIR, IBAN, BIC et secrets MFA. AES-256-GCM : le mode authentifié détecte
 * qu'un chiffré a été modifié, ce qu'un CBC laisserait passer en produisant du
 * clair corrompu.
 *
 * La clé vit hors de la base. Une sauvegarde volée ne doit pas suffire à lire
 * ces colonnes — sans quoi le chiffrement ne protège que du vol de disque nu.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function key(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, 'base64');
}

/** Format : [iv (12) | tag (16) | chiffré]. */
export function encrypt(plaintext: string): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function decrypt(payload: Uint8Array): string {
  // Prisma 7 renvoie les colonnes `Bytes` en Uint8Array, pas en Buffer.
  const buffer = Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);
  return decryptBuffer(buffer);
}

function decryptBuffer(payload: Buffer): string {
  if (payload.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Chiffré invalide : trop court pour contenir iv et tag');
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptOptional(value: string | null | undefined): Buffer | null {
  return value ? encrypt(value) : null;
}

export function decryptOptional(
  payload: Uint8Array | null | undefined,
): string | null {
  return payload ? decrypt(payload) : null;
}

/**
 * Empreinte d'un jeton de session ou d'invitation.
 *
 * La base ne stocke que l'empreinte : une fuite de la table ne donne pas de
 * sessions utilisables. SHA-256 suffit ici — le jeton est déjà 256 bits
 * d'aléa, il n'y a pas de dictionnaire à ralentir, contrairement à un mot de
 * passe.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Comparaison à temps constant, pour ne pas fuiter par la durée. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
