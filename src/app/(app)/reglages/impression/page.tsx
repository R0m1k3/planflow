import Link from 'next/link';

import { PrintForm } from '@/app/(app)/reglages/impression/PrintForm';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { getPreferences } from '@/server/settings/account';

export const metadata = { title: 'Impression · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function ImpressionReglagesPage() {
  const preferences = await getPreferences();

  return (
    <PageBody>
      <PageHeader
        title="Impression"
        subtitle="Mise en page du planning affiché en salle"
      />

      <Card>
        <CardHeader title="Planning imprimé" />
        <PrintForm preferences={preferences} />
      </Card>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Ces réglages gouvernent{' '}
        <Link href="/planning/impression" className="underline">
          le planning à afficher
        </Link>
        . Le rendu passe par la boîte d’impression du navigateur, qui sait aussi
        enregistrer en PDF : un second moteur de rendu serait un second endroit
        où la feuille peut diverger de l’écran.
      </p>
    </PageBody>
  );
}
