import Link from 'next/link';
import { Suspense } from 'react';

import { AddEmployeeDialog } from '@/app/(app)/equipe/AddEmployeeDialog';
import { DirectoryFilters } from '@/app/(app)/equipe/DirectoryFilters';
import { RegisterDialog } from '@/app/(app)/equipe/RegisterDialog';
import { listRegisterLocations } from '@/server/employees/rup';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge, type Tone } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Card';
import {
  listContractLocations,
  listEmployees,
  listHiringOptions,
} from '@/server/employees/queries';

export const metadata = { title: 'Équipe · PlanFlow' };
export const dynamic = 'force-dynamic';

const INVITATION_TONES: Record<string, { label: string; tone: Tone }> = {
  ACCEPTED: { label: 'Acceptée', tone: 'ok' },
  PENDING: { label: 'En attente', tone: 'info' },
  EXPIRED: { label: 'Expirée', tone: 'warn' },
  REVOKED: { label: 'Révoquée', tone: 'neutral' },
};

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

  // Sans la capacité d'ouvrir un contrat, la liste revient vide et le
  // formulaire s'en tient à l'identité.
  const hiringLocations = await listContractLocations().catch(() => []);

  // Sans `members.register.export`, le bouton du registre ne paraît pas.
  const registerLocations = await listRegisterLocations().catch(() => []);

  const hiringOptions = await listHiringOptions().catch(() => ({
    managers: [],
    rttPolicies: [],
  }));

  const filtered = directory.rows.length !== directory.total;

  return (
    <PageBody>
      <PageHeader
        title="Équipe"
        // Le décompte n'apparaît que s'il apprend quelque chose : « 87 salariés »
        // au-dessus d'une liste de 87 lignes ne dit rien que la liste ne dise.
        {...(filtered
          ? { subtitle: `${directory.rows.length} sur ${directory.total} salariés` }
          : {})}
        actions={
          <>
            {registerLocations.length > 0 ? (
              <RegisterDialog locations={registerLocations} />
            ) : null}
            <AddEmployeeDialog
              locations={hiringLocations}
              options={hiringOptions}
            />
          </>
        }
      />

      {/* `useSearchParams` impose une frontière de suspense : sans elle, la
          page entière serait rendue à la demande au lieu d'être servie puis
          hydratée. */}
      <Suspense fallback={<div className="h-[6rem]" />}>
        <DirectoryFilters
          options={{
            locations: directory.locations,
            roles: directory.roles,
            contractTypes: directory.contractTypes,
          }}
        />
      </Suspense>

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
          <table className="w-full min-w-[940px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-2 text-left text-micro font-semibold tracking-[0.04em] text-ink-3">
                <th className="px-3 py-3 font-semibold">Collaborateur</th>
                <th className="px-3 py-3 font-semibold">Rôle</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Mobile</th>
                <th className="px-3 py-3 font-semibold">Rattachement</th>
                <th className="px-3 py-3 font-semibold">Invitation</th>
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
                    <td className="px-3 py-3">
                      <Link
                        href={`/equipe/${employee.id}`}
                        className="flex items-center gap-2.5 rounded-2"
                      >
                        <span
                          aria-hidden
                          className="flex size-8 flex-none items-center justify-center rounded-full bg-accent-soft text-micro font-semibold text-accent-soft-ink"
                        >
                          {employee.firstName.charAt(0)}
                          {employee.lastName.charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium underline decoration-line-3 underline-offset-2">
                            {employee.firstName} {employee.lastName}
                          </span>
                          {/* Le matricule ne double la colonne « Email » que
                              lorsqu'il n'y en a pas : c'est alors la seule
                              adresse à laquelle on désigne ce salarié. */}
                          {employee.email ? null : (
                            <span className="block truncate text-micro text-ink-3">
                              Matricule {employee.employeeNumber}
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone="accent">{employee.roleName}</Badge>
                    </td>
                    <td className="px-3 py-3 text-ink-2">
                      {employee.email ?? (
                        <span className="text-ink-3">Sans compte</span>
                      )}
                    </td>
                    <td className="tnum px-3 py-3 text-ink-2">
                      {employee.phone ?? (
                        <span className="text-ink-3">Non renseigné</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-2">
                      {employee.locationName ? (
                        <>
                          {employee.locationName}
                          {employee.teamName ? ` / ${employee.teamName}` : ''}
                        </>
                      ) : (
                        <Badge tone="warn">Sans contrat</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {invitation ? (
                        <Badge tone={invitation.tone}>{invitation.label}</Badge>
                      ) : (
                        <span className="text-micro text-ink-3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageBody>
  );
}
