import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Second facteur temporel (TOTP, RFC 6238) — matrice n° 15.
 *
 * Implémenté ici plutôt qu'emprunté : l'algorithme tient en trente lignes, et
 * une dépendance de plus sur le chemin d'authentification est une surface de
 * plus à surveiller.
 *
 * Le choix du TOTP plutôt que d'un code envoyé par message tient à une raison
 * simple : le second facteur ne doit pas dépendre du canal qui sert déjà à
 * réinitialiser le mot de passe. Un accès à la boîte électronique donnerait
 * sinon les deux facteurs d'un coup.
 */

/** 30 secondes — la valeur qu'attendent toutes les applications d'authentification. */
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/**
 * Tolérance d'un pas de part et d'autre.
 *
 * Zéro rejetterait un téléphone désynchronisé de quelques secondes, ce qui est
 * courant ; élargir davantage allongerait d'autant la fenêtre exploitable par
 * un code intercepté.
 */
export const TOTP_WINDOW = 1;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(encoded: string): Uint8Array {
  // Les utilisateurs recopient parfois le secret à la main : espaces, minuscules
  // et remplissage « = » sont tolérés plutôt que refusés sans explication.
  const cleaned = encoded.replace(/[\s=]/g, '').toUpperCase();

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const character of cleaned) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error('Secret TOTP invalide : caractère hors alphabet base32');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Uint8Array.from(output);
}

/** Numéro de pas courant. Sert aussi à interdire le rejeu d'un code déjà employé. */
export function totpStep(atMs: number): number {
  return Math.floor(atMs / 1000 / TOTP_STEP_SECONDS);
}

export function totpCodeAtStep(secret: string, step: number): string {
  const key = base32Decode(secret);

  const counter = Buffer.alloc(8);
  // Compteur sur 64 bits big-endian. `writeBigUInt64BE` évite le débordement
  // qu'un décalage 32 bits produirait au-delà de 2038.
  counter.writeBigUInt64BE(BigInt(step));

  const digest = createHmac('sha1', key).update(counter).digest();

  // Troncature dynamique (RFC 4226 §5.3).
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export function totpCode(secret: string, atMs: number): string {
  return totpCodeAtStep(secret, totpStep(atMs));
}

export interface TotpVerification {
  ok: boolean;
  /** Pas employé, à mémoriser pour refuser le rejeu du même code. */
  step?: number;
}

/**
 * Vérifie un code.
 *
 * `lastUsedStep` interdit qu'un code intercepté serve une seconde fois dans sa
 * fenêtre de validité : sans cela, le TOTP protège d'un mot de passe volé mais
 * pas d'un code lu par-dessus l'épaule.
 */
export function verifyTotp(
  secret: string,
  code: string,
  atMs: number,
  lastUsedStep: number | null = null,
): TotpVerification {
  const cleaned = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleaned)) return { ok: false };

  const current = totpStep(atMs);

  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const step = current + offset;
    if (lastUsedStep !== null && step <= lastUsedStep) continue;

    if (equals(totpCodeAtStep(secret, step), cleaned)) {
      return { ok: true, step };
    }
  }

  return { ok: false };
}

/**
 * Comparaison à durée constante.
 *
 * Sur six chiffres le gain est théorique, mais un comparateur qui s'arrête au
 * premier écart n'a aucune raison d'être employé ici.
 */
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export interface OtpauthInput {
  secret: string;
  /** Ce que l'application affichera dans sa liste : l'adresse du salarié. */
  account: string;
  issuer: string;
}

/**
 * URI `otpauth://` que lit une application d'authentification.
 *
 * L'émetteur est répété dans le chemin **et** en paramètre : les applications
 * n'ont jamais convergé sur l'une des deux formes, et n'en fournir qu'une donne
 * des entrées mal nommées chez la moitié des utilisateurs.
 */
export function otpauthUri({ secret, account, issuer }: OtpauthInput): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const parameters = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${parameters.toString()}`;
}

/** Groupes de quatre — un secret recopié à la main l'est sans erreur. */
export function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}
