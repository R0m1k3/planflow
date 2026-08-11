import Link from 'next/link';

import { CancelButton, DecisionButtons } from '@/components/absences/DecisionButtons';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import {
  statusLabel,
  type AbsenceQueue as QueueKey,
  type AbsenceQueueResult,
} from '@/server/absences/queries';

/**
 * Files d'absences par état — PLAN.md §9.
 *
 * Les trois files partagent ce rendu. Une seule différence les sépare : la file
 * à traiter porte les boutons de décision, les autres n'en portent pas — une
 * absence déjà décidée ne se re-décide pas depuis une liste, elle s'annule
 * depuis la fiche, avec sa contre-passe au registre.
 */

const STATUS_TONES: Record<string, Tone> = {
  PENDING: 'warn',
  ACCEPTED: 'ok',
  DECLINED: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
};

export const QUEUE_TABS: Array<{ key: QueueKey; href: string; label: string }> = [
  { key: 'pending', href: '/absences/a-traiter', label: 'À traiter' },
  { key: 'treated', href: '/absences/traitees', label: 'Traitées' },
  { key: 'expired', href: '/absences/expirees', label: 'Expirées' },
];

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDay(iso: string): string {
  return dateFormat.format(new Date(`${iso}T00:00:00Z`));
}

/**
 * Période affichée d'une absence.
 *
 * `endDate` porte le **dernier jour d'absence**, pas la date de reprise. La
 * confusion est la plus fréquente du domaine et se paie en un jour de congé de
 * trop ou de trop peu ; l'écran l'écrit donc explicitement.
 */
function period(row: AbsenceQueueResult['rows'][number]): string {
  const start = formatDay(row.startDate);
  if (row.startDate === row.endDate) {
    return row.startHalfDay || row.endHalfDay ? `${start} (demi-journée)` : start;
  }
  return `du ${start} au ${formatDay(row.endDate)} inclus`;
}

export function AbsenceQueueView({
  result,
  title,
  description,
  filterBar,
}: {
  result: AbsenceQueueResult;
  title: string;
  description: string;
  filterBar?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        badge={
          <Badge tone={result.rows.length > 0 ? 'accent' : 'neutral'}>
            {result.rows.length} ligne{result.rows.length > 1 ? 's' : ''}
          </Badge>
        }
        action={
          <nav aria-label="Files d’absences" className="flex gap-1">
            {QUEUE_TABS.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={tab.key === result.queue ? 'page' : undefined}
                className={
                  tab.key === result.queue
                    ? 'flex h-7 items-center rounded-2 border border-line-3 bg-surface-2 px-2.5 text-xs font-medium text-ink-1'
                    : 'flex h-7 items-center rounded-2 px-2.5 text-xs text-ink-2 hover:bg-surface-2'
                }
              >
                {tab.label}
                <span className="ml-1.5 tnum text-ink-3">
                  {result.counts[tab.key]}
                </span>
              </Link>
            ))}
          </nav>
        }
      />

      {filterBar ? (
        <div className="border-b border-line-1 px-4 py-2.5">{filterBar}</div>
      ) : null}

      {result.rows.length === 0 ? (
        <EmptyState title="Aucune absence" description={description} />
      ) : (
        <ul className="divide-y divide-line-1">
          {result.rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-[14rem] flex-1">
                <p className="text-sm font-medium">{row.name}</p>
                <p className="text-xs text-ink-2">
                  {row.typeLabel} · {period(row)}
                </p>
                {row.comment ? (
                  <p className="mt-1 text-xs text-ink-3">« {row.comment} »</p>
                ) : null}
                {row.decisionComment ? (
                  <p className="mt-1 text-xs text-ink-3">
                    Décision : {row.decisionComment}
                  </p>
                ) : null}
              </div>

              <Badge tone="neutral" className="tnum">
                {row.days} j
              </Badge>
              <Badge tone={STATUS_TONES[row.status] ?? 'neutral'}>
                {statusLabel(row.status)}
              </Badge>

              {result.queue === 'pending' && result.canDecide ? (
                <DecisionButtons timeOffId={row.id} />
              ) : null}

              {result.queue === 'treated' && row.status === 'ACCEPTED' ? (
                <CancelButton timeOffId={row.id} />
              ) : null}

              <Link
                href={`/equipe/${row.membershipId}/absences`}
                className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink-1"
              >
                Fiche
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
