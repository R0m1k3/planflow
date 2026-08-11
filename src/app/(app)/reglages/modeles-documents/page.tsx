import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import {
  AddTemplateForm,
  EditTemplateForm,
} from '@/app/(app)/reglages/modeles-documents/TemplateForms';
import { TEMPLATE_FIELDS } from '@/domain/documents/template';
import {
  archiveTemplateAction,
  listTemplates,
} from '@/server/settings/templates';

export const metadata = { title: 'Modèles de documents · PlanFlow' };
export const dynamic = 'force-dynamic';

const SCOPE_LABEL = {
  employee: 'Salarié',
  contract: 'Contrat',
  location: 'Établissement',
} as const;

export default async function ModelesDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string }>;
}) {
  const { archives } = await searchParams;
  const showArchived = archives === '1';
  const templates = await listTemplates(showArchived);
  const active = templates.filter((template) => template.archivedAt === null);

  return (
    <PageBody>
      <PageHeader
        title="Modèles de documents"
        subtitle={`${active.length} modèle${active.length > 1 ? 's' : ''} disponible${active.length > 1 ? 's' : ''}`}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader
              title="Modèles"
              action={
                <a
                  href={
                    showArchived
                      ? '/reglages/modeles-documents'
                      : '/reglages/modeles-documents?archives=1'
                  }
                  className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink-1"
                >
                  {showArchived ? 'Masquer les archivés' : 'Voir les archivés'}
                </a>
              }
            />

            {templates.length === 0 ? (
              <EmptyState
                title="Aucun modèle"
                description="Un modèle produit une attestation ou un courrier type en résolvant les variables du dossier."
              />
            ) : (
              <ul className="divide-y divide-line-1">
                {templates.map((template) => (
                  <li key={template.id} className="px-4 py-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        {template.name}
                      </span>
                      <Badge tone="neutral">
                        {template.documentCount} pièce
                        {template.documentCount > 1 ? 's' : ''}
                      </Badge>
                      {template.archivedAt ? (
                        <Badge tone="warn">Archivé</Badge>
                      ) : null}
                      <span className="flex-1" />
                      <form action={archiveTemplateAction}>
                        <input type="hidden" name="id" value={template.id} />
                        {template.archivedAt ? (
                          <input type="hidden" name="restore" value="1" />
                        ) : null}
                        <Button size="sm" variant="ghost" type="submit">
                          {template.archivedAt ? 'Rétablir' : 'Archiver'}
                        </Button>
                      </form>
                    </div>

                    {template.fields.length > 0 ? (
                      <ul className="mb-3 flex flex-wrap gap-1.5">
                        {template.fields.map((field) => (
                          <li key={field}>
                            <Badge tone="info">{field}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-3 text-xs text-ink-3">
                        Aucune variable : ce modèle produit toujours le même
                        texte.
                      </p>
                    )}

                    <details className="text-sm">
                      <summary className="cursor-pointer text-xs text-ink-2 underline underline-offset-2">
                        Modifier
                      </summary>
                      <div className="pt-3">
                        <EditTemplateForm
                          id={template.id}
                          name={template.name}
                          bodyHtml={template.bodyHtml}
                        />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Nouveau modèle" />
            <div className="p-4">
              <AddTemplateForm />
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-3">
          <Card>
            <CardHeader title="Variables disponibles" />
            <ul className="divide-y divide-line-1">
              {TEMPLATE_FIELDS.map((field) => (
                <li key={field.key} className="px-3 py-2">
                  <code className="text-xs text-ink-1">
                    {'{{'}
                    {field.key}
                    {'}}'}
                  </code>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-micro text-ink-3">{field.label}</span>
                    <Badge tone="neutral" subtle>
                      {SCOPE_LABEL[field.scope]}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <p className="text-xs leading-[var(--lh-prose)] text-ink-3">
            Les variables d’établissement se résolvent dans le contexte de
            l’établissement porté par le contrat du salarié : la même attestation
            ne porte pas la même raison sociale d’un magasin à l’autre.
          </p>
        </aside>
      </div>
    </PageBody>
  );
}
