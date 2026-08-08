import Link from 'next/link';

import { PrintButton } from '@/components/planning/PrintButton';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { formatMinutes } from '@/domain/counters/week';
import { isoWeekOf, parseWeekParam } from '@/domain/planning/week';
import { posteShort, posteTokens } from '@/lib/design/postes';
import { cx } from '@/lib/cx';
import { getLabelBoard } from '@/server/planning/views';

export const metadata = { title: 'Planning · étiquettes · PlanFlow' };

interface PageProps {
  searchParams: Promise<{ semaine?: string; etablissement?: string }>;
}

export default async function EtiquettesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const week = parseWeekParam(params.semaine) ?? isoWeekOf(new Date());
  const board = await getLabelBoard(week, params.etablissement);

  if (!board) {
    return (
      <PageBody>
        <PageHeader
          title="Planning · par poste"
          subtitle="Aucun établissement n'est encore créé."
        />
      </PageBody>
    );
  }

  const href = (semaine: string, etablissement = board.location.id) =>
    `/planning/etiquettes?semaine=${semaine}&etablissement=${etablissement}`;

  return (
    <PageBody>
      <PageHeader
        title={`Planning · par poste · semaine ${week.isoWeek}`}
        subtitle={`${board.location.name} · ${board.label.split('·')[1]?.trim()}`}
        actions={
          <>
            <Link
              href={href(board.previousParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              ← Semaine précédente
            </Link>
            <Link
              href={href(board.nextParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              Semaine suivante →
            </Link>
            <PrintButton />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2" data-print="hide">
        {board.locations.map((location) => (
          <Link
            key={location.id}
            href={href(board.weekParam, location.id)}
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
        <Link
          href={`/planning/semaine?semaine=${board.weekParam}&etablissement=${board.location.id}`}
          className="rounded-2 border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2"
        >
          Voir par salarié →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3 border border-line-1 bg-surface">
        <div className="min-w-[1040px]">
          <div className="sticky top-0 z-20 flex border-b border-line-2 bg-surface-2">
            <div className="w-56 flex-none border-r border-line-1 px-3 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
              Poste
            </div>
            <div className="grid flex-1 grid-cols-7">
              {board.headings.map((day, index) => (
                <div
                  key={day}
                  className={cx(
                    'border-r border-line-1 px-2 py-2 text-center text-xs font-semibold last:border-r-0',
                    index > 4 ? 'bg-surface-3 text-ink-2' : 'text-ink-1',
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>

          {board.rows.map((row) => {
            const tokens = posteTokens(row.poste);
            return (
              <div
                key={row.labelId}
                className="flex border-b border-line-1 last:border-b-0"
              >
                <div className="flex w-56 flex-none items-center gap-2 border-r border-line-1 px-3 py-2">
                  <span
                    className="flex-none rounded-1 px-1.5 py-0.5 text-micro font-semibold tracking-wide"
                    style={{
                      background: tokens.bg,
                      color: tokens.fg,
                      border: `1px solid ${tokens.edge}`,
                    }}
                  >
                    {posteShort(row.poste)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink-1">
                      {row.name}
                    </span>
                    <span className="tnum block text-micro text-ink-3">
                      {formatMinutes(row.minutes)} sur la semaine
                    </span>
                  </span>
                </div>

                <div className="grid flex-1 grid-cols-7">
                  {board.headings.map((day, index) => (
                    <div
                      key={day}
                      className={cx(
                        'flex min-h-[var(--row-h)] flex-col gap-1 border-r border-line-1 p-1 last:border-r-0',
                        index > 4 && 'bg-surface-2',
                      )}
                    >
                      {(row.days[index] ?? []).map((entry) => (
                        <span
                          key={entry.id}
                          className={cx(
                            'flex min-w-0 flex-col rounded-2 px-1.5 py-1 text-micro',
                            entry.unassigned &&
                              'border border-dashed border-line-3 text-ink-3',
                          )}
                          style={
                            entry.unassigned
                              ? undefined
                              : {
                                  background: tokens.bg,
                                  color: tokens.fg,
                                }
                          }
                        >
                          <span className="tnum">{entry.time}</span>
                          <span className="truncate opacity-90">
                            {entry.who}
                          </span>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageBody>
  );
}
