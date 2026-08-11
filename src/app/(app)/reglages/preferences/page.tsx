import { PreferenceBlock } from '@/components/settings/PreferenceForms';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { getPreferences } from '@/server/settings/account';

export const metadata = { title: 'Préférences · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function PreferencesPage() {
  const preferences = await getPreferences();

  return (
    <PageBody>
      <PageHeader
        title="Préférences"
        subtitle="Comportement des plannings et droits ouverts aux salariés"
      />

      <Card>
        <CardHeader title="Plannings" />
        <PreferenceBlock
          group="planning"
          preferences={preferences}
          withEveningTime
        />
      </Card>

      <Card>
        <CardHeader title="Droits" />
        <PreferenceBlock group="rights" preferences={preferences} />
      </Card>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Ces réglages valent pour tout le compte. Ils s’ajoutent aux capacités des
        rôles sans les remplacer : ouvrir un droit ici ne donne rien à qui n’a
        pas la capacité correspondante, et le fermer la retire à tout le monde.
      </p>
    </PageBody>
  );
}
