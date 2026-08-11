import { ProductivityForm } from '@/app/(app)/reglages/productivite/ProductivityForm';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { getPreferences } from '@/server/settings/account';

export const metadata = { title: 'Productivité · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function ProductivitePage() {
  const preferences = await getPreferences();
  const target = preferences.productivityTargetPerHour;

  return (
    <PageBody>
      <PageHeader
        title="Productivité"
        subtitle={
          target
            ? `${target} € de chiffre d’affaires par heure travaillée`
            : 'Aucun objectif fixé'
        }
      />

      <Card>
        <CardHeader
          title="Objectif global"
          badge={
            target ? null : <Badge tone="neutral">non fixé</Badge>
          }
        />
        <ProductivityForm target={target} />
      </Card>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        L’objectif vaut pour l’ensemble des établissements. Vider le champ
        l’efface plutôt que de le ramener à zéro : zéro serait un objectif
        inatteignable, l’absence de valeur dit qu’aucun objectif n’a été fixé.
      </p>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Un objectif de productivité rapporte un chiffre d’affaires à des heures
        planifiées. Il éclaire une décision d’organisation ; il ne mesure pas le
        travail d’une personne, et n’a pas à être opposé à un salarié.
      </p>
    </PageBody>
  );
}
