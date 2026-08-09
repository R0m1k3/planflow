'use server';

import { revalidatePath } from 'next/cache';

import { AuthorizationError } from '@/domain/access/authorize';
import {
  DOCUMENT_CATEGORIES,
  isSensitiveCategory,
  sanitiseFileName,
  uploadProblem,
  type DocumentCategory,
} from '@/domain/documents/rules';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
import { removeFile, storeFile } from '@/server/documents/storage';

/**
 * Dépôt et retrait de pièces.
 *
 * Le fichier est écrit sur disque **avant** la ligne en base : l'inverse
 * laisserait, en cas d'échec d'écriture, une entrée désignant un contenu
 * inexistant — une pièce fantôme dans un dossier RH est pire qu'une absence,
 * parce qu'elle se croit présente.
 */

export interface DocumentState {
  error?: string;
  ok?: boolean;
  message?: string;
}

export async function uploadDocumentAction(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const membershipId = String(formData.get('membershipId') ?? '');
  const rawCategory = String(formData.get('category') ?? '');
  const file = formData.get('file');

  if (!membershipId) return { error: 'Salarié introuvable.' };
  if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(rawCategory)) {
    return { error: 'Catégorie inconnue.' };
  }
  if (!(file instanceof File)) return { error: 'Aucun fichier déposé.' };

  const category = rawCategory as DocumentCategory;
  const name = sanitiseFileName(file.name);

  const problem = uploadProblem({
    name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if (problem) return { error: problem };

  const content = new Uint8Array(await file.arrayBuffer());
  // La taille annoncée par le navigateur n'engage personne : c'est celle du
  // contenu réellement reçu qui doit passer le contrôle.
  const received = uploadProblem({
    name,
    mimeType: file.type,
    sizeBytes: content.byteLength,
  });
  if (received) return { error: received };

  try {
    await mutate('members.documents.manage', async (db, actor) => {
      const membership = await db.membership.findUnique({
        where: { id: membershipId },
        select: { id: true },
      });
      if (!membership) throw new ValidationError('Salarié introuvable.');

      const stored = await storeFile(actor.accountId, content);

      await db.document.create({
        data: {
          membershipId,
          category,
          name,
          fileKey: stored.fileKey,
          mimeType: file.type,
          sizeBytes: stored.sizeBytes,
          checksum: stored.checksum,
          // Déduit de la catégorie, jamais saisi : laisser déclarer qu'un arrêt
          // de travail n'est pas sensible reviendrait à laisser désactiver la
          // journalisation de sa lecture.
          isSensitive: isSensitiveCategory(category),
          uploadedBy: actor.membershipId,
        } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'document.upload',
        entityType: 'Membership',
        entityId: membershipId,
        // Le nom du fichier suffit à la relecture ; son contenu n'a rien à
        // faire dans un journal.
        after: { name, category, sizeBytes: stored.sizeBytes },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de déposer une pièce.");
  }

  revalidatePath(`/equipe/${membershipId}`);
  return { ok: true, message: `« ${name} » déposé.` };
}

/**
 * Retire une pièce.
 *
 * Le contenu est effacé du disque ; la ligne reste, marquée supprimée. Le
 * dossier doit garder trace qu'une pièce a existé et qui l'a retirée — c'est le
 * contenu qui disparaît, pas l'événement.
 */
export async function deleteDocumentAction(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const documentId = String(formData.get('documentId') ?? '');
  if (!documentId) return { error: 'Pièce introuvable.' };

  let membershipId: string | null = null;

  try {
    await mutate('members.documents.manage', async (db, actor) => {
      const document = await db.document.findUnique({
        where: { id: documentId },
      });
      if (!document || document.deletedAt) {
        throw new ValidationError('Pièce introuvable.');
      }

      membershipId = document.membershipId;

      await db.document.update({
        where: { id: documentId },
        data: { deletedAt: new Date(), deletedBy: actor.membershipId } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'document.delete',
        entityType: 'Document',
        entityId: documentId,
        before: { name: document.name, category: document.category },
        after: { deleted: true },
      });

      await removeFile(document.fileKey);
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de retirer une pièce.");
  }

  if (membershipId) revalidatePath(`/equipe/${membershipId}`);
  return { ok: true, message: 'Pièce retirée.' };
}

class ValidationError extends Error {}

function toState(error: unknown, denied: string): DocumentState {
  if (error instanceof ValidationError) return { error: error.message };
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
