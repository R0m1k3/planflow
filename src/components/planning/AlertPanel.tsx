import { Badge, type Tone } from '@/components/ui/Badge';
import type { BoardAlert } from '@/server/planning/queries';

/**
 * Panneau des constats de convention — PLAN.md §6.5.
 *
 * Trois choix délibérés :
 *
 * - Les constats sont **listés**, pas comptés. « 3 alertes » n'aide personne ;
 *   « repos de 9 h 30 entre mardi et mercredi » se corrige.
 * - Un constat acquitté reste affiché, avec son motif. Le faire disparaître
 *   donnerait l'illusion qu'il a été résolu alors qu'il a été assumé.
 * - Les informatives (dimanche, jour férié) sont montrées à part : ce ne sont
 *   pas des anomalies mais des contreparties à ne pas oublier en paie.
 */

export interface AlertPanelProps {
  alerts: BoardAlert[];
  /** Nom affichable par membership, pour situer chaque constat. */
  names: Map<string, string>;
}

const SEVERITY_TONE: Record<BoardAlert['severity'], Tone> = {
  BLOCKING: 'danger',
  WARNING: 'warn',
  INFO: 'info',
};

const SEVERITY_LABEL: Record<BoardAlert['severity'], string> = {
  BLOCKING: 'Bloquant',
  WARNING: 'Alerte',
  INFO: 'À reporter en paie',
};

export function AlertPanel({ alerts, names }: AlertPanelProps) {
  if (alerts.length === 0) return null;

  const anomalies = alerts.filter((alert) => alert.severity !== 'INFO');
  const informative = alerts.filter((alert) => alert.severity === 'INFO');

  return (
    <section className="rounded-3 border border-line-1 bg-surface">
      <h3 className="border-b border-line-1 px-4 py-2 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
        Convention collective
      </h3>

      <ul className="divide-y divide-line-1">
        {[...anomalies, ...informative].map((alert) => (
          <li key={alert.id} className="flex flex-wrap items-start gap-2 px-4 py-2.5">
            <Badge tone={SEVERITY_TONE[alert.severity]}>
              {SEVERITY_LABEL[alert.severity]}
            </Badge>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-1">{alert.message}</p>
              <p className="mt-0.5 text-micro text-ink-3">
                {[
                  alert.membershipId
                    ? (names.get(alert.membershipId) ?? 'Salarié')
                    : null,
                  alert.localDate,
                  alert.ruleCode,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {alert.acknowledged ? (
                <p className="mt-1 rounded-2 bg-surface-2 px-2 py-1 text-micro text-ink-2">
                  Publié malgré l’alerte
                  {alert.acknowledgementReason
                    ? ` — ${alert.acknowledgementReason}`
                    : ''}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
