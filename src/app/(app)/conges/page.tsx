import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { cx } from '@/lib/cx';
import {
  CALENDAR_ABSENCES,
  MONTH_LABEL,
  MONTH_LENGTH,
  MONTH_OFFSET,
  PENDING_REQUESTS,
} from '@/lib/demo/conges';

export const metadata = { title: 'Calendrier des absences · PlanFlow' };

const WEEKDAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

const KIND_STYLES: Record<string, string> = {
  cp: 'bg-info-soft text-info-soft-ink border-info',
  rtt: 'bg-accent-soft text-accent-soft-ink border-accent',
  maladie: 'bg-surface-3 text-ink-2 border-line-3',
  'sans-solde': 'bg-surface-2 text-ink-2 border-line-3',
  attente: 'bg-warn-soft text-warn-soft-ink border-warn',
};

export default function CongesPage() {
  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - MONTH_OFFSET + 1;
    const inMonth = dayNumber >= 1 && dayNumber <= MONTH_LENGTH;
    const items = inMonth
      ? CALENDAR_ABSENCES.filter(
          (absence) => dayNumber >= absence.from && dayNumber <= absence.to,
        )
      : [];
    return { index, dayNumber, inMonth, items, weekend: index % 7 > 4 };
  });

  return (
    <PageBody>
      <PageHeader
        title="Calendrier des absences"
        subtitle={`${MONTH_LABEL} · Nantes Atlantis · ${PENDING_REQUESTS.length} demandes en attente`}
        actions={
          <>
            <Button>Exporter</Button>
            <Button variant="primary">Saisir une absence</Button>
          </>
        }
      />

      <Card>
        <div className="grid grid-cols-7 border-b border-line-2 bg-surface-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="border-r border-line-1 px-2 py-2 text-center text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell) => (
            <div
              key={cell.index}
              className={cx(
                'min-h-24 border-r border-b border-line-1 p-1.5 last:border-r-0',
                !cell.inMonth && 'bg-surface-2',
                cell.inMonth && cell.weekend && 'bg-surface-2',
              )}
            >
              <span
                className={cx(
                  'tnum block text-micro font-semibold',
                  cell.inMonth ? 'text-ink-1' : 'text-ink-3',
                )}
              >
                {cell.inMonth ? cell.dayNumber : ''}
              </span>
              <ul className="mt-1 flex flex-col gap-0.5">
                {cell.items.slice(0, 3).map((absence) => (
                  <li
                    key={`${absence.who}-${absence.type}`}
                    className={cx(
                      'truncate rounded-1 border px-1 py-px text-micro',
                      KIND_STYLES[absence.kind],
                    )}
                    title={`${absence.who} · ${absence.type}`}
                  >
                    {absence.who.split(' ')[0]} · {absence.type}
                  </li>
                ))}
                {cell.items.length > 3 ? (
                  <li className="px-1 text-micro text-ink-3">
                    +{cell.items.length - 3}
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <span id="attente" />
        <CardHeader
          title="Demandes en attente"
          badge={<Badge tone="warn">{PENDING_REQUESTS.length}</Badge>}
        />
        <ul>
          {PENDING_REQUESTS.map((request) => (
            <li
              key={`${request.who}-${request.range}`}
              className="flex flex-wrap items-center gap-3 border-b border-line-1 px-4 py-3 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {request.who} · {request.type}
                </span>
                <span className="block text-micro text-ink-3">
                  {request.note}
                </span>
              </span>
              <span className="tnum flex-none text-xs text-ink-2">
                {request.range}
              </span>
              <Badge tone="neutral">{request.days}</Badge>
              <span className="flex flex-none gap-2">
                <Button size="sm">Refuser</Button>
                <Button size="sm" variant="primary">
                  Accepter
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </PageBody>
  );
}
