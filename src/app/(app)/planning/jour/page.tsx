import Link from 'next/link';

import { DayTimeline } from '@/components/planning/DayTimeline';
import { PrintButton } from '@/components/planning/PrintButton';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { getDayBoard } from '@/server/planning/queries';

export const metadata = { title: 'Planning · jour · PlanFlow' };

interface PageProps {
  searchParams: Promise<{ jour?: string; etablissement?: string }>;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function JourPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isoDate =
    params.jour && ISO_DATE.test(params.jour)
      ? params.jour
      : new Date().toISOString().slice(0, 10);

  const board = await getDayBoard(isoDate, params.etablissement);

  if (!board) {
    return (
      <PageBody>
        <PageHeader
          title="Planning · jour"
          subtitle="Aucun établissement n'est encore créé."
        />
      </PageBody>
    );
  }

  const href = (jour: string, etablissement = board.location.id) =>
    `/planning/jour?jour=${jour}&etablissement=${etablissement}`;
  const present = board.lanes.filter((lane) => !lane.unassigned).length;
  const open = board.lanes.find((lane) => lane.unassigned)?.shifts.length ?? 0;

  return (
    <PageBody>
      <PageHeader
        title={`Planning · ${board.label}`}
        subtitle={`${board.location.name} · amplitude ${String(board.fromHour).padStart(2, '0')}:00 – ${String(board.toHour % 24).padStart(2, '0')}:00`}
        actions={
          <>
            <Link
              href={href(board.previousDate)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              ← Jour précédent
            </Link>
            <Link
              href={href(board.nextDate)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              Jour suivant →
            </Link>
            <PrintButton label="Imprimer la journée" />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {board.locations.map((location) => (
          <Link
            key={location.id}
            href={href(board.isoDate, location.id)}
            aria-current={
              location.id === board.location.id ? 'page' : undefined
            }
            className={
              location.id === board.location.id
                ? 'rounded-2 border border-accent bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-ink'
                : 'rounded-2 border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2'
            }
          >
            {location.name}
          </Link>
        ))}
        <Badge tone="accent">
          {present} salarié{present > 1 ? 's' : ''} présent
          {present > 1 ? 's' : ''}
        </Badge>
        {open > 0 ? (
          <Badge tone="warn">
            {open} besoin{open > 1 ? 's' : ''} non couvert{open > 1 ? 's' : ''}
          </Badge>
        ) : null}
      </div>

      {board.lanes.length === 0 ? (
        <p className="rounded-3 border border-line-1 bg-surface p-4 text-sm text-ink-2">
          Personne n’est planifié ce jour-là.
        </p>
      ) : (
        <DayTimeline
          lanes={board.lanes}
          fromHour={board.fromHour}
          toHour={board.toHour}
        />
      )}
    </PageBody>
  );
}
