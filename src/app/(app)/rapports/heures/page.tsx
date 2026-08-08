import Link from 'next/link';

import { ActualHoursForm, ValidateRow } from '@/components/hours/ActualHoursForm';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { formatDelta, formatMinutes } from '@/domain/counters/week';
import { monthOf, parseMonthParam } from '@/domain/planning/month';
import { cx } from '@/lib/cx';
import { getHoursReport } from '@/server/hours/queries';

export const metadata = { title: 'Heures travaillées · PlanFlow' };

interface PageProps {
  searchParams: Promise<{ mois?: string; etablissement?: string }>;
}

export default async function HeuresPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const month = parseMonthParam(params.mois) ?? monthOf(new Date());
  const report = await getHoursReport(month, params.etablissement);

  if (!report) {
    return (
      <PageBody>
        <PageHeader
          title="Heures travaillées"
          subtitle="Aucun établissement n'est encore créé."
        />
      </PageBody>
    );
  }

  const href = (mois: string, etablissement = report.location.id) =>
    `/rapports/heures?mois=${mois}&etablissement=${etablissement}`;

  return (
    <PageBody>
      <PageHeader
        title={`Heures travaillées · ${report.label}`}
        subtitle={`${report.location.name} · prévu ${formatMinutes(report.totals.plannedMinutes)} · réalisé ${formatMinutes(report.totals.actualMinutes)} · écart ${formatDelta(report.totals.deltaMinutes)}`}
        actions={
          <>
            <Link
              href={href(report.previousParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              ← Mois précédent
            </Link>
            <Link
              href={href(report.nextParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              Mois suivant →
            </Link>
            <Link
              href="/paie/periodes"
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              Périodes
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {report.locations.map((location) => (
          <Link
            key={location.id}
            href={href(report.monthParam, location.id)}
            aria-current={
              location.id === report.location.id ? 'page' : undefined
            }
            className={
              location.id === report.location.id
                ? 'rounded-2 border border-accent bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-ink'
                : 'rounded-2 border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2'
            }
          >
            {location.name}
          </Link>
        ))}
        {report.lockedLabels.map((label) => (
          <Badge key={label} tone="ok">
            {label} verrouillée
          </Badge>
        ))}
      </div>

      <section className="rounded-3 border border-info bg-info-soft p-4 text-sm text-info-soft-ink">
        <p>
          <strong>Sans heures réelles saisies, le prévu fait foi.</strong>{' '}
          Attendre une saisie qui ne viendra pas ne produirait aucune paie.
        </p>
        <p className="mt-2">
          La validation <strong>qualifie</strong> des heures, elle ne les
          autorise pas à être payées : des heures accomplies partent en paie
          qu’elles soient validées ou non.
        </p>
      </section>

      {report.rows.length === 0 ? (
        <p className="rounded-3 border border-line-1 bg-surface p-4 text-sm text-ink-2">
          Aucun créneau planifié sur cette période.
        </p>
      ) : null}

      {report.rows.map((row) => (
        <section
          key={row.membershipId}
          className="rounded-3 border border-line-1 bg-surface"
        >
          <header className="flex flex-wrap items-center gap-3 border-b border-line-1 px-4 py-2">
            <h2 className="text-sm font-semibold text-ink-1">{row.name}</h2>
            <span className="text-xs text-ink-3">
              prévu <span className="tnum">{formatMinutes(row.plannedMinutes)}</span>
            </span>
            <span className="text-xs text-ink-3">
              réalisé{' '}
              <span className="tnum">{formatMinutes(row.actualMinutes)}</span>
            </span>
            <span
              className={cx(
                'tnum rounded-2 px-1.5 py-0.5 text-xs',
                row.deltaMinutes === 0
                  ? 'text-ink-2'
                  : row.deltaMinutes > 0
                    ? 'bg-warn-soft text-warn-soft-ink'
                    : 'bg-danger-soft text-danger-soft-ink',
              )}
            >
              {formatDelta(row.deltaMinutes)}
            </span>
            <Badge tone={row.allValidated ? 'ok' : 'neutral'}>
              {row.allValidated ? 'Validé' : 'À valider'}
            </Badge>
            <span className="ml-auto text-xs text-ink-2">
              payé <span className="tnum font-semibold">
                {formatMinutes(row.payableMinutes)}
              </span>
            </span>
          </header>

          <table className="w-full border-collapse text-xs">
            <caption className="sr-only">
              Heures de {row.name}, {report.label}
            </caption>
            <thead>
              <tr className="border-b border-line-1 text-left text-micro text-ink-3 uppercase">
                <th className="px-4 py-1.5 font-semibold">Jour</th>
                <th className="px-2 py-1.5 font-semibold">Prévu</th>
                <th className="px-2 py-1.5 font-semibold">Réalisé</th>
                <th className="px-2 py-1.5 text-right font-semibold">Écart</th>
                <th className="px-2 py-1.5 font-semibold">Saisie</th>
              </tr>
            </thead>
            <tbody>
              {row.shifts.map((shift) => (
                <tr
                  key={shift.id}
                  className="border-b border-line-1 last:border-b-0"
                >
                  <td className="tnum px-4 py-1.5 text-ink-2">
                    {shift.localDate.split('-').reverse().join('/')}
                  </td>
                  <td className="tnum px-2 py-1.5 text-ink-2">
                    {shift.plannedRange}{' '}
                    <span className="text-ink-3">
                      ({formatMinutes(shift.plannedMinutes)})
                    </span>
                  </td>
                  <td className="tnum px-2 py-1.5 text-ink-1">
                    {shift.hasActual ? (
                      <>
                        {shift.actualRange}{' '}
                        <span className="text-ink-3">
                          ({formatMinutes(shift.actualMinutes)})
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-3">
                        prévu retenu ({formatMinutes(shift.actualMinutes)})
                      </span>
                    )}
                  </td>
                  <td
                    className={cx(
                      'tnum px-2 py-1.5 text-right',
                      shift.deltaMinutes === 0 ? 'text-ink-3' : 'text-ink-1',
                    )}
                  >
                    {shift.deltaMinutes === 0 ? '—' : formatDelta(shift.deltaMinutes)}
                  </td>
                  <td className="px-2 py-1.5">
                    {report.canEdit ? (
                      <ActualHoursForm shift={shift} />
                    ) : (
                      <span className="text-micro text-ink-3">
                        Lecture seule
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {report.canValidate ? (
            <div className="border-t border-line-1 px-4 py-2">
              <ValidateRow
                shiftIds={row.shifts
                  .filter((shift) => !shift.locked)
                  .map((shift) => shift.id)}
                allValidated={row.allValidated}
              />
            </div>
          ) : null}
        </section>
      ))}
    </PageBody>
  );
}
