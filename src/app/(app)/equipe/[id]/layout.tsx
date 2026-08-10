import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { MemberTabs } from '@/app/(app)/equipe/[id]/MemberTabs';
import { PageBody } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { getEmployee, getMemberPlacement } from '@/server/employees/queries';

export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' });

/**
 * Gabarit de la fiche salarié.
 *
 * Le bandeau et les onglets sont tenus ici, et non répétés dans chaque onglet :
 * ils ne changent pas d'un onglet à l'autre, et les rejouer ferait clignoter
 * l'identité de la personne consultée à chaque navigation.
 */
export default async function MemberLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployee(id);
  if (!employee) notFound();

  const placement = await getMemberPlacement(id);
  const primaryTeam =
    placement?.teams.find((team) => team.isPrimary) ?? placement?.teams[0];

  return (
    <PageBody>
      <header className="rounded-3 bg-surface-2 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span
            aria-hidden
            className="flex size-14 flex-none items-center justify-center rounded-full bg-accent-soft text-md font-semibold text-accent-soft-ink"
          >
            {employee.firstName.charAt(0)}
            {employee.lastName.charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.018em]">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="mt-0.5 text-sm text-ink-2">
              {employee.headline.jobTitle ??
                `Matricule ${employee.employeeNumber}`}
            </p>
          </div>
          <span className="flex-1" />
          <div className="flex flex-wrap items-center gap-2">
            {!employee.hasAccount ? (
              <Badge tone="info">Sans accès applicatif</Badge>
            ) : null}
            <Badge tone="accent">{employee.roleName}</Badge>
          </div>
        </div>

        <dl className="mt-6 grid gap-x-6 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
          <HeadlineItem
            label="Début du contrat"
            value={
              employee.contract
                ? dateFormat.format(employee.contract.since)
                : null
            }
          />
          <HeadlineItem
            label="Fin du contrat"
            value={
              employee.headline.contractEnd
                ? dateFormat.format(employee.headline.contractEnd)
                : null
            }
          />
          <HeadlineItem
            label="Type de contrat"
            value={employee.contract?.label ?? null}
          />
          <HeadlineItem
            label="Établissement"
            value={employee.locationName}
          />
          <HeadlineItem label="Équipe" value={primaryTeam?.name ?? null} />
          <HeadlineItem
            label="Responsable hiérarchique"
            value={employee.headline.lineManagerName}
          />
        </dl>
      </header>

      <MemberTabs id={id} />

      {children}
    </PageBody>
  );
}

/** Un tiret, et non « non renseigné » : le bandeau se lit d'un balayage. */
function HeadlineItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-micro font-semibold text-ink-1">{label}</dt>
      <dd className="mt-1 truncate text-sm text-ink-2">{value ?? '—'}</dd>
    </div>
  );
}
