import 'server-only';

import {
  purgeVerdict,
  resolvePolicy,
  type PurgeVerdict,
  type RetentionPolicyLike,
} from '@/domain/retention/policy';
import { recordAudit } from '@/server/audit';
import { removeFile } from '@/server/documents/storage';
import type { ScopedClient } from '@/server/tenant';

/**
 * Purge des pièces échues — PLAN.md §12.5.
 *
 * La purge ne s'applique qu'aux objets pour lesquels une politique a été
 * **déclarée**. Le reste se conserve, et l'écran l'annonce : effacer faute de
 * règle serait aussi fautif que garder indéfiniment.
 *
 * Les tables append-only en sont exclues par construction — un déclencheur
 * PostgreSQL refuse d'y supprimer. C'est voulu : le journal d'audit doit
 * survivre à la purge des données qu'il décrit, sans quoi on ne pourrait plus
 * démontrer que la purge a eu lieu.
 */

export interface PurgeCandidate {
  id: string;
  name: string;
  category: string;
  uploadedAt: Date;
  verdict: PurgeVerdict;
  dueVia: string | null;
}

export interface PurgeReport {
  candidates: PurgeCandidate[];
  purged: number;
}

function policiesFor(category: string): string[] {
  return [`Document:${category}`, 'Document'];
}

/**
 * Inventaire, sans rien effacer.
 *
 * Un état des lieux consultable est ce qui rend la purge vérifiable plutôt que
 * confiante : on doit pouvoir dire, avant de l'exécuter, ce qu'elle emportera.
 */
export async function inspectRetention(
  db: ScopedClient,
  now = new Date(),
): Promise<PurgeCandidate[]> {
  const policies = (await db.retentionPolicy.findMany()) as RetentionPolicyLike[];
  const documents = await db.document.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      category: true,
      uploadedAt: true,
      retentionUntil: true,
    },
    orderBy: { uploadedAt: 'asc' },
  });

  return documents.map((document) => {
    const policy = resolvePolicy(
      policies,
      policiesFor(document.category),
      document.uploadedAt,
    );

    return {
      id: document.id,
      name: document.name,
      category: document.category,
      uploadedAt: document.uploadedAt,
      verdict: purgeVerdict({
        policy,
        anchor: document.uploadedAt,
        now,
      }),
      dueVia: policy?.objectType ?? null,
    };
  });
}

/**
 * Exécute la purge.
 *
 * Le contenu disparaît ; la ligne reste, marquée supprimée, et une entrée
 * d'audit dit pourquoi. Une purge silencieuse serait indistinguable d'une
 * perte de données.
 */
export async function runRetentionPurge(
  db: ScopedClient,
  actorMembershipId: string,
  now = new Date(),
): Promise<PurgeReport> {
  const candidates = await inspectRetention(db, now);
  const due = candidates.filter((candidate) => candidate.verdict === 'DUE');

  for (const candidate of due) {
    const document = await db.document.findUnique({
      where: { id: candidate.id },
      select: { fileKey: true, name: true, category: true },
    });
    if (!document) continue;

    await db.document.update({
      where: { id: candidate.id },
      data: { deletedAt: now, deletedBy: 'retention' } as never,
    });

    await recordAudit(db, {
      actorMembershipId,
      action: 'document.purge',
      entityType: 'Document',
      entityId: candidate.id,
      before: { name: document.name, category: document.category },
      after: { purgedBy: 'retention', policy: candidate.dueVia },
    });

    await removeFile(document.fileKey);
  }

  return { candidates, purged: due.length };
}
