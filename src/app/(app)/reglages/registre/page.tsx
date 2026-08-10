import { AddEntryForm } from '@/app/(app)/reglages/registre/AddEntryForm';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { LEGAL_DOMAINS } from '@/domain/legal/domains';
import {
  approveLegalEntryAction,
  readLegalRegister,
} from '@/server/settings/legal-register';

export const metadata = { title: 'Registre de paramétrage · PlanFlow' };
export const dynamic = 'force-dynamic';

const DOMAIN_LABELS = new Map<string, string>(
  LEGAL_DOMAINS.map((domain) => [domain.key, domain.label]),
);

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export default async function RegistrePage() {
  const register = await readLegalRegister();

  return (
    <PageBody>
      <PageHeader
        title="Registre de paramétrage juridique"
        subtitle={`${register.approvedCount} paramètre${register.approvedCount > 1 ? 's' : ''} approuvé${register.approvedCount > 1 ? 's' : ''} · ${register.pendingCount} en attente`}
      />

      {register.missingDomains.length > 0 ? (
        <Card className="border-warn">
          <CardHeader
            title="Domaines sans paramètre approuvé"
            badge={<Badge tone="warn">{register.missingDomains.length}</Badge>}
          />
          <ul className="flex flex-wrap gap-1.5 p-4">
            {register.missingDomains.map((domain) => (
              <li key={domain}>
                <Badge tone="warn">{domain}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Paramètres enregistrés" />
        {register.entries.length === 0 ? (
          <EmptyState
            title="Registre vide"
            description="Aucun paramètre n’a encore été consigné. Tant que le registre est vide, aucune valeur appliquée par l’application n’est justifiée."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line-2 bg-surface-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  <th className="px-4 py-2.5">Domaine</th>
                  <th className="px-4 py-2.5">Paramètre</th>
                  <th className="px-4 py-2.5">Valeur</th>
                  <th className="px-4 py-2.5">Source</th>
                  <th className="px-4 py-2.5">Effet</th>
                  <th className="px-4 py-2.5">Population</th>
                  <th className="px-4 py-2.5">Approbation</th>
                </tr>
              </thead>
              <tbody>
                {register.entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-line-1 last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-ink-2">
                      {DOMAIN_LABELS.get(entry.domain) ?? entry.domain}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{entry.key}</td>
                    <td className="tnum px-4 py-2.5">{entry.value}</td>
                    <td className="px-4 py-2.5 text-ink-2">{entry.source}</td>
                    <td className="tnum px-4 py-2.5 text-ink-2">
                      {dateFormat.format(entry.effectiveFrom)}
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">
                      {entry.population}
                    </td>
                    <td className="px-4 py-2.5">
                      {entry.approvedAt ? (
                        <Badge tone="ok">
                          Approuvé le {dateFormat.format(entry.approvedAt)}
                        </Badge>
                      ) : (
                        <form action={approveLegalEntryAction}>
                          <input type="hidden" name="id" value={entry.id} />
                          <Button size="sm" type="submit">
                            Approuver
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Consigner un paramètre" />
        <div className="p-4">
          <AddEntryForm />
        </div>
      </Card>
    </PageBody>
  );
}
