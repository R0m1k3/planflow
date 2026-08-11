import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { formatMinutes } from '@/domain/counters/week';
import { displayName } from '@/domain/planning/board';
import {
  absenceOnDay,
  dayState,
  headcountByDay,
  type DayState,
} from '@/domain/planning/presence';
import { isoWeekOf, parseWeekParam } from '@/domain/planning/week';
import { cx } from '@/lib/cx';
import { getWeekBoard } from '@/server/planning/queries';

export const metadata = { title: 'Planning · présences · PlanFlow' };

/**
 * Vue des présences et absences — cinquième vue de §9.
 *
 * Elle répond à une question que les quatre autres posent mal : **qui est là
 * aujourd'hui ?** La grille hebdomadaire montre des créneaux, pas des
 * personnes ; il faut la lire colonne par colonne et compter de tête.
 *
 * Elle lit le **même modèle** que les autres vues, sans requête propre : une
 * modification faite dans la grille est correcte ici à l'instant même. Une vue
 * qui recalcule ses présences de son côté finit par contredire le planning
 * qu'elle prétend résumer.
 */

interface PageProps {
  searchParams: Promise<{ semaine?: string; etablissement?: string }>;
}

const STATE_TONE: Record<DayState, Tone> = {
  present: 'ok',
  absent: 'warn',
  off: 'neutral',
};

const STATE_LABEL: Record<DayState, string> = {
  present: 'Présent',
  absent: 'Absent',
  off: 'Repos',
};

/**
 * État d'un salarié un jour donné.
 *
 * L'absence l'emporte sur le créneau : un salarié dont l'absence a été acceptée
 * après la construction du planning garde des créneaux en base, et l'afficher
 * « présent » enverrait un manager le chercher en rayon.
 */
export default async function PresencesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const week = parseWeekParam(params.semaine) ?? isoWeekOf(new Date());
  const board = await getWeekBoard(week, params.etablissement);

  if (!board) {
    return (
      <PageBody>
        <PageHeader
          title="Présences et absences"
          subtitle="Aucun établissement n'est encore créé."
        />
      </PageBody>
    );
  }

  const href = (semaine: string, etablissement = board.location.id) =>
    `/planning/presences?semaine=${semaine}&etablissement=${etablissement}`;

  // Les besoins non couverts n'ont personne à compter : ils appartiennent à la
  // grille, pas à un état de présence.
  const sections = board.sections
    .filter((section) => !section.hidden)
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => !row.unassigned),
    }));

  const perDay = headcountByDay(
    sections.flatMap((section) => section.rows),
    board.dates.length,
  ).map((tally, index) => ({ date: board.dates[index] as string, ...tally }));

  return (
    <PageBody>
      <PageHeader
        title={`Présences · semaine ${week.isoWeek}`}
        subtitle={`${board.location.name} · ${formatMinutes(board.totals.plannedMinutes)} planifiées`}
        actions={
          <>
            <Link
              href={href(board.previousParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              ← Semaine précédente
            </Link>
            <Link
              href={href(board.nextParam)}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              Semaine suivante →
            </Link>
          </>
        }
      />

      <Card>
        <CardHeader title="Effectif présent par jour" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-1">
                <th className="px-4 py-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Jour
                </th>
                {board.headings.map((heading) => (
                  <th
                    key={heading}
                    className="px-3 py-2 text-center text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-1">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Présents</th>
                {perDay.map((day) => (
                  <td key={day.date} className="px-3 py-2 text-center tnum">
                    {day.present}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="px-4 py-2 text-left font-medium">Absents</th>
                {perDay.map((day) => (
                  <td
                    key={day.date}
                    className={cx(
                      'px-3 py-2 text-center tnum',
                      day.absent > 0 ? 'text-warn-soft-ink' : 'text-ink-3',
                    )}
                  >
                    {day.absent}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="px-4 py-2 text-left font-medium">Repos</th>
                {perDay.map((day) => (
                  <td
                    key={day.date}
                    className="px-3 py-2 text-center tnum text-ink-3"
                  >
                    {day.off}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {sections.length === 0 ? (
        <Card>
          <EmptyState
            title="Aucune équipe"
            description="Créez une équipe et rattachez-y des salariés pour suivre les présences."
          />
        </Card>
      ) : null}

      {sections.map((section) => (
        <Card key={section.teamId}>
          <CardHeader
            title={section.teamName}
            badge={
              <Badge
                tone={section.status === 'PUBLISHED' ? 'ok' : 'warn'}
              >
                {section.status === 'PUBLISHED' ? 'Publié' : 'Non publié'}
              </Badge>
            }
          />

          {section.rows.length === 0 ? (
            <EmptyState title="Aucun salarié rattaché" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-1">
                    <th className="px-4 py-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
                      Salarié
                    </th>
                    {board.headings.map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-2 text-center text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-1">
                  {section.rows.map((row) => (
                    <tr key={row.membershipId ?? displayName(row)}>
                      <th className="px-4 py-2 text-left font-medium">
                        {row.membershipId ? (
                          <Link
                            href={`/equipe/${row.membershipId}`}
                            className="hover:underline"
                          >
                            {displayName(row)}
                          </Link>
                        ) : (
                          displayName(row)
                        )}
                        <span className="block text-micro font-normal text-ink-3">
                          {row.job}
                        </span>
                      </th>

                      {board.dates.map((date, index) => {
                        const state = dayState(row, index);
                        const absence = absenceOnDay(row, index);
                        return (
                          <td key={date} className="px-3 py-2 text-center">
                            <Badge tone={STATE_TONE[state]}>
                              {absence ? absence.label : STATE_LABEL[state]}
                            </Badge>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ))}

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Une absence acceptée l’emporte sur les créneaux restés au planning : un
        salarié dont le congé a été validé après la construction de la semaine
        apparaît absent, même si ses créneaux n’ont pas encore été retirés.
        L’inverse enverrait un responsable le chercher en rayon.
      </p>
    </PageBody>
  );
}
