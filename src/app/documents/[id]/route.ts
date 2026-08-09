import { NextResponse, type NextRequest } from 'next/server';

import { asciiFileName, sanitiseFileName } from '@/domain/documents/rules';
import { recordAudit } from '@/server/audit';
import { query } from '@/server/context';
import { checkSignature } from '@/server/documents/links';
import { readFileByKey } from '@/server/documents/storage';

/**
 * Téléchargement d'une pièce — PLAN.md §3.6.
 *
 * Trois conditions, toutes nécessaires : une signature valide et non expirée,
 * une session, et la capacité de lire les documents. La signature seule ne
 * suffit pas — un lien recopié dans un message ne doit rien ouvrir à qui n'a
 * pas le droit de lire le dossier.
 *
 * La lecture d'une pièce de santé est journalisée, comme l'exige le plan pour
 * toute donnée de catégorie particulière.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const parameters = request.nextUrl.searchParams;

  const link = checkSignature(id, parameters.get('e'), parameters.get('s'));
  if (!link.ok) {
    return NextResponse.json(
      {
        error:
          link.reason === 'expired'
            ? 'Ce lien a expiré. Rouvrez le dossier pour en obtenir un nouveau.'
            : 'Lien invalide.',
      },
      { status: link.reason === 'expired' ? 410 : 400 },
    );
  }

  // `query` impose la session et la capacité avant d'ouvrir la transaction, et
  // le client scopé ne voit que les documents du compte courant.
  const found = await query('members.documents.view', async (db, actor) => {
    const document = await db.document.findUnique({ where: { id } });
    if (!document || document.deletedAt) return null;

    if (document.isSensitive) {
      // Journalisée **avant** la lecture : une consultation qui échouerait
      // après coup a tout de même eu lieu du point de vue de l'accès.
      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'document.sensitive.read',
        entityType: 'Document',
        entityId: document.id,
        after: {
          category: document.category,
          membershipId: document.membershipId,
        },
      });
    }

    return document;
  });

  if (!found) {
    return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
  }

  const file = await readFileByKey(found.fileKey, found.checksum);
  if (!file.intact) {
    // Servir un contenu qui ne correspond plus à son empreinte reviendrait à
    // présenter comme authentique une pièce altérée.
    return NextResponse.json(
      { error: 'Le fichier stocké ne correspond plus à son empreinte.' },
      { status: 409 },
    );
  }

  const name = sanitiseFileName(found.name);
  return new NextResponse(new Uint8Array(file.content), {
    headers: {
      'content-type': found.mimeType,
      'content-length': String(file.content.byteLength),
      // `inline` laisse le navigateur afficher un PDF ou une image sans
      // téléchargement ; le nom accentué passe par `filename*`, le repli ASCII
      // sert aux clients qui ne lisent que `filename`.
      'content-disposition': `inline; filename="${asciiFileName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      // Une pièce de dossier RH n'a rien à faire dans un cache partagé.
      'cache-control': 'private, no-store',
    },
  });
}
