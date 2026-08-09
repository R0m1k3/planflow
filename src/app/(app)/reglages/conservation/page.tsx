import {
  LegalHoldForm,
  PurgeForm,
  RetentionPolicyForm,
} from '@/components/settings/RetentionForms';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  isComputable,
  START_POINT_LABELS,
  VERDICT_LABELS,
  type StartPoint,
} from '@/domain/retention/policy';
import { query } from '@/server/context';
import { inspectRetention } from '@/server/retention/purge';

export const metadata = { title: 'Conservation · PlanFlow' };
export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export default async function RetentionPage() {
  const { policies, candidates } = await query(
    'settings.access',
    async (db) => ({
      policies: await db.retentionPolicy.findMany({
        orderBy: [{ objectType: 'asc' }, { effectiveFrom: 'desc' }],
      }),
      candidates: await inspectRetention(db),
    }),
  );

  const due = candidates.filter((entry) => entry.verdict === 'DUE');
  const unpolicied = candidates.filter((entry) => entry.verdict === 'NO_POLICY');

  // Ce qui appelle une décision d'abord. Trier par date de dépôt puis tronquer
  // ferait disparaître les pièces échues derrière les plus anciennes, qui sont
  // justement celles dont il n'y a rien à dire.
  const PRIORITY: Record<string, number> = { DUE: 0, HELD: 1, NOT_COMPUTABLE: 2 };
  const shown = [...candidates]
    .sort(
      (a, b) =>
        (PRIORITY[a.verdict] ?? 3) - (PRIORITY[b.verdict] ?? 3) ||
        b.uploadedAt.getTime() - a.uploadedAt.getTime(),
    )
    .slice(0, 40);

  return (
    <PageBody>
      <PageHeader
        title="Durées de conservation"
        subtitle="Chaque durée porte sa justification : elle devra être défendue lors d’un contrôle."
        actions={
          due.length > 0 ? (
            <Badge tone="warn">{due.length} pièce(s) échue(s)</Badge>
          ) : (
            <Badge tone="ok">Rien d’échu</Badge>
          )
        }
      />

      <section className="rounded-3 border border-line-1 bg-surface-2 p-4 text-sm text-ink-2">
        <p>
          Les minima légaux ne sont ni universels ni une autorisation de tout
          garder. PlanFlow n’applique <strong>aucune durée par défaut</strong> :
          un objet sans politique déclarée se conserve, et cet écran le signale.
        </p>
        <p className="mt-2">
          Les journaux d’audit échappent à la purge : ils doivent survivre aux
          données qu’ils décrivent, sans quoi il deviendrait impossible de
          démontrer que la purge a bien eu lieu.
        </p>
      </section>

      <Card>
        <CardHeader
          title="Politiques déclarées"
          badge={<Badge tone="neutral">{policies.length}</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-2 bg-surface-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                <th className="px-4 py-2.5">Objet</th>
                <th className="px-4 py-2.5">Durée</th>
                <th className="px-4 py-2.5">Point de départ</th>
                <th className="px-4 py-2.5">Justification</th>
                <th className="px-4 py-2.5">En vigueur le</th>
                <th className="px-4 py-2.5">Conservation probatoire</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr
                  key={policy.id}
                  className="border-b border-line-1 last:border-b-0"
                >
                  <td className="px-4 py-2.5 font-medium">{policy.objectType}</td>
                  <td className="tnum px-4 py-2.5">
                    {policy.durationMonths} mois
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">
                    {START_POINT_LABELS[policy.startPoint as StartPoint] ??
                      policy.startPoint}
                    {!isComputable(policy.startPoint) ? (
                      // Le dire plutôt que de laisser croire que la politique
                      // s'applique : PlanFlow ne modèle pas encore cette date.
                      <Badge tone="warn">non calculable</Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">
                    {policy.justification}
                  </td>
                  <td className="tnum px-4 py-2.5 text-ink-2">
                    {dateFormat.format(policy.effectiveFrom)}
                  </td>
                  <td className="px-4 py-2.5">
                    <LegalHoldForm policyId={policy.id} held={policy.legalHold} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Déclarer une durée" />
        <div className="p-4">
          <RetentionPolicyForm />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Pièces du dossier salarié"
          badge={<Badge tone="neutral">{candidates.length}</Badge>}
        />
        <div className="flex flex-col gap-3 p-4">
          {candidates.length === 0 ? (
            <p className="text-sm text-ink-3">Aucune pièce déposée.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {shown.map((candidate) => (
                <li key={candidate.id} className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      candidate.verdict === 'DUE'
                        ? 'warn'
                        : candidate.verdict === 'HELD'
                          ? 'info'
                          : 'neutral'
                    }
                  >
                    {VERDICT_LABELS[candidate.verdict]}
                  </Badge>
                  <span className="text-ink-1">{candidate.name}</span>
                  <span className="text-micro text-ink-3">
                    {candidate.category}
                  </span>
                  <span className="tnum text-micro text-ink-3">
                    déposée le {dateFormat.format(candidate.uploadedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {candidates.length > shown.length ? (
            <p className="text-micro text-ink-3">
              {candidates.length - shown.length} pièce(s) de plus, non affichées.
              Les pièces échues et suspendues figurent toujours en tête.
            </p>
          ) : null}

          {unpolicied.length > 0 ? (
            <p className="text-micro text-ink-3">
              {unpolicied.length} pièce(s) sans politique déclarée : elles ne
              seront pas purgées tant qu’aucune durée ne les vise.
            </p>
          ) : null}

          <PurgeForm due={due.length} />
        </div>
      </Card>
    </PageBody>
  );
}
