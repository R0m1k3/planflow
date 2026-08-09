import { can } from '@/domain/access/authorize';
import type { DocumentCategory } from '@/domain/documents/rules';
import {
  dueAt,
  isComputable,
  resolvePolicy,
  type RetentionPolicyLike,
} from '@/domain/retention/policy';
import { query } from '@/server/context';
import { signedDocumentUrl } from '@/server/documents/links';

export interface DocumentRow {
  id: string;
  name: string;
  category: DocumentCategory;
  mimeType: string;
  sizeBytes: number;
  isSensitive: boolean;
  /**
   * Échéance **dérivée** de la politique en vigueur au dépôt, jamais stockée.
   * La colonne existe au schéma pour une échéance fixée à la main ; tant
   * qu'elle ne sert pas, deux sources de vérité vaudraient mieux qu'une seule
   * uniquement dans les rapports de bogue.
   */
  retentionUntil: Date | null;
  uploadedAt: Date;
  /** Lien signé, valable quelques minutes seulement. */
  href: string;
}

export interface DocumentList {
  documents: DocumentRow[];
  canManage: boolean;
}

/**
 * Pièces d'un salarié.
 *
 * Le lien signé est fabriqué à la lecture de la page, jamais stocké : sa durée
 * de vie se compte en minutes, et le conserver en base le rendrait aussi long
 * que la ligne qui le porte.
 */
export async function listDocuments(
  membershipId: string,
): Promise<DocumentList> {
  return query('members.documents.view', async (db, actor) => {
    const rows = await db.document.findMany({
      where: { membershipId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        mimeType: true,
        sizeBytes: true,
        isSensitive: true,
        uploadedAt: true,
      },
    });

    const policies =
      (await db.retentionPolicy.findMany()) as RetentionPolicyLike[];

    return {
      documents: rows.map((row) => {
        const policy = resolvePolicy(
          policies,
          [`Document:${row.category}`, 'Document'],
          row.uploadedAt,
        );

        return {
          ...row,
          category: row.category as DocumentCategory,
          retentionUntil:
            policy && isComputable(policy.startPoint)
              ? dueAt(row.uploadedAt, policy.durationMonths)
              : null,
          href: signedDocumentUrl(row.id),
        };
      }),
      canManage: can(actor, 'members.documents.manage'),
    };
  });
}
