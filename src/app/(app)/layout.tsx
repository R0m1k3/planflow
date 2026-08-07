import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/shell/AppShell';
import { currentSession } from '@/server/auth/session';

/**
 * Toutes les routes applicatives passent par ici.
 *
 * Le contrôle est fait côté serveur, dans le layout, et non dans le proxy : le
 * proxy ne peut pas interroger la base pour vérifier qu'une session n'a pas été
 * révoquée, et c'est précisément la révocation qui justifie de tenir les
 * sessions en base (matrice n° 23).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session) redirect('/connexion');

  return (
    <AppShell
      initials={session.user.initials}
      fullName={`${session.user.firstName} ${session.user.lastName}`}
      roleName={session.roleName}
      accountName={session.accountName}
    >
      {children}
    </AppShell>
  );
}
