import Link from 'next/link';
import { Suspense } from 'react';

import { AddEmployeeForm } from '@/app/(app)/equipe/AddEmployeeForm';
import { DirectoryFilters } from '@/app/(app)/equipe/DirectoryFilters';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { listEmployees } from '@/server/employees/queries';

export const metadata = { title: 'Équipe · PlanFlow' };
export const dynamic = 'force-dynamic';

const INVITATION_TONES: Record<string, { label: string; tone: Tone }> = {
  ACCEPTED: { label: 'Acceptée', tone: 'ok' },
  PENDING: { label: 'En attente', tone: 'info' },
  EXPIRED: { label: 'Expirée', tone: 'warn' },
  REVOKED: { label: 'Révoquée', tone: 'neutral' },
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

const one = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const presence = one(params.presence);

  const directory = await listEmployees({
    ...(one(params.q) ? { q: one(params.q) as string } : {}),
    ...(one(params.etablissement)
      ? { locationId: one(params.etablissement) as string }
      : {}),
    ...(one(params.role) ? { roleId: one(params.role) as string } : {}),
    ...(one(params.contrat)
      ? { contractType: one(params.contrat) as string }
      : {}),
    ...(presence === 'archived' || presence === 'all'
      ? { presence }
      : { presence: 'active' as const }),
    ...(one(params.tri) === 'number' ? { sort: 'number' as const } : {}),
  });

  const filtered = directory.rows.length !== directory.total;

  return (
    <PageBody>
      <PageHeader
        title="Équipe"
        subtitle={
          filtered
            ? `${directory.rows.length} sur ${directory.total} salariés`
            : `${directory.total} salarié${directory.total > 1 ? 's' : ''}`
        }
        actions={
          <Link
            href="/reglages/registre"
            className="inline-flex h-8 items-center rounded-2 border border-line-3 bg-surface px-3.5 text-sm font-medium text-ink-1 hover:bg-surface-2"
          >
            Registre unique du personnel
          </Link>
        }
      />

      {/* `useSearchParams` impose une frontière de suspense : sans elle, la
          page entière serait rendue à la demande au lieu d'être servie puis
          hydratée. */}
      <Suspense fallback={<div className="h-[5.5rem]" />}>
        <DirectoryFilters
          options={{
            locations: directory.locations,
            roles: directory.roles,
            contractTypes: directory.contractTypes,
          }}
        />
      </Suspense>

      <Card>
        {directory.rows.length === 0 ? (
          <EmptyState
            title={filtered ? 'Aucun résultat' : 'Aucun salarié'}
            description={
              filtered
                ? 'Aucun salarié ne répond à ces critères. Élargissez la recherche.'
                : 'Ajoutez un premier salarié pour commencer à planifier.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line-2 bg-surface-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  <th className="px-4 py-2.5">Collaborateur</th>
                  <th className="px-4 py-2.5">Rôle</th>
                  <th className="px-4 py-2.5">Contrat</th>
                  <th className="px-4 py-2.5">Mobile</th>
                  <th className="px-4 py-2.5">Rattachement</th>
                  <th className="px-4 py-2.5">Invitation</th>
                </tr>
              </thead>
              <tbody>
                {directory.rows.map((employee) => {
                  const invitation = employee.invitationState
                    ? INVITATION_TONES[employee.invitationState]
                    : null;

                  return (
                    <tr
                      key={employee.id}
                      className="border-b border-line-1 last:border-b-0 hover:bg-surface-2"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/equipe/${employee.id}`}
                          className="flex items-center gap-2.5 rounded-2"
                        >
                          <span
                            aria-hidden
                            className="flex size-7 flex-none items-center justify-center rounded-full bg-accent-soft text-micro font-semibold text-accent-soft-ink"
                          >
                            {employee.firstName.charAt(0)}
                            {employee.lastName.charAt(0)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {employee.firstName} {employee.lastName}
                            </span>
                            <span className="block truncate text-micro text-ink-3">
                              {employee.email ?? `Matricule ${employee.employeeNumber}`}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone="accent">{employee.roleName}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {employee.contract ? (
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span>{employee.contract.label}</span>
                            {employee.contract.forfaitJours ? (
                              <Badge tone="accent">Forfait jours</Badge>
                            ) : null}
                            <span className="tnum text-micro text-ink-3">
                              depuis le{' '}
                              {dateFormat.format(employee.contract.since)}
                            </span>
                          </span>
                        ) : (
                          <Badge tone="warn">Sans contrat</Badge>
                        )}
                      </td>
                      <td className="tnum px-4 py-2.5 text-ink-2">
                        {employee.phone ?? (
                          <span className="text-ink-3">Non renseigné</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink-2">
                        {employee.locationName ?? '—'}
                        {employee.teamName ? ` / ${employee.teamName}` : ''}
                      </td>
                      <td className="px-4 py-2.5">
                        {invitation ? (
                          <Badge tone={invitation.tone}>{invitation.label}</Badge>
                        ) : (
                          <span className="text-micro text-ink-3">
                            Sans accès applicatif
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Ajouter un collaborateur" />
        <div className="p-4">
          <AddEmployeeForm />
        </div>
      </Card>
    </PageBody>
  );
}
