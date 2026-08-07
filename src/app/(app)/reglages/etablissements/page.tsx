import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { AddLocationForm } from '@/app/(app)/reglages/etablissements/AddLocationForm';
import { AddTeamForm } from '@/app/(app)/reglages/etablissements/AddTeamForm';
import { archiveLocationAction, listLocations } from '@/server/settings/locations';

export const metadata = { title: 'Établissements · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function EtablissementsPage() {
  const locations = await listLocations();

  return (
    <PageBody>
      <PageHeader
        title="Établissements"
        subtitle={`${locations.length} établissement${locations.length > 1 ? 's' : ''} actif${locations.length > 1 ? 's' : ''}`}
      />

      {locations.length === 0 ? (
        <Card>
          <EmptyState
            title="Aucun établissement"
            description="Créez le premier établissement pour commencer à planifier."
          />
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {locations.map((location) => (
          <Card key={location.id}>
            <CardHeader
              title={location.name}
              badge={
                <Badge tone="neutral">
                  {location.teams.length} équipe
                  {location.teams.length > 1 ? 's' : ''}
                </Badge>
              }
              action={
                <form action={archiveLocationAction}>
                  <input type="hidden" name="id" value={location.id} />
                  <Button size="sm" variant="ghost" type="submit">
                    Archiver
                  </Button>
                </form>
              }
            />

            <dl className="grid gap-x-8 gap-y-2 px-4 py-3 text-sm [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              <div>
                <dt className="text-micro text-ink-3">SIRET</dt>
                <dd className="tnum">{location.siret ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-micro text-ink-3">Fuseau horaire</dt>
                <dd>{location.timezone}</dd>
              </div>
              <div>
                <dt className="text-micro text-ink-3">
                  Cotisations patronales
                </dt>
                <dd className="tnum">{location.employerContributionRate} %</dd>
              </div>
            </dl>

            <div className="border-t border-line-1 px-4 py-3">
              <p className="mb-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                Équipes
              </p>
              <ul className="mb-3 flex flex-wrap gap-1.5">
                {location.teams.length === 0 ? (
                  <li className="text-sm text-ink-3">Aucune équipe</li>
                ) : (
                  location.teams.map((team) => (
                    <li key={team.id}>
                      <Badge tone="neutral">{team.name}</Badge>
                    </li>
                  ))
                )}
              </ul>
              <AddTeamForm locationId={location.id} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Nouvel établissement" />
        <div className="p-4">
          <AddLocationForm />
        </div>
      </Card>
    </PageBody>
  );
}
