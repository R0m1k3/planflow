import Link from 'next/link';

import {
  AnalysisShell,
  shortMonth,
} from '@/app/(app)/rh/analyses/AnalysisShell';
import { SeriesChart } from '@/components/hr/SeriesChart';
import { Card, CardHeader } from '@/components/ui/Card';
import { monthOf } from '@/domain/planning/month';
import { getAnalyticsSeries } from '@/server/hr/analytics';

export const metadata = { title: 'Analyse des effectifs · PlanFlow' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ etablissement?: string }>;
}

export default async function EffectifsPage({ searchParams }: PageProps) {
  const { etablissement } = await searchParams;
  const series = await getAnalyticsSeries(monthOf(new Date()), 12, etablissement);
  const last = series.points[series.points.length - 1];

  return (
    <AnalysisShell
      current="effectifs"
      title="Effectifs"
      subtitle={`${last?.closingHeadcount ?? 0} salariés en fin de mois`}
      series={series}
      footnote="Le taux de rotation rapporte la moyenne des entrées et des sorties à l’effectif moyen : ne compter que les départs sous-estimerait une équipe qui recrute autant qu’elle perd. Sur un effectif nul il n’est pas calculé — « 0 % » y serait une affirmation fausse, pas une absence de mouvement."
    >
      <Card>
        <CardHeader title="Effectif en fin de mois" />
        <SeriesChart
          points={series.points.map((point) => ({
            label: point.label,
            short: shortMonth(point.label),
            value: point.closingHeadcount,
          }))}
          format={(value) => String(value)}
        />
      </Card>

      <Card>
        <CardHeader title="Détail mensuel" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-1 text-left">
                {['Mois', 'Fin de mois', 'Moyen', 'Entrées', 'Sorties', 'Rotation'].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-4 py-2 text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-1">
              {[...series.points].reverse().map((point) => (
                <tr key={point.param}>
                  <td className="px-4 py-2">
                    {/* Chaque chiffre mène à ses lignes sources : un indicateur
                        qu'on ne peut pas ouvrir ne se corrige pas, il se
                        conteste. */}
                    <Link
                      href={`/?mois=${point.param}&liste=entrees${series.location ? `&etablissement=${series.location.id}` : ''}`}
                      className="hover:underline"
                    >
                      {point.label}
                    </Link>
                  </td>
                  <td className="px-4 py-2 tnum">{point.closingHeadcount}</td>
                  <td className="px-4 py-2 tnum">{point.averageHeadcount}</td>
                  <td className="px-4 py-2 tnum">{point.entries}</td>
                  <td className="px-4 py-2 tnum">{point.exits}</td>
                  <td className="px-4 py-2 tnum">
                    {point.turnoverRate === null
                      ? '—'
                      : `${point.turnoverRate} %`}
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
