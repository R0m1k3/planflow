import Link from 'next/link';

import { PrintButton } from '@/components/planning/PrintButton';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { formatMinutes } from '@/domain/counters/week';
import { monthOf, parseMonthParam } from '@/domain/planning/month';
import { cx } from '@/lib/cx';
import { getMonthBoard } from '@/server/planning/views';

export const metadata = { title: 'Planning · mois · PlanFlow' };

interface PageProps {
  searchParams: Promise<{ mois?: string; etablissement?: string }>;
}

/** Heures d'une journée, en compact : « 7,5 » plutôt que « 7 h 30 ». */
function compact(minutes: number): string {
  if (minutes === 0) return '';
  const hours = minutes / 60;
  return Number.isInteger(hours)
    ? String(hours)
    : hours.toFixed(1).replace('.', ',');
}

export default async function MoisPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = parseMonthParam(params.mois) ?? monthOf(new Date());
  const board = await getMonthBoard(month, params.etablissement);

  if (!board) {
    return (
      <PageBody>
        <PageHeader
          title="Planning · mois"
          subtitle="Aucun établissement n'est encore créé."
        />
      </PageBody>
    );
  }

  const href = (mois: string, etablissement = board.location.id) =>
    `/planning/mois?mois=${mois}&etablissement=${etablissement}`;
  const total = board.rows.reduce((sum, row) => sum + row.totalMinutes, 0);

  return (
    <PageBody>
      <PageHeader
        title={`Planning · ${board.label}`}
        subtitle={`${board.location.name} · ${formatMinutes(total)} planifiées sur le mois`}
        actions={
          <>
            <Link
              href={href(board.previousParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              ← Mois précédent
            </Link>
            <Link
              href={href(board.nextParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              Mois suivant →
            </Link>
            <PrintButton />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2" data-print="hide">
        {board.locations.map((location) => (
          <Link
            key={location.id}
            href={href(board.monthParam, location.id)}
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
      </div>

      <div className="overflow-x-auto rounded-3 border border-line-1 bg-surface">
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">
            Heures planifiées par salarié et par jour, {board.label}
          </caption>
          <thead>
            <tr className="border-b border-line-2 bg-surface-2">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-44 bg-surface-2 px-3 py-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase"
              >
                Salarié
              </th>
              {board.days.map((day) => (
                <th
                  key={day.isoDate}
                  scope="col"
                  className={cx(
                    'tnum w-8 px-1 py-2 text-center font-semibold',
                    day.weekend ? 'bg-surface-3 text-ink-2' : 'text-ink-1',
                  )}
                >
                  {day.day}
                </th>
              ))}
              <th
                scope="col"
                className="px-3 py-2 text-right text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {board.rows.map((row) => (
              <tr
                key={row.membershipId}
                className="border-b border-line-1 last:border-b-0"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-left text-sm font-medium text-ink-1"
                >
                  {row.name}
                  <span className="block text-micro font-normal text-ink-3">
                    {row.workedDays} jour{row.workedDays > 1 ? 's' : ''}{' '}
                    travaillé{row.workedDays > 1 ? 's' : ''}
                  </span>
                </th>
                {row.minutes.map((minutes, index) => {
                  const day = board.days[index];
                  return (
                    <td
                      key={day?.isoDate ?? index}
                      className={cx(
                        'tnum border-l border-line-1 px-1 py-1.5 text-center',
                        day?.weekend && 'bg-surface-2',
                        // Au-delà de 10 h, la journée mérite un regard : c'est
                        // la borne légale au-dessus de laquelle une dérogation
                        // devient nécessaire (le contrôle formel arrive avec le
                        // moteur de règles).
                        minutes > 600 && 'bg-warn-soft text-warn-soft-ink',
                      )}
                      title={
                        minutes > 0
                          ? `${formatMinutes(minutes)} le ${day?.day ?? ''}`
                          : undefined
                      }
                    >
                      {compact(minutes)}
                    </td>
                  );
                })}
                <td className="tnum border-l border-line-2 px-3 py-1.5 text-right font-semibold text-ink-1">
                  {formatMinutes(row.totalMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {board.rows.length === 0 ? (
        <p className="rounded-3 border border-line-1 bg-surface p-4 text-sm text-ink-2">
          Aucun salarié rattaché à une équipe de cet établissement.
        </p>
      ) : null}
    </PageBody>
  );
}
