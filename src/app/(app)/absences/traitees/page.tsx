import Link from 'next/link';

import { AbsenceQueueView } from '@/components/absences/AbsenceQueue';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { getAbsenceQueue } from '@/server/absences/queries';

export const metadata = { title: 'Absences traitées · PlanFlow' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ nature?: string }>;
}

export default async function TraiteesPage({ searchParams }: PageProps) {
  const { nature } = await searchParams;
  // Filtre relevé à l'audit des menus : « Toutes les absences » ou
  // « Uniquement les absences Sécurité sociale ». Deux valeurs, pas trois.
  const socialSecurityOnly = nature === 'ss';
  const result = await getAbsenceQueue('treated', { socialSecurityOnly });

  const tab = (value: string | null, label: string) => {
    const active = (value === 'ss') === socialSecurityOnly;
    return (
      <Link
        href={value ? `/absences/traitees?nature=${value}` : '/absences/traitees'}
        aria-current={active ? 'page' : undefined}
        className={
          active
            ? 'flex h-7 items-center rounded-2 border border-line-3 bg-surface-2 px-2.5 text-xs font-medium text-ink-1'
            : 'flex h-7 items-center rounded-2 px-2.5 text-xs text-ink-2 hover:bg-surface-2'
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <PageBody>
      <PageHeader
        title="Absences traitées"
        subtitle="Décisions rendues : acceptées, refusées et annulées"
      />

      <AbsenceQueueView
        result={result}
        title="Décisions rendues"
        description="Aucune absence traitée pour ce filtre."
        filterBar={
          <div className="flex flex-wrap items-center gap-1">
            {tab(null, 'Toutes les absences')}
            {tab('ss', 'Uniquement Sécurité sociale')}
          </div>
        }
      />

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Le motif d’une absence Sécurité sociale est une donnée de santé : il
        n’apparaît qu’aux personnes habilitées à lire les pièces du dossier. Pour
        les autres, la ligne dit « Absence » et rien de plus.
      </p>
    </PageBody>
  );
}
