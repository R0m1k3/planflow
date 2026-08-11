import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import {
  AddJobTitleForm,
  RenameJobTitleForm,
} from '@/app/(app)/reglages/emplois/JobTitleForms';
import {
  archiveJobTitleAction,
  listJobTitles,
} from '@/server/settings/job-titles';

export const metadata = { title: 'Emplois · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function EmploisPage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string }>;
}) {
  const { archives } = await searchParams;
  const showArchived = archives === '1';
  const titles = await listJobTitles(showArchived);
  const active = titles.filter((title) => title.archivedAt === null);

  return (
    <PageBody>
      <PageHeader
        title="Emplois"
        subtitle={`${active.length} emploi${active.length > 1 ? 's' : ''} en vigueur`}
      />

      <Card>
        <CardHeader
          title="Référentiel"
          badge={
            <Badge tone="neutral">
              {titles.length} affiché{titles.length > 1 ? 's' : ''}
            </Badge>
          }
          action={
            <a
              href={showArchived ? '/reglages/emplois' : '/reglages/emplois?archives=1'}
              className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink-1"
            >
              {showArchived ? 'Masquer les archivés' : 'Voir les archivés'}
            </a>
          }
        />

        {titles.length === 0 ? (
          <EmptyState
            title="Aucun emploi"
            description="Un contrat porte une qualification ; créez d’abord les emplois de l’organisation."
          />
        ) : (
          <ul className="divide-y divide-line-1">
            {titles.map((title) => (
              <li
                key={title.id}
                className="flex flex-wrap items-end gap-3 px-4 py-3"
              >
                <RenameJobTitleForm id={title.id} name={title.name} />

                <div className="flex items-center gap-2">
                  <Badge tone="neutral">
                    {title.contractCount} contrat
                    {title.contractCount > 1 ? 's' : ''}
                  </Badge>
                  {title.archivedAt ? <Badge tone="warn">Archivé</Badge> : null}
                </div>

                <form action={archiveJobTitleAction}>
                  <input type="hidden" name="id" value={title.id} />
                  {title.archivedAt ? (
                    <input type="hidden" name="restore" value="1" />
                  ) : null}
                  <Button size="sm" variant="ghost" type="submit">
                    {title.archivedAt ? 'Rétablir' : 'Archiver'}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Nouvel emploi" />
        <div className="p-4">
          <AddJobTitleForm />
        </div>
      </Card>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Un emploi porté par un contrat est archivé, jamais supprimé : le registre
        unique du personnel doit rester lisible pendant toute la durée de
        conservation, y compris pour un salarié parti.
      </p>
    </PageBody>
  );
}
