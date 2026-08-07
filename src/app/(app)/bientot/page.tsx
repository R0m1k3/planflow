import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { EmptyState } from '@/components/ui/Card';

export const metadata = { title: 'Écran à venir · PlanFlow' };

export default async function BientotPage({
  searchParams,
}: {
  searchParams: Promise<{ ecran?: string }>;
}) {
  const { ecran } = await searchParams;
  const label = ecran ?? 'Cet écran';

  return (
    <PageBody>
      <PageHeader title={label} subtitle="Nantes Atlantis" />
      <div className="rounded-3 border border-dashed border-line-2 bg-surface">
        <EmptyState
          title="Écran à venir"
          description={`« ${label} » fait partie du périmètre de PlanFlow mais n'est pas encore construit. L'entrée reste dans la navigation pour que celle-ci reflète le produit visé plutôt que son état d'avancement.`}
        />
      </div>
    </PageBody>
  );
}
