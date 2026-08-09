import { notFound } from 'next/navigation';

import { DocumentsPanel } from '@/app/(app)/equipe/[id]/DocumentsPanel';
import { InvitationPanel } from '@/app/(app)/equipe/[id]/InvitationPanel';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { listDocuments } from '@/server/documents/queries';
import { getEmployee } from '@/server/employees/queries';

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export default async function FichePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  // `members.documents.view` peut manquer là où `members.view` est accordée :
  // la section disparaît alors, plutôt que d'échouer sur toute la page.
  const documents = await listDocuments(id).catch(() => null);

  const active = employee.contracts.find(
    (contract) => contract.status === 'ACTIVE',
  );

  return (
    <PageBody>
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        subtitle={[
          employee.contract?.label,
          employee.locationName,
          `matricule ${employee.employeeNumber}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-3 border border-line-1 bg-surface p-4">
        <span
          aria-hidden
          className="flex size-11 flex-none items-center justify-center rounded-full bg-surface-3 text-sm font-semibold text-ink-2"
        >
          {employee.firstName.charAt(0)}
          {employee.lastName.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {employee.email ?? 'Aucun compte applicatif'}
          </p>
          <p className="text-micro text-ink-3">Rôle · {employee.roleName}</p>
        </div>
        <span className="flex-1" />
        {active?.forfaitJours ? (
          <Badge tone="accent">
            Forfait jours · {active.forfaitDaysPerYear ?? '—'} j
          </Badge>
        ) : active ? (
          <Badge tone="neutral">{active.weeklyHours} h hebdomadaires</Badge>
        ) : null}
        {!employee.hasAccount ? (
          <Badge tone="info">Sans accès applicatif</Badge>
        ) : null}
      </div>

      {documents ? (
        <Card>
          <CardHeader
            title="Pièces du dossier"
            badge={<Badge tone="neutral">{documents.documents.length}</Badge>}
          />
          <DocumentsPanel
            membershipId={employee.id}
            documents={documents.documents}
            canManage={documents.canManage}
          />
        </Card>
      ) : null}

      {employee.canInvite ? (
        <Card>
          <CardHeader title="Accès à l’application" />
          <InvitationPanel
            membershipId={employee.id}
            defaultEmail={
              employee.email ?? employee.profile?.personalEmail ?? ''
            }
            hasAccount={employee.hasAccount}
            invitation={employee.invitation}
          />
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Contrats et avenants"
          badge={<Badge tone="neutral">{employee.contracts.length}</Badge>}
        />
        {employee.contracts.length === 0 ? (
          <EmptyState
            title="Aucun contrat"
            description="Ce salarié n’a pas encore de contrat. Il ne peut pas être planifié tant qu’aucune période n’est ouverte."
          />
        ) : (
          <ul>
            {employee.contracts.map((contract) => (
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
                  <Badge
                    tone={contract.status === 'ACTIVE' ? 'ok' : 'neutral'}
                  >
                    {contract.status === 'ACTIVE' ? 'En cours' : 'Terminé'}
                  </Badge>
                </div>

                {contract.amendments.length > 0 ? (
                  <ul className="mt-2 border-l-2 border-line-2 pl-3">
                    {contract.amendments.map((amendment) => (
                      <li
                        key={amendment.id}
                        className="py-1 text-xs text-ink-2"
                      >
                        <span className="tnum">
                          {dateFormat.format(amendment.effectiveDate)}
                        </span>{' '}
                        — avenant{amendment.reason ? ` · ${amendment.reason}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {employee.profile ? (
        <Card>
          <CardHeader title="Dossier personnel" />
          <dl className="grid gap-x-8 gap-y-3 p-4 text-sm [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            <div>
              <dt className="text-micro text-ink-3">Téléphone</dt>
              <dd className="tnum">{employee.profile.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-micro text-ink-3">Ville</dt>
              <dd>{employee.profile.city ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-micro text-ink-3">
                Numéro de sécurité sociale
              </dt>
              <dd className="tnum">
                {/* Non chargé quand la capacité manque : un champ absent de la
                    réponse ne peut fuiter ni par le HTML ni par un journal. */}
                {employee.profile.socialSecurityNumber ?? (
                  <span className="text-ink-3">Accès non autorisé</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-micro text-ink-3">IBAN</dt>
              <dd className="tnum">
                {employee.profile.iban ?? (
                  <span className="text-ink-3">Accès non autorisé</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}
    </PageBody>
  );
}
