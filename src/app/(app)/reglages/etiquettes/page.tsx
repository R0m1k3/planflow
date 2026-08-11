import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import {
  AddLabelForm,
  EditLabelForm,
} from '@/app/(app)/reglages/etiquettes/LabelForms';
import { isPosteCode, posteTokens } from '@/lib/design/postes';
import { archiveLabelAction, listLabels } from '@/server/settings/labels';

export const metadata = { title: 'Étiquettes · PlanFlow' };
export const dynamic = 'force-dynamic';

function Swatch({ paletteKey, code }: { paletteKey: string; code: string }) {
  if (!isPosteCode(paletteKey)) {
    return <Badge tone="warn">teinte inconnue</Badge>;
  }
  const tokens = posteTokens(paletteKey);
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center rounded-2 border px-2 text-micro font-semibold"
      style={{
        background: tokens.bg,
        color: tokens.fg,
        borderColor: tokens.edge,
      }}
    >
      {code.toUpperCase()}
    </span>
  );
}

export default async function EtiquettesPage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string }>;
}) {
  const { archives } = await searchParams;
  const showArchived = archives === '1';
  const labels = await listLabels(showArchived);
  const active = labels.filter((label) => label.archivedAt === null);

  return (
    <PageBody>
      <PageHeader
        title="Étiquettes"
        subtitle={`${active.length} étiquette${active.length > 1 ? 's' : ''} en vigueur`}
      />

      <Card>
        <CardHeader
          title="Postes de la grille"
          action={
            <a
              href={
                showArchived
                  ? '/reglages/etiquettes'
                  : '/reglages/etiquettes?archives=1'
              }
              className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink-1"
            >
              {showArchived ? 'Masquer les archivées' : 'Voir les archivées'}
            </a>
          }
        />

        {labels.length === 0 ? (
          <EmptyState
            title="Aucune étiquette"
            description="Une étiquette colore le créneau et nomme le poste tenu. Créez-en une pour commencer."
          />
        ) : (
          <ul className="divide-y divide-line-1">
            {labels.map((label) => (
              <li
                key={label.id}
                className="flex flex-wrap items-end gap-3 px-4 py-3"
              >
                <Swatch paletteKey={label.paletteKey} code={label.code} />

                <EditLabelForm
                  id={label.id}
                  name={label.name}
                  paletteKey={label.paletteKey}
                />

                <div className="flex items-center gap-2">
                  <Badge tone="neutral">
                    {label.shiftCount} créneau{label.shiftCount > 1 ? 'x' : ''}
                  </Badge>
                  {label.archivedAt ? <Badge tone="warn">Archivée</Badge> : null}
                </div>

                <form action={archiveLabelAction}>
                  <input type="hidden" name="id" value={label.id} />
                  {label.archivedAt ? (
                    <input type="hidden" name="restore" value="1" />
                  ) : null}
                  <Button size="sm" variant="ghost" type="submit">
                    {label.archivedAt ? 'Rétablir' : 'Archiver'}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Nouvelle étiquette" />
        <div className="p-4">
          <AddLabelForm />
        </div>
      </Card>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Les douze teintes viennent d’une palette calculée pour rester
        distinguables en vision daltonienne et à l’impression en noir et blanc.
        C’est pourquoi le code du poste s’affiche toujours avec la couleur, et
        pourquoi la teinte se choisit dans la liste plutôt qu’à la pipette.
      </p>
    </PageBody>
  );
}
