import Link from 'next/link';

import { CancelButton, DecisionButtons } from '@/components/absences/DecisionButtons';
import { RequestForm } from '@/components/absences/RequestForm';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge, type Tone } from '@/components/ui/Badge';
import { datesBetween, isoWeekday } from '@/domain/absences/count';
import { monthOf, parseMonthParam } from '@/domain/planning/month';
import { cx } from '@/lib/cx';
import { getAbsenceBoard, statusLabel } from '@/server/absences/queries';

export const metadata = { title: 'Calendrier des absences · PlanFlow' };

interface PageProps {
  searchParams: Promise<{ mois?: string }>;
}

const COUNTER_LABELS: Record<string, string> = {
  PAID_LEAVE: 'Congés payés',
  RTT: 'RTT',
  COMPENSATORY_REST: 'Repos compensateur',
  MODULATION: 'Modulation',
  OVERTIME: 'Heures supplémentaires',
};

const STATUS_TONES: Record<string, Tone> = {
  PENDING: 'warn',
  ACCEPTED: 'ok',
  DECLINED: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
};

export default async function CongesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = parseMonthParam(params.mois) ?? monthOf(new Date());
  const board = await getAbsenceBoard(month);

  const href = (mois: string) => `/conges?mois=${mois}`;

  return (
    <PageBody>
      <PageHeader
        title="Calendrier des absences"
        subtitle={`${board.label} · ${board.inMonth.length} absence${board.inMonth.length > 1 ? 's' : ''} sur le mois`}
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
          </>
        }
      />

      <RequestForm
        absenceTypes={board.absenceTypes}
        people={board.people}
        ownMembershipId={board.ownMembershipId}
      />

      <section id="attente" className="rounded-3 border border-line-1 bg-surface">
        <h2 className="border-b border-line-1 px-4 py-2 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
          Demandes en attente
          {board.pending.length > 0 ? ` · ${board.pending.length}` : ''}
        </h2>

        {board.pending.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-3">
            Aucune demande à traiter.
          </p>
        ) : (
          <ul className="divide-y divide-line-1">
            {board.pending.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-56 flex-1">
                  <p className="text-sm font-medium text-ink-1">
                    {request.name} · {request.typeLabel}
                  </p>
                  <p className="text-micro text-ink-3">
                    du {frenchDate(request.startDate)} au{' '}
                    {frenchDate(request.endDate)} ·{' '}
                    <span className="tnum">{request.days}</span> jour
                    {request.days > 1 ? 's' : ''} décompté
                    {request.days > 1 ? 's' : ''}
                  </p>
                  {request.comment ? (
                    <p className="mt-0.5 text-micro text-ink-2">
                      « {request.comment} »
                    </p>
                  ) : null}
                </div>

                {board.canDecide ? (
                  <DecisionButtons timeOffId={request.id} />
                ) : (
                  <CancelButton timeOffId={request.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <MonthCalendar board={board} />

      <section className="rounded-3 border border-line-1 bg-surface">
        <h2 className="border-b border-line-1 px-4 py-2 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
          Absences du mois
        </h2>
        {board.inMonth.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-3">
            Aucune absence sur cette période.
          </p>
        ) : (
          <ul className="divide-y divide-line-1">
            {board.inMonth.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5"
              >
                <Badge tone={STATUS_TONES[request.status] ?? 'neutral'}>
                  {statusLabel(request.status)}
                </Badge>
                <span className="text-sm text-ink-1">{request.name}</span>
                <span className="text-sm text-ink-2">{request.typeLabel}</span>
                <span className="text-micro text-ink-3">
                  {frenchDate(request.startDate)} → {frenchDate(request.endDate)}
                </span>
                <span className="tnum ml-auto text-xs text-ink-2">
                  {request.days} j
                </span>
                {request.status === 'ACCEPTED' ? (
                  <CancelButton timeOffId={request.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3 border border-line-1 bg-surface">
        <h2 className="border-b border-line-1 px-4 py-2 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
          Compteurs
        </h2>
        {board.counters.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-3">
            Aucun compteur ouvert. Un compteur se crée à la première écriture —
            acceptation d’un congé ou ajustement manuel.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-1 text-left">
                <th className="px-4 py-2 text-micro font-semibold text-ink-3 uppercase">
                  Salarié
                </th>
                <th className="px-4 py-2 text-micro font-semibold text-ink-3 uppercase">
                  Compteur
                </th>
                <th className="px-4 py-2 text-right text-micro font-semibold text-ink-3 uppercase">
                  Acquis
                </th>
                <th className="px-4 py-2 text-right text-micro font-semibold text-ink-3 uppercase">
                  Pris
                </th>
                <th className="px-4 py-2 text-right text-micro font-semibold text-ink-3 uppercase">
                  Solde
                </th>
              </tr>
            </thead>
            <tbody>
              {board.counters.map((counter) => (
                <tr
                  key={`${counter.membershipId}-${counter.counterType}`}
                  className="border-b border-line-1 last:border-b-0"
                >
                  <td className="px-4 py-1.5 text-ink-1">{counter.name}</td>
                  <td className="px-4 py-1.5 text-ink-2">
                    {COUNTER_LABELS[counter.counterType] ?? counter.counterType}
                  </td>
                  <td className="tnum px-4 py-1.5 text-right text-ink-2">
                    {counter.accrued}
                  </td>
                  <td className="tnum px-4 py-1.5 text-right text-ink-2">
                    {counter.taken}
                  </td>
                  <td className="tnum px-4 py-1.5 text-right font-semibold text-ink-1">
                    {counter.balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="border-t border-line-1 px-4 py-2 text-micro text-ink-3">
          Le solde est la somme des écritures du registre, jamais une valeur
          stockée : un solde stocké se désynchronise, et la désynchronisation ne
          se voit qu’au moment où un salarié conteste.
        </p>
      </section>
    </PageBody>
  );
}

/** Calendrier du mois, une colonne par jour. */
function MonthCalendar({
  board,
}: {
  board: Awaited<ReturnType<typeof getAbsenceBoard>>;
}) {
  const accepted = board.inMonth.filter(
    (request) => request.status === 'ACCEPTED' || request.status === 'PENDING',
  );
  const people = [...new Set(accepted.map((request) => request.membershipId))];

  if (people.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-3 border border-line-1 bg-surface">
      <table className="w-full border-collapse text-xs">
        <caption className="sr-only">
          Calendrier des absences, {board.label}
        </caption>
        <thead>
          <tr className="border-b border-line-2 bg-surface-2">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-40 bg-surface-2 px-3 py-2 text-left text-micro font-semibold text-ink-3 uppercase"
            >
              Salarié
            </th>
            {board.days.map((date) => (
              <th
                key={date}
                scope="col"
                className={cx(
                  'tnum w-7 px-0.5 py-2 text-center font-semibold',
                  isoWeekday(date) >= 6
                    ? 'bg-surface-3 text-ink-2'
                    : 'text-ink-1',
                )}
              >
                {Number(date.slice(8, 10))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((membershipId) => {
            const own = accepted.filter(
              (request) => request.membershipId === membershipId,
            );
            const covered = new Map<string, (typeof own)[number]>();
            for (const request of own) {
              for (const date of datesBetween(
                request.startDate,
                request.endDate,
              )) {
                covered.set(date, request);
              }
            }

            return (
              <tr
                key={membershipId}
                className="border-b border-line-1 last:border-b-0"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-left text-sm font-medium text-ink-1"
                >
                  {own[0]?.name ?? ''}
                </th>
                {board.days.map((date) => {
                  const request = covered.get(date);
                  return (
                    <td
                      key={date}
                      className={cx(
                        'border-l border-line-1 px-0.5 py-1.5 text-center',
                        isoWeekday(date) >= 6 && 'bg-surface-2',
                      )}
                      title={
                        request
                          ? `${request.typeLabel} — ${statusLabel(request.status)}`
                          : undefined
                      }
                    >
                      {request ? (
                        <span
                          className={cx(
                            'block h-4 rounded-1',
                            request.status === 'PENDING'
                              ? 'border border-dashed border-warn bg-warn-soft'
                              : 'bg-info-soft',
                          )}
                        >
                          <span className="sr-only">
                            {request.typeLabel} le {date}
                          </span>
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function frenchDate(isoDate: string): string {
  return isoDate.split('-').reverse().join('/');
}
