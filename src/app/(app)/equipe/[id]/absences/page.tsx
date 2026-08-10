import { Badge, type Tone } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { listMemberAbsences, statusLabel } from '@/server/absences/queries';

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

const STATUS_TONES: Record<string, Tone> = {
  PENDING: 'warn',
  ACCEPTED: 'ok',
  DECLINED: 'danger',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
};

const readable = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`));

export default async function AbsencesTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const absences = await listMemberAbsences(id);

  if (!absences) {
    return (
      <EmptyState
        title="Absences non consultables"
        description="Votre rôle ne donne pas accès aux congés des autres salariés."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Compteurs" />
        {absences.counters.length === 0 ? (
          <EmptyState
            title="Aucun compteur"
            description="Les compteurs s’ouvrent à la première acquisition de la période."
          />
        ) : (
          <div className="grid gap-x-8 gap-y-4 p-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            {absences.counters.map((counter) => (
              <div key={`${counter.membershipId}-${counter.counterType}`}>
                <p className="text-micro font-semibold text-ink-1">
                  {counter.counterType}
                </p>
                <p className="tnum mt-1 text-lg font-semibold">
                  {counter.balance}
                </p>
                <p className="tnum text-micro text-ink-3">
                  {counter.accrued} acquis · {counter.taken} pris
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Congés et absences"
          badge={<Badge tone="neutral">{absences.requests.length}</Badge>}
        />
        {absences.requests.length === 0 ? (
          <EmptyState title="Aucune absence enregistrée" />
        ) : (
          <ul>
            {absences.requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center gap-2 border-b border-line-1 px-4 py-3 last:border-b-0"
              >
                <span className="font-medium">{request.typeLabel}</span>
                <span className="tnum text-xs text-ink-2">
                  {readable(request.startDate)}
                  {request.endDate !== request.startDate
                    ? ` → ${readable(request.endDate)}`
                    : ''}
                </span>
                <span className="tnum text-xs text-ink-3">
                  {request.days} j
                </span>
                <span className="flex-1" />
                <Badge tone={STATUS_TONES[request.status] ?? 'neutral'}>
                  {statusLabel(request.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
