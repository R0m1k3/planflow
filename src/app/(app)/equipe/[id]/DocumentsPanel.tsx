'use client';

import { useActionState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ACCEPTED_MIME_TYPES,
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  formatBytes,
  MAX_DOCUMENT_BYTES,
  type DocumentCategory,
} from '@/domain/documents/rules';
import {
  deleteDocumentAction,
  uploadDocumentAction,
  type DocumentState,
} from '@/server/documents/actions';

const empty: DocumentState = {};
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export interface DocumentView {
  id: string;
  name: string;
  category: DocumentCategory;
  sizeBytes: number;
  isSensitive: boolean;
  retentionUntil: Date | null;
  uploadedAt: Date;
  href: string;
}

/**
 * Pièces du dossier.
 *
 * Les liens sont signés et expirent en quelques minutes : recharger la page en
 * fabrique de nouveaux. C'est voulu — un lien recopié dans un message cesse de
 * fonctionner de lui-même, sans attendre qu'une session expire.
 */
export function DocumentsPanel({
  membershipId,
  documents,
  canManage,
}: {
  membershipId: string;
  documents: DocumentView[];
  canManage: boolean;
}) {
  const [uploadState, upload, uploading] = useActionState(
    uploadDocumentAction,
    empty,
  );
  const [deleteState, remove] = useActionState(deleteDocumentAction, empty);

  return (
    <div className="flex flex-col gap-4 p-4">
      {documents.length === 0 ? (
        <p className="text-sm text-ink-3">
          Aucune pièce. Un dossier complet porte au minimum une pièce d’identité
          et un relevé d’identité bancaire.
        </p>
      ) : (
        <ul className="divide-y divide-line-1">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center gap-3 py-2 text-sm"
            >
              <a
                href={document.href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-ink-1 underline"
              >
                {document.name}
              </a>
              <Badge tone="neutral">{CATEGORY_LABELS[document.category]}</Badge>
              {document.isSensitive ? (
                // Le dire à l'écran : celui qui ouvre la pièce doit savoir que
                // sa consultation laisse une trace nominative.
                <Badge tone="warn">Santé · lecture journalisée</Badge>
              ) : null}
              <span className="tnum text-micro text-ink-3">
                {formatBytes(document.sizeBytes)}
              </span>
              <span className="tnum text-micro text-ink-3">
                déposée le {dateFormat.format(document.uploadedAt)}
              </span>
              <span className="flex-1" />
              {document.retentionUntil ? (
                <span className="tnum text-micro text-ink-3">
                  conservée jusqu’au {dateFormat.format(document.retentionUntil)}
                </span>
              ) : (
                <span className="text-micro text-ink-3">
                  échéance de conservation non fixée
                </span>
              )}
              {canManage ? (
                <form action={remove}>
                  <input
                    type="hidden"
                    name="documentId"
                    value={document.id}
                  />
                  <Button type="submit">Retirer</Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <form
          action={upload}
          className="flex flex-wrap items-end gap-3 border-t border-line-1 pt-4"
        >
          <input type="hidden" name="membershipId" value={membershipId} />

          <label className="flex flex-col gap-1">
            <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
              Catégorie
            </span>
            <select
              name="category"
              defaultValue="IDENTITY"
              className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
            >
              {DOCUMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
              Fichier
            </span>
            <input
              type="file"
              name="file"
              required
              accept={ACCEPTED_MIME_TYPES.join(',')}
              className="text-sm text-ink-2 file:mr-2 file:rounded-2 file:border file:border-line-2 file:bg-surface-2 file:px-2 file:py-1 file:text-sm"
            />
            <span className="text-micro text-ink-3">
              PDF ou image, {formatBytes(MAX_DOCUMENT_BYTES)} au plus. Chiffré au
              repos.
            </span>
          </label>

          <Button type="submit" variant="primary" disabled={uploading}>
            Déposer
          </Button>
        </form>
      ) : null}

      {uploadState.error ? (
        <p role="alert" className="text-xs text-danger">
          {uploadState.error}
        </p>
      ) : null}
      {uploadState.message ? (
        <p className="text-xs text-ok-soft-ink">{uploadState.message}</p>
      ) : null}
      {deleteState.error ? (
        <p role="alert" className="text-xs text-danger">
          {deleteState.error}
        </p>
      ) : null}
      {deleteState.message ? (
        <p className="text-xs text-ok-soft-ink">{deleteState.message}</p>
      ) : null}
    </div>
  );
}
