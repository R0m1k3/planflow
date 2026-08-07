import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { AddEmployeeForm } from '@/app/(app)/equipe/AddEmployeeForm';
import { listEmployees } from '@/server/employees/queries';

export const metadata = { title: 'Équipe · PlanFlow' };
export const dynamic = 'force-dynamic';

const STATUS_TONES: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Actif', tone: 'ok' },
  INVITED: { label: 'Invitation en attente', tone: 'info' },
  ARCHIVED: { label: 'Archivé', tone: 'neutral' },
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export default async function EquipePage() {
  const employees = await listEmployees();
  const withoutAccount = employees.filter((e) => !e.hasAccount).length;

  return (
    <PageBody>
      <PageHeader
        title="Équipe"
        subtitle={`${employees.length} salarié${employees.length > 1 ? 's' : ''}${
          withoutAccount > 0 ? ` · ${withoutAccount} sans compte applicatif` : ''
        }`}
      />

      <Card>
        <CardHeader title="Effectif" />
        {employees.length === 0 ? (
          <EmptyState
            title="Aucun salarié"
            description="Ajoutez un premier salarié pour commencer à planifier."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line-2 bg-surface-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  <th className="px-4 py-2.5">Collaborateur</th>
                  <th className="px-4 py-2.5">Matricule</th>
                  <th className="px-4 py-2.5">Contrat</th>
                  <th className="px-4 py-2.5">Établissement</th>
                  <th className="px-4 py-2.5">Rôle</th>
                  <th className="px-4 py-2.5">Statut</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const status =
                    STATUS_TONES[employee.status] ?? STATUS_TONES.ACTIVE!;
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
                            className="flex size-7 flex-none items-center justify-center rounded-full bg-surface-3 text-micro font-semibold text-ink-2"
                          >
                            {employee.firstName.charAt(0)}
                            {employee.lastName.charAt(0)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {employee.firstName} {employee.lastName}
                            </span>
                            <span className="block truncate text-micro text-ink-3">
                              {employee.email ?? 'Sans compte applicatif'}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="tnum px-4 py-2.5 text-ink-2">
                        {employee.employeeNumber}
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
                      <td className="px-4 py-2.5 text-ink-2">
                        {employee.locationName ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-ink-2">
                        {employee.roleName}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={status.tone}>{status.label}</Badge>
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
        <CardHeader title="Ajouter un salarié" />
        <div className="p-4">
          <AddEmployeeForm />
        </div>
      </Card>
    </PageBody>
  );
}
