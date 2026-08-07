import type { ScopedClient } from '@/server/tenant';

/**
 * Journal d'audit — PLAN.md §3.5 et matrice n° 22.
 *
 * Append-only, imposé par un trigger PostgreSQL. La preuve exige de pouvoir
 * reconstruire une décision telle qu'elle a été prise ; une piste que l'on peut
 * réécrire ne prouve rien.
 */

export interface AuditEntry {
  actorMembershipId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  /** Justification, obligatoire pour les opérations qui l'exigent. */
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Actions dont la matrice exige une justification explicite. */
const REASON_REQUIRED = new Set([
  'counter.adjust',
  'payroll.period.unlock',
  'payroll.period.delete',
  'planning.alert.acknowledge',
  'membership.delete',
]);

export async function recordAudit(
  db: ScopedClient,
  entry: AuditEntry,
): Promise<void> {
  if (REASON_REQUIRED.has(entry.action) && !entry.reason?.trim()) {
    // Refuser ici plutôt qu'accepter une entrée creuse : une justification
    // vide sur un ajustement de compteur ne vaut pas mieux que pas d'entrée,
    // et laisse croire que la traçabilité est en place.
    throw new Error(
      `L'action « ${entry.action} » exige une justification (matrice n° 21 et 22).`,
    );
  }

  await db.auditLog.create({
    data: {
      actorMembershipId: entry.actorMembershipId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: (entry.before ?? null) as never,
      after: (entry.after ?? null) as never,
      reason: entry.reason ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    } as never,
  });
}

/**
 * Retire des valeurs à ne jamais écrire au journal.
 *
 * Le journal se relit, s'exporte et se conserve longtemps : y déposer un IBAN
 * ou un mot de passe reviendrait à créer une seconde copie non chiffrée de ce
 * que l'on a pris soin de chiffrer ailleurs.
 */
const REDACTED = new Set([
  'passwordHash',
  'socialSecurityNumberEnc',
  'ibanEnc',
  'bicEnc',
  'mfaSecretEnc',
  'tokenHash',
]);

export function redact<T extends Record<string, unknown>>(
  value: T,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = REDACTED.has(key) ? '[masqué]' : entry;
  }
  return output;
}
