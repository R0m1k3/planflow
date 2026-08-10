import { notFound } from 'next/navigation';

import { InfoCard, InfoGrid, InfoRow } from '@/app/(app)/equipe/[id]/InfoCard';
import { Badge } from '@/components/ui/Badge';
import { getEmployee, getMemberPlacement } from '@/server/employees/queries';

export const dynamic = 'force-dynamic';

/**
 * Rattachement et périmètre.
 *
 * L'établissement de rattachement est en lecture seule : il est porté par le
 * contrat, et le changer sans avenant ferait diverger le planning du document
 * opposable.
 */
export default async function PlacementTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  const placement = await getMemberPlacement(id);

  return (
    <InfoGrid>
      <InfoCard title="Rattachement">
        <InfoRow
          label="Établissement"
          value={placement?.contractLocationName ?? employee.locationName}
        />
        <InfoRow
          label="Équipes"
          value={
            placement && placement.teams.length > 0
              ? placement.teams
                  .map((team) =>
                    team.isPrimary ? `${team.name} (principale)` : team.name,
                  )
                  .join(', ')
              : ''
          }
        />
        <InfoRow label="Matricule" value={employee.employeeNumber} tnum />
        <InfoRow
          label="Responsable hiérarchique"
          value={employee.headline.lineManagerName}
        />
      </InfoCard>

      <InfoCard title="Périmètre d’accès">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line-1 py-3">
          <dt className="min-w-[11rem] flex-none text-sm font-medium text-ink-1">
            Accès généralisé
          </dt>
          <dd className="text-sm">
            {placement?.allLocations ? (
              <Badge tone="ok">Tous les établissements</Badge>
            ) : (
              <Badge tone="neutral">Limité</Badge>
            )}
          </dd>
        </div>
        <InfoRow
          label="Établissements"
          value={
            placement?.allLocations
              ? 'Tous, ouvertures futures comprises'
              : (placement?.scopedLocations.join(', ') ?? '')
          }
        />
        <InfoRow
          label="Équipes"
          value={placement?.scopedTeams.join(', ') ?? ''}
        />
        <InfoRow label="Rôle" value={employee.roleName} />
      </InfoCard>
    </InfoGrid>
  );
}
