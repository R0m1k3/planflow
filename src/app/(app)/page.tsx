import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge, type Tone } from '@/components/ui/Badge';
import { can } from '@/domain/access/authorize';
import { formatMinutes } from '@/domain/counters/week';
import { monthOf, parseMonthParam } from '@/domain/planning/month';
import { cx } from '@/lib/cx';
import { requireSession } from '@/server/context';
import { getDashboard, type ListKey } from '@/server/hr/queries';

export const metadata = { title: 'Aperçu RH · PlanFlow' };

interface PageProps {
  searchParams: Promise<{
    mois?: string;
    etablissement?: string;
    liste?: string;
  }>;
}

const LIST_LABELS: Record<ListKey, string> = {
  entrees: 'Entrées du mois',
  sorties: 'Sorties du mois',
  essais: 'Fins de période d’essai',
  profils: 'Profils incomplets',
  titres: 'Titres de séjour',
  absences: 'Journal des absences',
  contrats: 'Modifications de contrat',
};

const LIST_KEYS = Object.keys(LIST_LABELS) as ListKey[];

export default async function ApercuPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireSession();

  // Un salarié n'a pas accès à l'annuaire : lui servir une erreur
  // d'autorisation sur la page d'accueil serait absurde. Il voit son propre
  // point d'entrée.
  if (!can(session.actor, 'members.view')) {
    return <EmployeeHome />;
  }

  const month = parseMonthParam(params.mois) ?? monthOf(new Date());
  const board = await getDashboard(month, params.etablissement);

  const selected: ListKey = LIST_KEYS.includes(params.liste as ListKey)
    ? (params.liste as ListKey)
    : 'profils';

  const href = (
    next: Partial<{ mois: string; etablissement: string; liste: string }>,
  ) => {
    const query = new URLSearchParams({
      mois: next.mois ?? board.monthParam,
      liste: next.liste ?? selected,
    });
    const location = next.etablissement ?? board.location?.id;
    if (location) query.set('etablissement', location);
    return `/?${query.toString()}`;
  };

  return (
    <PageBody>
      <PageHeader
        title="Aperçu RH"
        subtitle={`${board.location?.name ?? 'Tous établissements'} · ${board.label}`}
        actions={
          <>
            <Link
              href={href({ mois: board.previousParam })}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              ← Mois précédent
            </Link>
            <Link
              href={href({ mois: board.nextParam })}
              className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
            >
              Mois suivant →
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {board.locations.map((location) => (
          <Link
            key={location.id}
            href={href({ etablissement: location.id })}
            aria-current={
              location.id === board.location?.id ? 'page' : undefined
            }
            className={
              location.id === board.location?.id
                ? 'rounded-2 border border-accent bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-ink'
                : 'rounded-2 border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2'
            }
          >
            {location.name}
          </Link>
        ))}
      </div>

      {/* Chaque tuile est un lien : un indicateur qu'on ne peut pas ouvrir ne
          se corrige pas, il se conteste. */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {board.tiles.map((tile) => (
          <li key={tile.key}>
            <Link
              href={href({ liste: tile.key })}
              aria-current={tile.key === selected ? 'true' : undefined}
              className={cx(
                'flex h-full flex-col gap-1 rounded-3 border bg-surface p-4 transition-colors hover:bg-surface-2',
                tile.key === selected ? 'border-accent' : 'border-line-1',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-1">
                  {tile.label}
                </span>
                <Badge tone={tile.tone as Tone}>{tile.value}</Badge>
              </span>
              <span className="text-micro text-ink-3">{tile.hint}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicator
          label="Effectif en fin de mois"
          value={String(board.indicators.closingHeadcount)}
          hint={`moyenne ${board.indicators.averageHeadcount}`}
        />
        <Indicator
          label="Rotation"
          value={
            board.indicators.turnoverRate === null
              ? '—'
              : `${board.indicators.turnoverRate} %`
          }
          hint={
            board.indicators.turnoverRate === null
              ? 'Effectif nul sur la période'
              : 'Moyenne des entrées et sorties'
          }
        />
        <Indicator
          label="Absentéisme"
          value={
            board.indicators.absenteeismRate === null
              ? '—'
              : `${board.indicators.absenteeismRate} %`
          }
          hint={`${board.indicators.absenceDays} j dont ${board.indicators.sickDays} j d’arrêt`}
        />
        <Indicator
          label="Heures planifiées"
          value={formatMinutes(board.indicators.plannedMinutes)}
          hint={
            board.canSeeCost
              ? board.indicators.labourCost === null
                ? 'Coût indisponible'
                : `coût chargé ${board.indicators.labourCost.toLocaleString('fr-FR')} €`
              : 'Coût masqué'
          }
        />
      </section>

      <section className="rounded-3 border border-line-1 bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-line-1 px-4 py-2">
          <h2 className="text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
            {LIST_LABELS[selected]}
          </h2>
          <span className="text-xs text-ink-3">
            {board.lists[selected].length} ligne
            {board.lists[selected].length > 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex flex-wrap gap-1">
            {LIST_KEYS.map((key) => (
              <Link
                key={key}
                href={href({ liste: key })}
                className={cx(
                  'rounded-2 px-2 py-0.5 text-micro',
                  key === selected
                    ? 'bg-accent-soft text-accent-soft-ink'
                    : 'text-ink-3 hover:bg-surface-2',
                )}
              >
                {LIST_LABELS[key]}
              </Link>
            ))}
          </div>
        </div>

        {board.lists[selected].length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-3">
            Rien à signaler sur cette période.
          </p>
        ) : (
          <ul className="divide-y divide-line-1">
            {board.lists[selected].map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5"
              >
                <Link
                  href={`/equipe/${row.membershipId}`}
                  className="text-sm font-medium text-ink-1 underline-offset-2 hover:underline"
                >
                  {row.name}
                </Link>
                <span className="text-sm text-ink-2">{row.detail}</span>
                {row.date ? (
                  <span className="tnum ml-auto text-xs text-ink-3">
                    {row.date.split('-').reverse().join('/')}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageBody>
  );
}

function Indicator({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3 border border-line-1 bg-surface p-4">
      <p className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
        {label}
      </p>
      <p className="tnum mt-1 text-2xl font-semibold text-ink-1">{value}</p>
      <p className="mt-0.5 text-micro text-ink-3">{hint}</p>
    </div>
  );
}

/**
 * Accueil d'un salarié.
 *
 * Il n'a ni annuaire ni indicateurs : lui servir une erreur d'autorisation sur
 * la page d'accueil serait absurde, et lui montrer un tableau de bord vide le
 * serait tout autant.
 */
function EmployeeHome() {
  return (
    <PageBody>
      <PageHeader
        title="Aperçu"
        subtitle="Vos plannings, vos absences et vos compteurs."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/planning/semaine"
            className="flex h-full flex-col gap-1 rounded-3 border border-line-1 bg-surface p-4 hover:bg-surface-2"
          >
            <span className="text-sm font-medium text-ink-1">Mon planning</span>
            <span className="text-micro text-ink-3">
              Les semaines publiées de votre équipe
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/absences/calendrier"
            className="flex h-full flex-col gap-1 rounded-3 border border-line-1 bg-surface p-4 hover:bg-surface-2"
          >
            <span className="text-sm font-medium text-ink-1">
              Mes absences et compteurs
            </span>
            <span className="text-micro text-ink-3">
              Demander un congé, suivre son solde
            </span>
          </Link>
        </li>
      </ul>
    </PageBody>
  );
}
