import { can } from '@/domain/access/authorize';
import type { DocumentCategory } from '@/domain/documents/rules';
import { query } from '@/server/context';
import { signedDocumentUrl } from '@/server/documents/links';

export interface DocumentRow {
  id: string;
  name: string;
  category: DocumentCategory;
  mimeType: string;
  sizeBytes: number;
  isSensitive: boolean;
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
        retentionUntil: true,
        uploadedAt: true,
      },
    });

    return {
      documents: rows.map((row) => ({
        ...row,
        category: row.category as DocumentCategory,
        href: signedDocumentUrl(row.id),
      })),
      canManage: can(actor, 'members.documents.manage'),
    };
  });
}
