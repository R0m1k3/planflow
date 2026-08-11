import { permanentRedirect } from 'next/navigation';

/**
 * Ancienne adresse du calendrier des absences.
 *
 * Les absences vivent désormais sous `/absences`, avec une route par état
 * (§9). Le calendrier a déménagé plutôt que d'être dupliqué : deux écrans
 * lisant le même modèle finissent toujours par diverger d'une correction.
 *
 * La redirection est **permanente** et conserve le mois demandé : un lien de
 * planning partagé dans un message continue d'ouvrir la bonne page.
 */
export default async function CongesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { mois } = await searchParams;
  permanentRedirect(
    mois ? `/absences/calendrier?mois=${mois}` : '/absences/calendrier',
  );
}
