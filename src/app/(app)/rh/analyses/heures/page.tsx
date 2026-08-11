import {
  AnalysisShell,
  shortMonth,
} from '@/app/(app)/rh/analyses/AnalysisShell';
import { SeriesChart } from '@/components/hr/SeriesChart';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatMinutes } from '@/domain/counters/week';
import { monthOf } from '@/domain/planning/month';
import { getAnalyticsSeries } from '@/server/hr/analytics';

export const metadata = { title: 'Analyse des heures · PlanFlow' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ etablissement?: string }>;
}

export default async function HeuresPage({ searchParams }: PageProps) {
  const { etablissement } = await searchParams;
  const series = await getAnalyticsSeries(monthOf(new Date()), 12, etablissement);
  const last = series.points[series.points.length - 1];

  return (
    <AnalysisShell
      current="heures"
      title="Heures"
      subtitle={
        last ? `${formatMinutes(last.plannedMinutes)} planifiées ce mois` : '—'
      }
      series={series}
      footnote="Le prévu et le réalisé sont deux états distincts du temps, et l’écart entre les deux est ce qu’un contrôle demande à justifier. Quand aucune heure réelle n’a été saisie sur un créneau, le prévu fait foi : laisser un zéro creuserait un écart qui n’existe pas."
    >
      <Card>
        <CardHeader title="Heures planifiées par mois" />
        <SeriesChart
          points={series.points.map((point) => ({
            label: point.label,
            short: shortMonth(point.label),
            value: Math.round(point.plannedMinutes / 60),
          }))}
          format={(value) => `${value} h`}
        />
      </Card>

      <Card>
        <CardHeader
          title="Prévu et réalisé"
          badge={<Badge tone="neutral">12 mois</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-1 text-left">
                {['Mois', 'Planifié', 'Réalisé', 'Écart', 'Effectif moyen'].map(
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
              {[...series.points].reverse().map((point) => {
                const delta = point.actualMinutes - point.plannedMinutes;
                return (
                  <tr key={point.param}>
                    <td className="px-4 py-2">{point.label}</td>
                    <td className="px-4 py-2 tnum">
                      {formatMinutes(point.plannedMinutes)}
                    </td>
                    <td className="px-4 py-2 tnum">
                      {formatMinutes(point.actualMinutes)}
                    </td>
                    <td className="px-4 py-2 tnum">
                      {delta === 0 ? (
                        '—'
                      ) : (
                        <Badge tone={delta > 0 ? 'warn' : 'info'}>
                          {delta > 0 ? '+' : '−'}
                          {formatMinutes(Math.abs(delta))}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 tnum">{point.averageHeadcount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AnalysisShell>
  );
}
