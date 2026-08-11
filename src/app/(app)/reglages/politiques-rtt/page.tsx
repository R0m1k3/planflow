import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import {
  AddPolicyForm,
  AssignForm,
} from '@/app/(app)/reglages/politiques-rtt/PolicyForms';
import {
  archiveRttPolicyAction,
  getPolicyBoard,
  unassignRttPolicyAction,
} from '@/server/settings/rtt-policies';

export const metadata = { title: 'Politiques de RTT · PlanFlow' };
export const dynamic = 'force-dynamic';

/** « 01-01 » → « 1er janvier ». */
function periodLabel(periodStart: string): string {
  const [month, day] = periodStart.split('-');
  if (!month || !day) return periodStart;
  const date = new Date(Date.UTC(2001, Number(month) - 1, Number(day)));
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
  return day === '01' ? formatted.replace(/^1 /, '1er ') : formatted;
}

export default async function PolitiquesRttPage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string }>;
}) {
  const { archives } = await searchParams;
  const showArchived = archives === '1';
  const board = await getPolicyBoard(showArchived);
  const active = board.policies.filter((policy) => policy.status === 'ACTIVE');

  return (
    <PageBody>
      <PageHeader
        title="Politiques de RTT"
        subtitle={`${active.length} politique${active.length > 1 ? 's' : ''} active${active.length > 1 ? 's' : ''}`}
      />

      <Card>
        <CardHeader
          title="Politiques"
          action={
            <a
              href={
                showArchived
                  ? '/reglages/politiques-rtt'
                  : '/reglages/politiques-rtt?archives=1'
              }
              className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink-1"
            >
              {showArchived ? 'Masquer les archivées' : 'Voir les archivées'}
            </a>
          }
        />

        {board.policies.length === 0 ? (
          <EmptyState
            title="Aucune politique"
            description="Une politique ouvre un droit à RTT et l’inscrit au registre des compteurs à chaque début de période."
          />
        ) : (
          <ul className="divide-y divide-line-1">
            {board.policies.map((policy) => (
              <li key={policy.id} className="px-4 py-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{policy.name}</span>
                  <Badge tone="accent" className="tnum">
                    {policy.daysPerYear} j/an
                  </Badge>
                  <Badge tone="neutral">
                    à partir du {periodLabel(policy.periodStart)}
                  </Badge>
                  {policy.autoRenew ? (
                    <Badge tone="ok">Reconduite</Badge>
                  ) : (
                    <Badge tone="neutral">Période unique</Badge>
                  )}
                  {policy.status === 'ARCHIVED' ? (
                    <Badge tone="warn">Archivée</Badge>
                  ) : null}

                  <span className="flex-1" />

                  <form action={archiveRttPolicyAction}>
                    <input type="hidden" name="id" value={policy.id} />
                    {policy.status === 'ARCHIVED' ? (
                      <input type="hidden" name="restore" value="1" />
                    ) : null}
                    <Button size="sm" variant="ghost" type="submit">
                      {policy.status === 'ARCHIVED' ? 'Rétablir' : 'Archiver'}
                    </Button>
                  </form>
                </div>

                <p className="mb-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  {policy.assignedCount} salarié
                  {policy.assignedCount > 1 ? 's' : ''} couvert
                  {policy.assignedCount > 1 ? 's' : ''}
                </p>

                {policy.assignees.length > 0 ? (
                  <ul className="mb-3 flex flex-wrap gap-1.5">
                    {policy.assignees.map((assignee) => (
                      <li key={assignee.membershipId}>
                        <form
                          action={unassignRttPolicyAction}
                          className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface-3 py-px pr-1 pl-2"
                        >
                          <input
                            type="hidden"
                            name="policyId"
                            value={policy.id}
                          />
                          <input
                            type="hidden"
                            name="membershipId"
                            value={assignee.membershipId}
                          />
                          <span className="text-micro font-semibold text-ink-2">
                            {assignee.name}
                          </span>
                          <button
                            type="submit"
                            aria-label={`Retirer ${assignee.name} de ${policy.name}`}
                            className="cursor-pointer rounded-full px-1 text-micro text-ink-3 hover:text-danger"
                          >
                            ×
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-3 text-xs text-ink-3">
                    Aucun salarié assigné : cette politique n’ouvre aucun droit.
                  </p>
                )}

                {policy.status === 'ACTIVE' ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs text-ink-2 underline underline-offset-2">
                      Assigner des employés
                    </summary>
                    <div className="pt-3">
                      <AssignForm
                        policyId={policy.id}
                        candidates={board.candidates}
                        assigned={policy.assignees.map(
                          (assignee) => assignee.membershipId,
                        )}
                      />
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Nouvelle politique" />
        <div className="p-4">
          <AddPolicyForm />
        </div>
      </Card>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Archiver arrête la reconduction ; les jours déjà acquis restent au
        registre des compteurs et les affectations en place. Une politique
        n’efface pas ce qu’elle a produit — un solde de RTT est un droit ouvert,
        pas un affichage.
      </p>
    </PageBody>
  );
}
