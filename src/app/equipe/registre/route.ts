import { NextResponse, type NextRequest } from 'next/server';

import { asciiFileName, sanitiseFileName } from '@/domain/documents/rules';
import { recordAudit } from '@/server/audit';
import { query } from '@/server/context';
import { getRegisterData } from '@/server/employees/rup';
import { renderRegisterPdf } from '@/server/employees/rup-pdf';

/**
 * Téléchargement du registre unique du personnel.
 *
 * Une route et non une action : le document est un fichier, pas un écran, et
 * son édition doit pouvoir être rejouée par une simple adresse — c'est aussi
 * ce qui permet de la présenter depuis un poste d'inspection.
 *
 * L'édition est journalisée. Le registre rassemble l'identité, la nationalité
 * et le parcours de tout le personnel d'un établissement : savoir qui l'a
 * extrait, et quand, fait partie de ce qu'on doit pouvoir répondre.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const locationId = request.nextUrl.searchParams.get('etablissement');
  if (!locationId) {
    return NextResponse.json(
      { error: 'Choisissez un établissement.' },
      { status: 400 },
    );
  }

  const data = await getRegisterData(locationId);
  if (!data) {
    return NextResponse.json(
      { error: 'Établissement introuvable.' },
      { status: 404 },
    );
  }

  await query('members.register.export', async (db, actor) =>
    recordAudit(db, {
      actorMembershipId: actor.membershipId,
      action: 'members.register.export',
      entityType: 'Location',
      entityId: data.locationId,
      after: { lines: data.people.length, incomplete: data.incomplete },
    }),
  );

  const pdf = await renderRegisterPdf(data);
  const stamp = new Date().toISOString().slice(0, 10).split('-').reverse().join('_');
  const name = sanitiseFileName(`RUP - ${data.locationName} - ${stamp}.pdf`);

  return new NextResponse(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${asciiFileName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      // Un registre se lit à l'instant où il est demandé : le mettre en cache
      // ferait présenter un effectif périmé au contrôle suivant.
      'Cache-Control': 'no-store',
    },
  });
}
