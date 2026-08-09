import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { MfaSettings } from '@/components/settings/MfaSettings';
import { AppShell } from '@/components/shell/AppShell';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { mfaRequired } from '@/domain/access/mfa-policy';
import { currentSession } from '@/server/auth/session';
import { isInstalled } from '@/server/install/state';

/**
 * Toutes les routes applicatives passent par ici.
 *
 * Le contrôle est fait côté serveur, dans le layout, et non dans le proxy : le
 * proxy ne peut pas interroger la base pour vérifier qu'une session n'a pas été
 * révoquée, et c'est précisément la révocation qui justifie de tenir les
 * sessions en base (matrice n° 23).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  // Avant même la session : sur une instance vierge, il n'y a pas de compte à
  // qui appartenir, et renvoyer vers la connexion ferait rebondir d'un écran à
  // l'autre sans jamais dire ce qui manque.
  if (!(await isInstalled())) redirect('/installation');

  const session = await currentSession();
  if (!session) redirect('/connexion');

  // Un rôle qui lit les rémunérations ou distribue les droits doit porter un
  // second facteur (matrice n° 15). L'obligation est tenue ici, au point de
  // passage de toutes les routes applicatives.
  //
  // L'écran d'enrôlement **remplace** le contenu au lieu de rediriger vers
  // lui : une redirection depuis un layout se joue aussi pendant la navigation
  // qui suit la connexion, et Next y répond par une page vide. Substituer le
  // contenu tient la même garantie sans dépendre du chemin demandé.
  const enrolmentDue =
    mfaRequired(session.actor.permissions) && !session.user.mfaEnrolled;

  return (
    <AppShell
      initials={session.user.initials}
      fullName={`${session.user.firstName} ${session.user.lastName}`}
      roleName={session.roleName}
      accountName={session.accountName}
    >
      {enrolmentDue ? <EnrolmentGate /> : children}
    </AppShell>
  );
}

function EnrolmentGate() {
  return (
    <PageBody>
      <PageHeader
        title="Sécurité"
        subtitle="Votre rôle donne accès aux rémunérations ou à la distribution des droits : un second facteur est exigé avant d’aller plus loin."
      />
      <Card>
        <CardHeader title="Second facteur" />
        <MfaSettings enrolled={false} required />
      </Card>
    </PageBody>
  );
}
