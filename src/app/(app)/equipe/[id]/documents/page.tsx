import { notFound } from 'next/navigation';

import { DocumentsPanel } from '@/app/(app)/equipe/[id]/DocumentsPanel';
import { InvitationPanel } from '@/app/(app)/equipe/[id]/InvitationPanel';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { listDocuments } from '@/server/documents/queries';
import { getEmployee } from '@/server/employees/queries';

export const dynamic = 'force-dynamic';

export default async function DocumentsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  // `members.documents.view` peut manquer là où `members.view` est accordée :
  // la section disparaît alors, plutôt que d'échouer sur toute la page.
  const documents = await listDocuments(id).catch(() => null);

  return (
    <div className="flex flex-col gap-5">
      {documents ? (
        <Card>
          <CardHeader
            title="Pièces du dossier"
            badge={<Badge tone="neutral">{documents.documents.length}</Badge>}
          />
          <DocumentsPanel
            membershipId={employee.id}
            documents={documents.documents}
            canManage={documents.canManage}
          />
        </Card>
      ) : (
        <EmptyState
          title="Documents non consultables"
          description="Votre rôle ne donne pas accès aux pièces du dossier."
        />
      )}

      {employee.canInvite ? (
        <Card>
          <CardHeader title="Accès à l’application" />
          <InvitationPanel
            membershipId={employee.id}
            defaultEmail={employee.email ?? employee.profile?.personalEmail ?? ''}
            hasAccount={employee.hasAccount}
            invitation={employee.invitation}
          />
        </Card>
      ) : null}
    </div>
  );
}
