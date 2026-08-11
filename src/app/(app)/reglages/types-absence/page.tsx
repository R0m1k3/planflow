import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import {
  AddAbsenceTypeForm,
  EditAbsenceTypeForm,
} from '@/app/(app)/reglages/types-absence/AbsenceTypeForms';
import {
  archiveAbsenceTypeAction,
  listAbsenceTypes,
  type AbsenceTypeRow,
} from '@/server/settings/absence-types';

export const metadata = { title: 'Types d’absence · PlanFlow' };
export const dynamic = 'force-dynamic';

function Summary({ row }: { row: AbsenceTypeRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone={row.isPaid ? 'ok' : 'neutral'}>
        {row.isPaid ? 'Rémunérée' : 'Non rémunérée'}
      </Badge>
      {row.isSocialSecurity ? <Badge tone="info">Sécurité sociale</Badge> : null}
      {row.countsAsWorkTime ? <Badge tone="neutral">Temps de travail</Badge> : null}
      {row.affectsPaidLeaveAccrual ? (
        <Badge tone="neutral">Acquisition CP</Badge>
      ) : null}
      {row.requiresJustification ? (
        <Badge tone="warn">Justificatif</Badge>
      ) : null}
      {row.silaeCode ? (
        <Badge tone="neutral">AB-{row.silaeCode}</Badge>
      ) : (
        <Badge tone="danger">Code Silae manquant</Badge>
      )}
    </div>
  );
}

export default async function TypesAbsencePage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string }>;
}) {
  const { archives } = await searchParams;
  const showArchived = archives === '1';
  const types = await listAbsenceTypes(showArchived);
  const active = types.filter((type) => type.archivedAt === null);
  const missingSilae = active.filter((type) => !type.silaeCode).length;

  return (
    <PageBody>
      <PageHeader
        title="Types d’absence"
        subtitle={`${active.length} type${active.length > 1 ? 's' : ''} en vigueur`}
      />

      {missingSilae > 0 ? (
        <p
          role="status"
          className="rounded-2 border border-warn bg-warn-soft px-3 py-2 text-xs text-warn-soft-ink"
        >
          {missingSilae} type{missingSilae > 1 ? 's' : ''} sans code Silae.
          L’export d’une période contenant ces absences échouera, avec la liste
          des manques — aucun fichier partiel n’est produit.
        </p>
      ) : null}

      <Card>
        <CardHeader
          title="Référentiel"
          action={
            <a
              href={
                showArchived
                  ? '/reglages/types-absence'
                  : '/reglages/types-absence?archives=1'
              }
              className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink-1"
            >
              {showArchived ? 'Masquer les archivés' : 'Voir les archivés'}
            </a>
          }
        />

        {types.length === 0 ? (
          <EmptyState
            title="Aucun type d’absence"
            description="Sans type, aucune demande n’est saisissable. Commencez par le congé payé."
          />
        ) : (
          <ul className="divide-y divide-line-1">
            {types.map((type) => (
              <li key={type.id} className="px-4 py-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{type.code}</Badge>
                  <span className="text-sm font-semibold">{type.name}</span>
                  <Badge tone="neutral">
                    {type.timeOffCount} absence
                    {type.timeOffCount > 1 ? 's' : ''}
                  </Badge>
                  {type.archivedAt ? <Badge tone="warn">Archivé</Badge> : null}
                  <span className="flex-1" />
                  <form action={archiveAbsenceTypeAction}>
                    <input type="hidden" name="id" value={type.id} />
                    {type.archivedAt ? (
                      <input type="hidden" name="restore" value="1" />
                    ) : null}
                    <Button size="sm" variant="ghost" type="submit">
                      {type.archivedAt ? 'Rétablir' : 'Archiver'}
                    </Button>
                  </form>
                </div>

                <div className="mb-3">
                  <Summary row={type} />
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-xs text-ink-2 underline underline-offset-2">
                    Modifier
                  </summary>
                  <div className="pt-3">
                    <EditAbsenceTypeForm row={type} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Nouveau type" />
        <div className="p-4">
          <AddAbsenceTypeForm />
        </div>
      </Card>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Le code d’un type ne se renomme pas : il est référencé par les absences
        déjà saisies et par la correspondance de paie. Un type devenu inutile
        s’archive — les absences passées gardent alors un libellé lisible et les
        écritures de compteur restent justifiables.
      </p>
    </PageBody>
  );
}
