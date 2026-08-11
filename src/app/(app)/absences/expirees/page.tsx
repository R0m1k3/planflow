import { AbsenceQueueView } from '@/components/absences/AbsenceQueue';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { getAbsenceQueue } from '@/server/absences/queries';

export const metadata = { title: 'Absences expirées · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function ExpireesPage() {
  const result = await getAbsenceQueue('expired');

  return (
    <PageBody>
      <PageHeader
        title="Absences expirées"
        subtitle="Demandes dont la date est passée sans décision"
      />

      <AbsenceQueueView
        result={result}
        title="Demandes expirées"
        description="Aucune demande n’a expiré."
      />

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Une demande expirée n’a jamais été décidée : elle n’a donc rien écrit au
        registre des compteurs, et le solde du salarié n’en porte aucune trace.
        Elle reste visible parce qu’une absence non traitée à temps est un fait
        opposable — au salarié qui l’a demandée comme à l’employeur qui ne l’a
        pas tranchée.
      </p>
    </PageBody>
  );
}
