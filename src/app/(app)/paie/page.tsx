import Link from 'next/link';

import { ExportButton } from '@/components/payroll/ExportButton';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatMinutes } from '@/domain/counters/week';
import { monthOf, parseMonthParam } from '@/domain/planning/month';
import { minutesToDecimalHours } from '@/domain/payroll/silae';
import { cx } from '@/lib/cx';
import { getPayrollPeriod } from '@/server/payroll/queries';

export const metadata = { title: 'Paie · PlanFlow' };

interface PageProps {
  searchParams: Promise<{ mois?: string; etablissement?: string }>;
}

export default async function PaiePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = parseMonthParam(params.mois) ?? monthOf(new Date());
  const period = await getPayrollPeriod(month, params.etablissement);

  if (!period) {
    return (
      <PageBody>
        <PageHeader
          title="Paie"
          subtitle="Aucun établissement, ou aucune convention chargée pour cette période."
        />
      </PageBody>
    );
  }

  const href = (mois: string, etablissement = period.location.id) =>
    `/paie?mois=${mois}&etablissement=${etablissement}`;

  return (
    <PageBody>
      <PageHeader
        title={`Paie · ${period.label}`}
        subtitle={`${period.location.name} · ${period.rows.length} salarié${period.rows.length > 1 ? 's' : ''} · période du ${period.startDate.split('-').reverse().join('/')} au ${period.endDate.split('-').reverse().join('/')}`}
        actions={
          <>
            <Link
              href={href(period.previousParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              ← Mois précédent
            </Link>
            <Link
              href={href(period.nextParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              Mois suivant →
            </Link>
            <Link
              href="/paie/silae"
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              Codes Silae
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {period.locations.map((location) => (
          <Link
            key={location.id}
            href={href(period.monthParam, location.id)}
            aria-current={
              location.id === period.location.id ? 'page' : undefined
            }
            className={
              location.id === period.location.id
                ? 'rounded-2 border border-accent bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-ink'
                : 'rounded-2 border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2'
            }
          >
            {location.name}
          </Link>
        ))}
      </div>

      {period.blockers.length > 0 ? (
        <section className="rounded-3 border border-warn bg-warn-soft p-4">
          <h2 className="text-sm font-semibold text-warn-soft-ink">
            L’export est bloqué tant que ces points ne sont pas réglés
          </h2>
          {/* Lister plutôt que compter : « 4 anomalies » n'aide personne à
              produire la paie du mois. */}
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-warn-soft-ink">
            {period.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-warn-soft-ink">
            Un fichier partiel se charge sans erreur dans Silae et rend la paie
            fausse pour les salariés qui en sont absents. L’export refuse donc
            de produire quoi que ce soit tant qu’il manque un matricule ou un
            code.
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-3">
          Les heures viennent du réalisé quand il est saisi, du planifié sinon.
        </p>
        <ExportButton
          month={period.monthParam}
          locationId={period.location.id}
          disabled={period.blockers.length > 0}
        />
      </div>

      {period.rows.length === 0 ? (
        <p className="rounded-3 border border-line-1 bg-surface p-4 text-sm text-ink-2">
          Aucun élément de paie sur cette période.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3 border border-line-1 bg-surface">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Éléments de paie par salarié, {period.label}
            </caption>
            <thead>
              <tr className="border-b border-line-2 bg-surface-2 text-left">
                <th scope="col" className="px-3 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Salarié
                </th>
                <th scope="col" className="px-3 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Matricule Silae
                </th>
                <th scope="col" className="px-3 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Élément
                </th>
                <th scope="col" className="px-3 py-2 text-right text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Valeur
                </th>
                <th scope="col" className="px-3 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Code
                </th>
              </tr>
            </thead>
            <tbody>
              {period.rows.flatMap((row) =>
                row.elements.map((element, index) => (
                  <tr
                    key={`${row.membershipId}-${element.key}`}
                    className={cx(
                      'border-b border-line-1 last:border-b-0',
                      index === 0 && 'border-t border-line-2',
                    )}
                  >
                    <th
                      scope="row"
                      className="px-3 py-1.5 text-left font-medium text-ink-1"
                    >
                      {index === 0 ? row.name : ''}
                      {index === 0 && row.forfaitJours ? (
                        <Badge tone="info" className="ml-2">
                          Forfait jours
                        </Badge>
                      ) : null}
                    </th>
                    <td className="tnum px-3 py-1.5 text-ink-2">
                      {index === 0
                        ? (row.silaeMatricule ?? (
                            <span className="text-danger">manquant</span>
                          ))
                        : ''}
                    </td>
                    <td className="px-3 py-1.5 text-ink-2">{element.label}</td>
                    <td className="tnum px-3 py-1.5 text-right text-ink-1">
                      {element.unit === 'DAYS'
                        ? element.value
                        : `${formatMinutes(element.value)} (${minutesToDecimalHours(element.value)})`}
                    </td>
                    <td className="px-3 py-1.5">
                      {element.silaeCode ? (
                        <span
                          className={cx(
                            'tnum text-xs',
                            element.confirmed ? 'text-ink-2' : 'text-warn-soft-ink',
                          )}
                          title={
                            element.confirmed
                              ? undefined
                              : 'Correspondance non confirmée par le gestionnaire de paie'
                          }
                        >
                          {element.silaeCode}
                          {element.confirmed ? '' : ' ⚠'}
                        </span>
                      ) : (
                        <Link
                          href="/paie/silae"
                          className="text-xs text-danger underline"
                        >
                          à associer
                        </Link>
                      )}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageBody>
  );
}
