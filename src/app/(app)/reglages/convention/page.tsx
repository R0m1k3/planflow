import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { AgreementForm } from '@/app/(app)/reglages/convention/AgreementForm';
import {
  IDCC_1517_PROVENANCE,
  type ParameterOrigin,
} from '@/domain/compliance/idcc1517';
import { listAgreementVersions } from '@/server/settings/agreement';

export const metadata = { title: 'Convention collective · PlanFlow' };
export const dynamic = 'force-dynamic';

const ORIGIN_TONE: Record<ParameterOrigin, 'danger' | 'info' | 'warn'> = {
  OP: 'danger',
  CCN: 'info',
  ENT: 'warn',
};

const ORIGIN_LABEL: Record<ParameterOrigin, string> = {
  OP: 'Ordre public',
  CCN: 'Convention',
  ENT: 'Accord d’entreprise',
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export default async function ConventionPage() {
  const versions = await listAgreementVersions();
  const current = versions.find((version) => version.isCurrent) ?? versions[0];

  return (
    <PageBody>
      <PageHeader
        title="Convention collective"
        subtitle={
          current
            ? `IDCC ${current.idcc} · version ${current.version}`
            : 'Aucune convention chargée'
        }
      />

      {!current ? (
        <Card>
          <EmptyState
            title="Aucune convention"
            description="Le moteur de règles lit ses seuils en base. Sans convention chargée, aucune règle horaire ne s’applique."
          />
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Origine des valeurs"
          badge={<Badge tone="neutral">{IDCC_1517_PROVENANCE.length}</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-1 text-left">
                <th className="px-4 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Paramètre
                </th>
                <th className="px-4 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Valeur
                </th>
                <th className="px-4 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Origine
                </th>
                <th className="px-4 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-1">
              {IDCC_1517_PROVENANCE.map((entry) => (
                <tr key={entry.key}>
                  <td className="px-4 py-2">{entry.label}</td>
                  <td className="px-4 py-2 tnum">{entry.value}</td>
                  <td className="px-4 py-2">
                    <Badge tone={ORIGIN_TONE[entry.origin]}>
                      {ORIGIN_LABEL[entry.origin]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-ink-2">{entry.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line-1 px-4 py-3 text-xs leading-[var(--lh-prose)] text-ink-3">
          Une valeur d’ordre public ne se négocie pas ; une valeur
          conventionnelle change si la convention change ; une valeur d’accord
          d’entreprise suppose un accord signé. Confondre les trois fait
          apparaître comme discutable ce qui s’impose, et l’inverse.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Versions"
          badge={<Badge tone="neutral">{versions.length}</Badge>}
        />
        {versions.length === 0 ? (
          <EmptyState title="Aucune version enregistrée" />
        ) : (
          <ul className="divide-y divide-line-1">
            {versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <Badge tone={version.isCurrent ? 'ok' : 'neutral'}>
                  v{version.version}
                </Badge>
                <span className="text-sm font-medium">{version.name}</span>
                <span className="text-sm text-ink-2">
                  en vigueur au {dateFormat.format(version.effectiveFrom)}
                </span>
                {version.isCurrent ? <Badge tone="accent">Applicable</Badge> : null}
                <span className="flex-1" />
                <span className="text-xs text-ink-3">
                  {version.approvedBy
                    ? `Approuvée par ${version.approvedBy}`
                    : 'Non approuvée'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {current ? (
        <Card>
          <CardHeader
            title="Éditer les paramètres"
            badge={<Badge tone="warn">crée une version</Badge>}
          />
          <AgreementForm
            idcc={current.idcc}
            name={current.name}
            parameters={current.parameters}
          />
        </Card>
      ) : null}
    </PageBody>
  );
}
