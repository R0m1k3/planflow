import { AbsenceQueueView } from '@/components/absences/AbsenceQueue';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { getAbsenceQueue } from '@/server/absences/queries';

export const metadata = { title: 'Demandes à traiter · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function ATraiterPage() {
  const result = await getAbsenceQueue('pending');

  return (
    <PageBody>
      <PageHeader
        title="Demandes à traiter"
        subtitle={
          result.rows.length === 0
            ? 'Aucune demande en attente'
            : `${result.rows.length} demande${result.rows.length > 1 ? 's' : ''} en attente, la plus ancienne en premier`
        }
      />

      <AbsenceQueueView
        result={result}
        title="File d’attente"
        description="Aucune demande en attente de décision."
      />

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Les demandes sont classées par ancienneté : celle qui attend depuis le
        plus longtemps arrive en tête. Accepter écrit au registre des compteurs ;
        annuler ensuite contre-passe l’écriture plutôt que de l’effacer, et le
        solde revient au même chiffre.
      </p>
    </PageBody>
  );
}
