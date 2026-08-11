import Link from 'next/link';

import { PrintButton } from '@/components/planning/PrintButton';
import { TeamSection } from '@/components/planning/TeamSection';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { can } from '@/domain/access/authorize';
import { formatMinutes } from '@/domain/counters/week';
import { isoWeekOf, parseWeekParam } from '@/domain/planning/week';
import { POSTE_CODES, POSTE_LABELS, posteTokens } from '@/lib/design/postes';
import { requireSession } from '@/server/context';
import { getWeekBoard } from '@/server/planning/queries';

export const metadata = { title: 'Planning · semaine · PlanFlow' };

interface PageProps {
  searchParams: Promise<{ semaine?: string; etablissement?: string }>;
}

export default async function SemainePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireSession();

  // Semaine courante par défaut : ouvrir le planning sur une semaine arbitraire
  // obligerait à naviguer avant de voir quoi que ce soit d'utile.
  const week = parseWeekParam(params.semaine) ?? isoWeekOf(new Date());
  const board = await getWeekBoard(week, params.etablissement);

  if (!board) {
    return (
      <PageBody>
        <PageHeader
          title="Planning"
          subtitle="Aucun établissement n'est encore créé."
        />
        <p className="text-sm text-ink-2">
          Créez un établissement dans{' '}
          <Link href="/reglages/etablissements" className="underline">
            Réglages · Établissements
          </Link>{' '}
          pour commencer à planifier.
        </p>
      </PageBody>
    );
  }

  const canEdit = can(session.actor, 'planning.create');
  const canPublish = can(session.actor, 'planning.publish');
  const canDuplicate = can(session.actor, 'planning.duplicate');
  const href = (semaine: string, etablissement = board.location.id) =>
    `/planning/semaine?semaine=${semaine}&etablissement=${etablissement}`;

  return (
    <PageBody>
      <PageHeader
        title={`Planning · semaine ${week.isoWeek}`}
        subtitle={`${board.location.name} · ${board.label.split('·')[1]?.trim()} · ${formatMinutes(board.totals.plannedMinutes)} planifiées`}
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
            <PrintButton label="Imprimer la semaine" />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2" data-print="hide">
        {board.locations.map((location) => (
          <Link
            key={location.id}
            href={href(board.weekParam, location.id)}
            aria-current={
              location.id === board.location.id ? 'page' : undefined
            }
            className={
              location.id === board.location.id
                ? 'rounded-2 border border-accent bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-ink'
                : 'rounded-2 border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2'
            }
          >
            {location.name}
          </Link>
        ))}
        {board.totals.unassigned > 0 ? (
          <Badge tone="warn">
            {board.totals.unassigned} besoin
            {board.totals.unassigned > 1 ? 's' : ''} non couvert
            {board.totals.unassigned > 1 ? 's' : ''}
          </Badge>
        ) : null}
      </div>

      {/* Le planning s'ordonne par équipe : sans équipe, il n'y a pas de ligne
          où poser un créneau, même quand des salariés sont rattachés à
          l'établissement. Dire ce qui manque ne suffit pas — l'écran dit aussi
          où le créer, sans quoi le message se lit « il n'y a personne ». */}
      {board.sections.length === 0 ? (
        <div className="rounded-3 border border-line-1 bg-surface p-4 text-sm text-ink-2">
          <p className="mb-1 font-medium text-ink-1">
            Cet établissement n’a pas encore d’équipe.
          </p>
          <p>
            Le planning se construit équipe par équipe : chacune porte son propre
            état de publication. Créez-en une dans{' '}
            <Link
              href="/reglages/etablissements"
              className="underline underline-offset-2"
            >
              Réglages · Établissements
            </Link>
            , puis rattachez-y les salariés depuis l’onglet « Planification et
            accès » de leur fiche.
          </p>
        </div>
      ) : null}

      {board.sections.map((section) => (
        <TeamSection
          key={section.teamId}
          section={section}
          days={board.headings}
          dates={board.dates}
          labels={board.labels}
          weekParam={board.weekParam}
          previousParam={board.previousParam}
          canEdit={canEdit}
          canPublish={canPublish}
          canDuplicate={canDuplicate}
        />
      ))}

      <PosteLegend />
    </PageBody>
  );
}

/**
 * Légende des postes.
 *
 * Elle n'est pas décorative : la couleur seule ne dit pas quel poste est
 * lequel, et le code à trois lettres imprimé dans chaque bloc n'a de sens que
 * si sa correspondance est visible sur la même page.
 */
function PosteLegend() {
  return (
    <section className="rounded-3 border border-line-1 bg-surface p-4">
      <h2 className="mb-3 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
        Postes
      </h2>
      <ul className="flex flex-wrap gap-2">
        {POSTE_CODES.map((code) => {
          const tokens = posteTokens(code);
          return (
            <li
              key={code}
              className="flex items-center gap-1.5 rounded-2 px-2 py-1 text-micro"
              style={{
                background: tokens.bg,
                color: tokens.fg,
                border: `1px solid ${tokens.edge}`,
              }}
            >
              <span className="font-semibold tracking-wide">
                {code.toUpperCase()}
              </span>
              <span>{POSTE_LABELS[code]}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
