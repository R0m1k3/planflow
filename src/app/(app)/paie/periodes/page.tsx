import Link from 'next/link';

import {
  CreatePeriodForm,
  DeletePeriodForm,
  LockButton,
  UnlockForm,
} from '@/components/payroll/PeriodActions';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { getPeriods } from '@/server/payroll/period-queries';

export const metadata = { title: 'Périodes de paie · PlanFlow' };

interface PageProps {
  searchParams: Promise<{ etablissement?: string }>;
}

export default async function PeriodesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const view = await getPeriods(params.etablissement);

  if (!view) {
    return (
      <PageBody>
        <PageHeader
          title="Périodes de paie"
          subtitle="Aucun établissement n'est encore créé."
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title="Périodes de paie"
        subtitle={`${view.location.name} · ${view.periods.length} période${view.periods.length > 1 ? 's' : ''}`}
        actions={
          <Link
            href="/paie"
            className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
          >
            ← Rapport de paie
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {view.locations.map((location) => (
          <Link
            key={location.id}
            href={`/paie/periodes?etablissement=${location.id}`}
            aria-current={location.id === view.location.id ? 'page' : undefined}
            className={
              location.id === view.location.id
                ? 'rounded-2 border border-accent bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-ink'
                : 'rounded-2 border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2'
            }
          >
            {location.name}
          </Link>
        ))}
      </div>

      <CreatePeriodForm
        locationId={view.location.id}
        suggestedMonth={view.suggestedMonth}
      />

      {view.periods.length === 0 ? (
        <p className="rounded-3 border border-line-1 bg-surface p-4 text-sm text-ink-2">
          Aucune période. Verrouiller une période fige les heures transmises au
          cabinet et ferme le mois aux modifications.
        </p>
      ) : null}

      {view.periods.map((period) => {
        const locked = period.status === 'LOCKED';
        const stale = period.exports.filter((entry) => entry.stale).length;

        return (
          <section
            key={period.id}
            className="rounded-3 border border-line-1 bg-surface"
          >
            <header className="flex flex-wrap items-center gap-3 border-b border-line-1 px-4 py-3">
              <h2 className="text-base font-semibold text-ink-1">
                {period.label}
              </h2>
              <Badge tone={locked ? 'ok' : 'warn'}>
                {locked ? 'Verrouillée' : 'Ouverte'}
              </Badge>
              <span className="tnum text-xs text-ink-3">
                {frenchDate(period.startDate)} → {frenchDate(period.endDate)}
              </span>
              {locked ? (
                <span className="text-xs text-ink-3">
                  {period.snapshotCount} instantané
                  {period.snapshotCount > 1 ? 's' : ''}
                </span>
              ) : null}
            </header>

            <div className="flex flex-wrap gap-6 border-b border-line-1 px-4 py-2 text-xs text-ink-2">
              <span>
                Entrées <span className="tnum font-semibold">{period.entries}</span>
              </span>
              <span>
                Sorties <span className="tnum font-semibold">{period.exits}</span>
              </span>
              <span>
                Extras <span className="tnum font-semibold">{period.extras}</span>
              </span>
            </div>

            {stale > 0 ? (
              <p className="border-b border-line-1 bg-warn-soft px-4 py-2 text-xs text-warn-soft-ink">
                {stale} export{stale > 1 ? 's' : ''} périmé{stale > 1 ? 's' : ''} :
                produit{stale > 1 ? 's' : ''} avant le déverrouillage du{' '}
                {period.unlockedAt?.toISOString().slice(0, 10)}, le fichier
                transmis ne correspond plus aux données.
              </p>
            ) : null}

            {period.exports.length > 0 ? (
              <ul className="divide-y divide-line-1 border-b border-line-1">
                {period.exports.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-1.5 text-xs"
                  >
                    <Badge tone={entry.stale ? 'danger' : 'neutral'}>
                      {entry.stale ? 'Périmé' : 'À jour'}
                    </Badge>
                    <span className="tnum text-ink-2">
                      {entry.lineCount} lignes
                    </span>
                    <span className="tnum text-micro text-ink-3">
                      {entry.checksum.slice(0, 16)}…
                    </span>
                    <span className="ml-auto text-micro text-ink-3">
                      {entry.generatedAt.toISOString().slice(0, 16).replace('T', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap items-center gap-4 px-4 py-3">
              {!locked && view.canLock ? (
                <LockButton periodId={period.id} version={period.version} />
              ) : null}
              {locked && view.canUnlock ? (
                <UnlockForm periodId={period.id} version={period.version} />
              ) : null}
              {view.canDelete ? (
                <DeletePeriodForm periodId={period.id} label={period.label} />
              ) : null}
            </div>
          </section>
        );
      })}

      <p className="text-micro text-ink-3">
        Une période verrouillée refuse toute création, modification ou
        suppression de créneau et d’absence sur ses dates. Une correction
        nécessaire passe soit par un déverrouillage justifié, soit par une
        régularisation sur la période suivante — le passé ne se réécrit pas.
      </p>
    </PageBody>
  );
}

function frenchDate(isoDate: string): string {
  return isoDate.split('-').reverse().join('/');
}
