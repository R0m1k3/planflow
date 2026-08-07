import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ENTRIES, TILES, TODOS } from '@/lib/demo/apercu';

export const metadata = { title: 'Aperçu RH · PlanFlow' };

const TILE_SWATCH: Record<string, string> = {
  warn: 'bg-warn-soft border-warn',
  info: 'bg-info-soft border-info',
  accent: 'bg-accent-soft border-accent',
  danger: 'bg-danger-soft border-danger',
};

export default function ApercuPage() {
  return (
    <PageBody>
      <PageHeader
        title="Aperçu RH"
        subtitle="Vos tâches en cours sur Nantes Atlantis · lundi 10 août 2026"
        actions={
          <>
            <Button>Exporter</Button>
            <Button variant="primary">Nouvelle embauche</Button>
          </>
        }
      />

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(232px,1fr))]">
        {TILES.map((tile) => (
          <button
            key={tile.label}
            type="button"
            className="flex cursor-pointer items-center gap-3 rounded-3 border border-line-1 bg-surface px-4 py-3.5 text-left transition-[border-color,box-shadow] duration-[var(--d-1)] ease-organic hover:border-line-3 hover:shadow-e1"
          >
            <span
              aria-hidden
              className={`size-8 flex-none rounded-2 border ${TILE_SWATCH[tile.tone] ?? ''}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-ink-2">
                {tile.label}
              </span>
              <span className="tnum block text-xl leading-tight font-semibold">
                {tile.value}
              </span>
            </span>
            <span aria-hidden className="flex-none text-ink-3">
              ›
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
        <Card>
          <CardHeader
            title="Entrées à venir"
            badge={<Badge tone="accent">4</Badge>}
            action={
              <Button size="sm" variant="ghost">
                Voir tout
              </Button>
            }
          />
          <ul>
            {ENTRIES.map((entry) => (
              <li
                key={entry.name}
                className="flex items-center gap-3 border-b border-line-1 px-4 py-2.5 last:border-b-0 hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className="flex size-7 flex-none items-center justify-center rounded-full bg-surface-3 text-micro font-semibold text-ink-2"
                >
                  {entry.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {entry.name}
                  </span>
                  <span className="block truncate text-micro text-ink-3">
                    {entry.job}
                  </span>
                </span>
                <span className="tnum flex-none text-xs text-ink-2">
                  {entry.date}
                </span>
                <Badge tone={entry.tone}>{entry.state}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="À traiter cette semaine" />
          <ul>
            {TODOS.map((todo) => (
              <li
                key={todo.title}
                className="flex items-start gap-3 border-b border-line-1 px-4 py-3 last:border-b-0 hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className="mt-1.5 size-2 flex-none rounded-full"
                  style={{ background: todo.dot }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {todo.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-[var(--lh-prose)] text-ink-2">
                    {todo.detail}
                  </span>
                </span>
                <span className="tnum flex-none whitespace-nowrap text-micro text-ink-3">
                  {todo.when}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageBody>
  );
}
