import Link from 'next/link';

import { PrintButton } from '@/components/planning/PrintButton';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { can } from '@/domain/access/authorize';
import { formatMinutes } from '@/domain/counters/week';
import { displayName, type BoardRow } from '@/domain/planning/board';
import { absenceOnDay } from '@/domain/planning/presence';
import { isoWeekOf, parseWeekParam } from '@/domain/planning/week';
import { isPosteCode, posteTokens } from '@/lib/design/postes';
import { requireSession } from '@/server/context';
import { getWeekBoard } from '@/server/planning/queries';

export const metadata = { title: 'Planning · impression · PlanFlow' };

/**
 * Planning à afficher — PLAN.md §9, `/planning/impression`.
 *
 * Ce n'est pas la grille d'édition avec les boutons cachés. C'est une mise en
 * page faite pour la feuille punaisée en salle de pause : toutes les équipes à
 * la suite, pas de panneau d'édition, pas de compteurs — et un seul aplat par
 * créneau, avec l'horaire et le code du poste écrits en toutes lettres.
 *
 * Rien n'est recalculé : le même `getWeekBoard` que les cinq vues. Une feuille
 * imprimée qui contredit l'écran est pire qu'une absence de feuille, parce
 * qu'elle survit à la correction.
 *
 * Le rendu PDF passe par la boîte d'impression du navigateur (voir
 * `PrintButton`) : un second moteur de rendu serait un second endroit où la
 * grille peut diverger.
 */

interface PageProps {
  searchParams: Promise<{ semaine?: string; etablissement?: string }>;
}

function ShiftLine({ shift }: { shift: BoardRow['days'][number][number] }) {
  const tokens = isPosteCode(shift.poste) ? posteTokens(shift.poste) : null;

  return (
    <li
      className="print-keep rounded-2 border px-1.5 py-1 text-micro leading-tight"
      style={
        tokens
          ? {
              background: tokens.bg,
              color: tokens.fg,
              borderColor: tokens.edge,
            }
          : undefined
      }
    >
      <span className="block font-semibold tnum">{shift.time}</span>
      <span className="block">{shift.poste.toUpperCase()}</span>
      {shift.breakMinutes > 0 ? (
        <span className="block tnum">pause {shift.breakMinutes} min</span>
      ) : null}
    </li>
  );
}

export default async function ImpressionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireSession();
  const week = parseWeekParam(params.semaine) ?? isoWeekOf(new Date());
  const board = await getWeekBoard(week, params.etablissement);

  if (!board) {
    return (
      <PageBody>
        <PageHeader
          title="Impression"
          subtitle="Aucun établissement n'est encore créé."
        />
      </PageBody>
    );
  }

  // Sans la capacité de voir le non publié, la feuille ne doit pas la
  // contourner : imprimer un brouillon revient à le publier sur un mur.
  const seeUnpublished = can(session.actor, 'planning.view_unpublished');
  const sections = board.sections.filter(
    (section) =>
      !section.hidden && (seeUnpublished || section.status === 'PUBLISHED'),
  );

  const hiddenDrafts = board.sections.filter(
    (section) => !section.hidden && section.status !== 'PUBLISHED',
  ).length;

  return (
    <PageBody>
      <div data-print="hide">
        <PageHeader
          title={`Planning à afficher · semaine ${week.isoWeek}`}
          subtitle={`${board.location.name} · ${formatMinutes(board.totals.plannedMinutes)} planifiées`}
          actions={
            <>
              <Link
                href={`/planning/semaine?semaine=${board.weekParam}&etablissement=${board.location.id}`}
                className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
              >
                Retour à la grille
              </Link>
              <PrintButton label="Imprimer la semaine" />
            </>
          }
        />
      </div>

      <p className="text-sm text-ink-2">
        {board.location.name} — semaine {week.isoWeek}, {board.label}
      </p>

      {hiddenDrafts > 0 && seeUnpublished ? (
        <p
          data-print="hide"
          role="status"
          className="rounded-2 border border-warn bg-warn-soft px-3 py-2 text-xs text-warn-soft-ink"
        >
          {hiddenDrafts} équipe{hiddenDrafts > 1 ? 's' : ''} non publiée
          {hiddenDrafts > 1 ? 's' : ''} figure
          {hiddenDrafts > 1 ? 'nt' : ''} sur cette feuille. Un planning affiché
          en salle vaut information des salariés : publiez avant d’imprimer.
        </p>
      ) : null}

      {sections.length === 0 ? (
        <Card>
          <EmptyState
            title="Rien à imprimer"
            description="Aucune équipe publiée sur cette semaine."
          />
        </Card>
      ) : null}

      {sections.map((section) => (
        <Card key={section.teamId} className="print-keep">
          <CardHeader
            title={section.teamName}
            badge={
              section.status === 'PUBLISHED' ? (
                <Badge tone="ok">Publié</Badge>
              ) : (
                <Badge tone="warn">Brouillon</Badge>
              )
            }
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-b border-line-1">
                  <th className="w-48 px-3 py-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                    Salarié
                  </th>
                  {board.headings.map((heading) => (
                    <th
                      key={heading}
                      className="px-2 py-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-1">
                {[
                  ...section.rows,
                  ...(section.unassignedRow ? [section.unassignedRow] : []),
                ].map((row) => (
                  <tr key={row.membershipId ?? 'non-assignes'} className="print-keep">
                    <th className="px-3 py-2 text-left align-top font-medium">
                      {displayName(row)}
                      <span className="block text-micro font-normal text-ink-3">
                        {row.unassigned ? 'À pourvoir' : row.job}
                      </span>
                    </th>

                    {board.dates.map((date, index) => {
                      const absence = absenceOnDay(row, index);
                      const shifts = row.days[index] ?? [];

                      return (
                        <td key={date} className="px-2 py-2 align-top">
                          {absence ? (
                            <span className="block rounded-2 border border-line-2 bg-surface-2 px-1.5 py-1 text-micro">
                              {absence.label}
                            </span>
                          ) : shifts.length === 0 ? (
                            <span className="text-micro text-ink-3">—</span>
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {shifts.map((shift) => (
                                <ShiftLine key={shift.id} shift={shift} />
                              ))}
                            </ul>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <p className="text-micro text-ink-3">
        Édité depuis PlanFlow · {board.location.name} · semaine {week.isoWeek}.
        Les horaires font foi tels qu’ils étaient à l’édition ; une modification
        postérieure du planning n’apparaît pas sur cette feuille.
      </p>
    </PageBody>
  );
}
