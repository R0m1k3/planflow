import { MfaSettings } from '@/components/settings/MfaSettings';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { mfaRequired } from '@/domain/access/mfa-policy';
import { requireSession } from '@/server/context';

export const metadata = { title: 'Sécurité · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const session = await requireSession();
  const required = mfaRequired(session.actor.permissions);

  return (
    <PageBody>
      <PageHeader
        title="Sécurité"
        subtitle="Le second facteur protège votre compte, pas celui des autres : chacun gère le sien."
        actions={
          session.user.mfaEnrolled ? (
            <Badge tone="ok">Second facteur actif</Badge>
          ) : (
            <Badge tone={required ? 'danger' : 'warn'}>
              {required ? 'Exigé, non activé' : 'Non activé'}
            </Badge>
          )
        }
      />

      <Card>
        <CardHeader title="Second facteur" />
        <MfaSettings enrolled={session.user.mfaEnrolled} required={required} />
      </Card>
    </PageBody>
  );
}
