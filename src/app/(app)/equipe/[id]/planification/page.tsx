import { notFound } from 'next/navigation';

import { InfoCard, InfoGrid, InfoRow } from '@/app/(app)/equipe/[id]/InfoCard';
import {
  ScopeForm,
  TeamsForm,
} from '@/app/(app)/equipe/[id]/planification/PlacementPanel';
import { Badge } from '@/components/ui/Badge';
import { can } from '@/domain/access/authorize';
import { requireSession } from '@/server/context';
import {
  getEmployee,
  getMemberPlacement,
  listPlacementOptions,
} from '@/server/employees/queries';

export const dynamic = 'force-dynamic';

/**
 * Rattachement et périmètre.
 *
 * L'établissement de rattachement reste en lecture seule : il est porté par le
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

  const [placement, locations, session] = await Promise.all([
    getMemberPlacement(id),
    listPlacementOptions(),
    requireSession(),
  ]);

  const canScope = can(session.actor, 'settings.roles.manage');
  const canTeams = can(session.actor, 'settings.teams.manage');

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

        <p className="pt-3 text-micro text-ink-3">
          L’établissement vient du contrat : il se change par avenant, pas ici.
        </p>

        {canTeams ? (
          <div className="pt-3">
            <TeamsForm
              membershipId={employee.id}
              locations={locations}
              teamIds={placement?.teamIds ?? []}
              primaryTeamId={placement?.primaryTeamId ?? null}
            />
          </div>
        ) : null}
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

        {canScope ? (
          <div className="pt-3">
            <ScopeForm
              membershipId={employee.id}
              locations={locations}
              allLocations={placement?.allLocations ?? false}
              scopedLocationIds={placement?.scopedLocationIds ?? []}
            />
          </div>
        ) : (
          <p className="pt-3 text-micro text-ink-3">
            Élargir un périmètre revient à distribuer des droits : la capacité
            « Gérer les rôles » est requise.
          </p>
        )}
      </InfoCard>
    </InfoGrid>
  );
}
