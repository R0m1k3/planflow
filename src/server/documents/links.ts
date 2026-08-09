import 'server-only';

import { createHmac } from 'node:crypto';

import { DOWNLOAD_LINK_TTL_SECONDS } from '@/domain/documents/rules';
import { env } from '@/lib/env';
import { safeEqual } from '@/server/crypto';

/**
 * Liens de téléchargement signés — PLAN.md §3.6.
 *
 * Le plan exige que les fichiers ne soient servis que par URL signée à durée
 * courte. La signature ne remplace pas le contrôle d'accès : la route
 * revérifie la session, la capacité et le périmètre. Elle s'y ajoute, pour
 * qu'un lien recopié ailleurs cesse de fonctionner de lui-même, sans attendre
 * qu'une session expire.
 */

function signature(documentId: string, expiresAt: number): string {
  return createHmac('sha256', Buffer.from(env.ENCRYPTION_KEY, 'base64'))
    .update(`${documentId}:${expiresAt}`)
    .digest('base64url');
}

export function signedDocumentUrl(documentId: string, nowMs = Date.now()): string {
  const expiresAt = Math.floor(nowMs / 1000) + DOWNLOAD_LINK_TTL_SECONDS;
  const parameters = new URLSearchParams({
    e: String(expiresAt),
    s: signature(documentId, expiresAt),
  });
  return `/documents/${documentId}?${parameters.toString()}`;
}

export type LinkCheck =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'invalid' };

export function checkSignature(
  documentId: string,
  rawExpiresAt: string | null,
  rawSignature: string | null,
  nowMs = Date.now(),
): LinkCheck {
  if (!rawExpiresAt || !rawSignature) return { ok: false, reason: 'invalid' };

  const expiresAt = Number(rawExpiresAt);
  if (!Number.isInteger(expiresAt)) return { ok: false, reason: 'invalid' };

  // La signature est éprouvée **avant** l'échéance : sans cela, on répondrait
  // « expiré » à un lien fabriqué, ce qui indiquerait qu'il aurait pu marcher.
  if (!safeEqual(signature(documentId, expiresAt), rawSignature)) {
    return { ok: false, reason: 'invalid' };
  }
  if (expiresAt * 1000 <= nowMs) return { ok: false, reason: 'expired' };

  return { ok: true };
}
