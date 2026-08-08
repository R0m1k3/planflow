import 'server-only';

import { randomBytes } from 'node:crypto';

import {
  base32Encode,
  otpauthUri,
  verifyTotp,
} from '@/domain/access/totp';
import { decrypt, encrypt, generateToken, hashToken } from '@/server/crypto';
import { unscoped } from '@/server/tenant';

/**
 * Second facteur — matrice n° 15.
 *
 * Le secret est chiffré au repos avec la même clé que le NIR et l'IBAN, hors
 * base : une sauvegarde volée ne doit pas permettre de fabriquer les codes.
 */

/** 20 octets — la taille recommandée par la RFC 4226 pour HMAC-SHA1. */
const SECRET_BYTES = 20;

/**
 * Dix codes de secours.
 *
 * Assez pour qu'un téléphone perdu ne ferme pas l'accès, assez peu pour qu'ils
 * tiennent sur une feuille qu'on range. Ils sont conservés hachés : les relire
 * est impossible, en régénérer est la seule voie.
 */
const RECOVERY_CODE_COUNT = 10;

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(SECRET_BYTES));
}

export interface EnrolmentOffer {
  secret: string;
  uri: string;
}

export function enrolmentOffer(email: string, issuer: string): EnrolmentOffer {
  const secret = generateTotpSecret();
  return { secret, uri: otpauthUri({ secret, account: email, issuer }) };
}

/**
 * Confirme un enrôlement.
 *
 * Le secret n'est enregistré **qu'après** qu'un code en a été tiré : enregistrer
 * d'abord laisserait des comptes porteurs d'un facteur que leur détenteur ne
 * sait pas produire — c'est-à-dire des comptes fermés.
 */
export async function confirmEnrolment(
  userId: string,
  secret: string,
  code: string,
): Promise<{ ok: boolean; recoveryCodes?: string[]; error?: string }> {
  const verified = verifyTotp(secret, code, Date.now());
  if (!verified.ok) {
    return {
      ok: false,
      error:
        'Ce code ne correspond pas. Vérifiez l’heure de votre téléphone, puis réessayez avec le code affiché.',
    };
  }

  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    formatRecoveryCode(generateToken()),
  );

  const db = unscoped();
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        // `Uint8Array` et non `Buffer` : c'est ce qu'attend Prisma 7 pour Bytes.
        mfaSecretEnc: new Uint8Array(encrypt(secret)),
        mfaEnrolledAt: new Date(),
        mfaLastStep: verified.step ?? null,
      },
    }),
    // Un renouvellement remplace les anciens : garder les deux séries
    // doublerait les portes sans que personne ne sache lesquelles courent.
    db.mfaRecoveryCode.deleteMany({ where: { userId } }),
    db.mfaRecoveryCode.createMany({
      data: codes.map((code) => ({ userId, codeHash: hashToken(code) })),
    }),
  ]);

  return { ok: true, recoveryCodes: codes };
}

export async function disableMfa(userId: string): Promise<void> {
  const db = unscoped();
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { mfaSecretEnc: null, mfaEnrolledAt: null, mfaLastStep: null },
    }),
    db.mfaRecoveryCode.deleteMany({ where: { userId } }),
  ]);
}

export type ChallengeResult =
  | { ok: true; usedRecoveryCode: boolean; remainingCodes: number }
  | { ok: false; error: string };

/**
 * Éprouve un code, temporel ou de secours.
 *
 * Les deux entrent par le même champ : demander à quelqu'un qui a perdu son
 * téléphone de trouver d'abord le bon formulaire ajoute une étape au moment
 * précis où il est déjà en difficulté.
 */
export async function answerChallenge(
  userId: string,
  code: string,
): Promise<ChallengeResult> {
  const db = unscoped();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { mfaSecretEnc: true, mfaLastStep: true },
  });

  if (!user?.mfaSecretEnc) {
    return { ok: false, error: 'Aucun second facteur n’est enregistré.' };
  }

  const cleaned = code.replace(/\s/g, '');
  const verified = verifyTotp(
    decrypt(user.mfaSecretEnc),
    cleaned,
    Date.now(),
    user.mfaLastStep,
  );

  if (verified.ok) {
    await db.user.update({
      where: { id: userId },
      data: { mfaLastStep: verified.step ?? null },
    });
    const remaining = await db.mfaRecoveryCode.count({
      where: { userId, usedAt: null },
    });
    return { ok: true, usedRecoveryCode: false, remainingCodes: remaining };
  }

  // Un code de secours ne s'use qu'une fois. La condition `usedAt: null` est
  // portée par la mise à jour elle-même : deux envois simultanés du même code
  // ne peuvent pas en consommer deux fois la valeur.
  const consumed = await db.mfaRecoveryCode.updateMany({
    where: { userId, codeHash: hashToken(cleaned.toLowerCase()), usedAt: null },
    data: { usedAt: new Date() },
  });

  if (consumed.count === 1) {
    const remaining = await db.mfaRecoveryCode.count({
      where: { userId, usedAt: null },
    });
    return { ok: true, usedRecoveryCode: true, remainingCodes: remaining };
  }

  return {
    ok: false,
    error: 'Code refusé. Utilisez le code affiché maintenant, ou un code de secours.',
  };
}

/** Format lisible, en minuscules : un code de secours se recopie à la main. */
function formatRecoveryCode(token: string): string {
  const compact = token.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 16);
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}`;
}
