import Link from 'next/link';

import {
  AnalysisShell,
  shortMonth,
} from '@/app/(app)/rh/analyses/AnalysisShell';
import { SeriesChart } from '@/components/hr/SeriesChart';
import { Card, CardHeader } from '@/components/ui/Card';
import { monthOf } from '@/domain/planning/month';
import { getAnalyticsSeries } from '@/server/hr/analytics';

export const metadata = { title: 'Analyse des absences · PlanFlow' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ etablissement?: string }>;
}

export default async function AbsencesAnalysePage({ searchParams }: PageProps) {
  const { etablissement } = await searchParams;
  const series = await getAnalyticsSeries(monthOf(new Date()), 12, etablissement);
  const last = series.points[series.points.length - 1];

  return (
    <AnalysisShell
      current="absences"
      title="Absences"
      subtitle={
        last?.absenteeismRate === null || last === undefined
          ? 'Taux non calculable'
          : `${last.absenteeismRate} % d’absentéisme ce mois`
      }
      series={series}
      footnote="Le taux rapporte les jours d’absence aux jours théoriquement travaillés, pas aux jours calendaires : rapporter à trente donnerait un taux artificiellement bas et ferait passer un problème réel pour du bruit. La colonne « dont arrêts » agrège les absences relevant de la Sécurité sociale sans jamais nommer de salarié — un taux ne doit pas devenir un moyen d’identifier qui est malade."
    >
      <Card>
        <CardHeader title="Taux d’absentéisme mensuel" />
        <SeriesChart
          tone="warn"
          points={series.points.map((point) => ({
            label: point.label,
            short: shortMonth(point.label),
            value: point.absenteeismRate,
          }))}
          format={(value) => `${value} %`}
        />
      </Card>

      <Card>
        <CardHeader title="Détail mensuel" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-1 text-left">
                {[
                  'Mois',
                  'Jours d’absence',
                  'dont arrêts',
                  'Jours théoriques',
                  'Taux',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-1">
              {[...series.points].reverse().map((point) => (
                <tr key={point.param}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/?mois=${point.param}&liste=absences${series.location ? `&etablissement=${series.location.id}` : ''}`}
                      className="hover:underline"
                    >
                      {point.label}
                    </Link>
                  </td>
                  <td className="px-4 py-2 tnum">{point.absenceDays}</td>
                  <td className="px-4 py-2 tnum">{point.sickDays}</td>
                  <td className="px-4 py-2 tnum">
                    {point.theoreticalWorkedDays}
                  </td>
                  <td className="px-4 py-2 tnum">
                    {point.absenteeismRate === null
                      ? '—'
                      : `${point.absenteeismRate} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AnalysisShell>
  );
}
