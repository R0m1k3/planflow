import { notFound } from 'next/navigation';

import { InfoCard, InfoRow } from '@/app/(app)/equipe/[id]/InfoCard';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { getEmployee } from '@/server/employees/queries';

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export default async function ContractsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  const active = employee.contracts.find(
    (contract) => contract.status === 'ACTIVE',
  );
  const past = employee.contracts.filter(
    (contract) => contract.id !== active?.id,
  );

  return (
    <div className="flex flex-col gap-5">
      {active ? (
        <InfoCard title="Contrat en cours">
          <InfoRow label="Type" value={active.label} />
          <InfoRow label="Début du contrat" value={dateFormat.format(active.startDate)} tnum />
          <InfoRow
            label="Fin du contrat"
            value={active.endDate ? dateFormat.format(active.endDate) : ''}
            tnum
          />
          <InfoRow label="Emploi" value={employee.headline.jobTitle} />
          <InfoRow
            label="Organisation du temps"
            value={
              active.forfaitJours
                ? `Forfait jours · ${active.forfaitDaysPerYear ?? '—'} jours par an`
                : `${active.weeklyHours} heures hebdomadaires`
            }
          />
          {employee.canSeeSalary ? (
            <InfoRow
              label="Rémunération mensuelle brute"
              value={active.monthlySalary ? `${active.monthlySalary} €` : ''}
              tnum
            />
          ) : null}
          <InfoRow label="Établissement" value={employee.locationName} />
        </InfoCard>
      ) : (
        <EmptyState
          title="Aucun contrat en cours"
          description="Ce salarié ne peut être ni planifié ni déclaré tant qu’aucune période n’est ouverte."
        />
      )}

      <Card>
        <CardHeader
          title="Tous les contrats et avenants"
          badge={<Badge tone="neutral">{employee.contracts.length}</Badge>}
        />
        {employee.contracts.length === 0 ? (
          <EmptyState title="Aucun contrat enregistré" />
        ) : (
          <ul>
            {[...(active ? [active] : []), ...past].map((contract) => (
              <li
                key={contract.id}
                className="border-b border-line-1 px-4 py-3 last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{contract.label}</span>
                  {contract.forfaitJours ? (
                    <Badge tone="accent">Forfait jours</Badge>
                  ) : (
                    <Badge tone="neutral">{contract.weeklyHours} h</Badge>
                  )}
                  <span className="tnum text-xs text-ink-2">
                    {dateFormat.format(contract.startDate)}
                    {contract.endDate
                      ? ` → ${dateFormat.format(contract.endDate)}`
                      : ' → en cours'}
                  </span>
                  <span className="flex-1" />
                  {employee.canSeeSalary && contract.monthlySalary ? (
                    <span className="tnum text-sm">
                      {contract.monthlySalary} € brut
                    </span>
                  ) : null}
                  <Badge tone={contract.status === 'ACTIVE' ? 'ok' : 'neutral'}>
                    {contract.status === 'ACTIVE' ? 'En cours' : 'Terminé'}
                  </Badge>
                </div>

                {contract.amendments.length > 0 ? (
                  <ul className="mt-2 border-l-2 border-line-2 pl-3">
                    {contract.amendments.map((amendment) => (
                      <li key={amendment.id} className="py-1 text-xs text-ink-2">
                        <span className="tnum">
                          {dateFormat.format(amendment.effectiveDate)}
                        </span>{' '}
                        — avenant
                        {amendment.reason ? ` · ${amendment.reason}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
