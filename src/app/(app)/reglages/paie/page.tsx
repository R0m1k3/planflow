import Link from 'next/link';

import { PreferenceBlock } from '@/components/settings/PreferenceForms';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { getPreferences } from '@/server/settings/account';

export const metadata = { title: 'Réglages de paie · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function ReglagesPaiePage() {
  const preferences = await getPreferences();

  return (
    <PageBody>
      <PageHeader
        title="Réglages de paie"
        subtitle="Décompte des heures et matricules"
      />

      <Card>
        <CardHeader title="Décompte" />
        <PreferenceBlock group="payroll" preferences={preferences} />
      </Card>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Ces trois réglages changent des chiffres, pas un affichage. Une période
        déjà verrouillée n’est pas recalculée : le changement vaut pour les
        périodes ouvertes, et les{' '}
        <Link href="/paie/periodes" className="underline">
          instantanés de paie
        </Link>{' '}
        antérieurs restent tels qu’ils ont été figés. C’est ce qui garde une paie
        de mars reproductible après une modification en juin.
      </p>
    </PageBody>
  );
}
