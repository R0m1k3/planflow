import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { getActivity } from '@/server/reports/activity';

export const metadata = { title: 'Journal d’activité · PlanFlow' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    domaine?: string;
    objet?: string;
    du?: string;
    au?: string;
  }>;
}

const stamp = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export default async function ActivitePage({ searchParams }: PageProps) {
  const params = await searchParams;
  // `exactOptionalPropertyTypes` : un filtre absent ne se transmet pas comme
  // « undefined », il ne se transmet pas du tout.
  const page = await getActivity({
    ...(params.domaine ? { domain: params.domaine } : {}),
    ...(params.objet ? { entityType: params.objet } : {}),
    ...(params.du ? { from: params.du } : {}),
    ...(params.au ? { to: params.au } : {}),
  });

  const withParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams();
    for (const [name, current] of Object.entries(params)) {
      if (current) next.set(name, current);
    }
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    return qs ? `/rapports/activite?${qs}` : '/rapports/activite';
  };

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={`${href}-${label}`}
      href={href}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'flex h-7 items-center rounded-2 border border-line-3 bg-surface-2 px-2.5 text-xs font-medium text-ink-1'
          : 'flex h-7 items-center rounded-2 px-2.5 text-xs text-ink-2 hover:bg-surface-2'
      }
    >
      {label}
    </Link>
  );

  return (
    <PageBody>
      <PageHeader
        title="Journal d’activité"
        subtitle={`${page.total} entrée${page.total > 1 ? 's' : ''} sur la période`}
      />

      <Card>
        <CardHeader
          title="Filtres"
          badge={
            page.truncated ? (
              <Badge tone="warn">200 dernières affichées</Badge>
            ) : null
          }
        />

        <div className="flex flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {chip(withParam('domaine', undefined), 'Tous les domaines', !params.domaine)}
            {page.domains.map((domain) =>
              chip(
                withParam('domaine', domain),
                domain,
                params.domaine === domain,
              ),
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {chip(withParam('objet', undefined), 'Tous les objets', !params.objet)}
            {page.entityTypes.map((type) =>
              chip(withParam('objet', type), type, params.objet === type),
            )}
          </div>

          <form className="flex flex-wrap items-end gap-3" method="get">
            {params.domaine ? (
              <input type="hidden" name="domaine" value={params.domaine} />
            ) : null}
            {params.objet ? (
              <input type="hidden" name="objet" value={params.objet} />
            ) : null}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Du</span>
              <input
                type="date"
                name="du"
                defaultValue={params.du}
                className="h-9 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Au</span>
              <input
                type="date"
                name="au"
                defaultValue={params.au}
                className="h-9 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1"
              />
            </label>
            <button
              type="submit"
              className="h-9 rounded-2 border border-line-3 px-3 text-sm hover:bg-surface-2"
            >
              Appliquer
            </button>
          </form>
        </div>
      </Card>

      <Card>
        <CardHeader title="Entrées" />

        {page.entries.length === 0 ? (
          <EmptyState
            title="Aucune entrée"
            description="Aucune action enregistrée pour ces filtres."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-1 text-left">
                  {['Horodatage', 'Auteur', 'Action', 'Objet', 'Champs', 'Justification'].map(
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
                {page.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2 tnum whitespace-nowrap">
                      {stamp.format(entry.occurredAt)}
                    </td>
                    <td className="px-4 py-2">{entry.actorName}</td>
                    <td className="px-4 py-2 font-mono text-xs">{entry.action}</td>
                    <td className="px-4 py-2 text-ink-2">
                      {entry.entityType}
                      <span className="block font-mono text-micro text-ink-3">
                        {entry.entityId}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-ink-2">
                      {entry.changedFields.length === 0
                        ? '—'
                        : entry.changedFields.join(', ')}
                    </td>
                    <td className="px-4 py-2 text-xs text-ink-2">
                      {entry.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Le journal enregistre l’avant et l’après de chaque mutation — c’est ce
        qui le rend opposable. Cet écran n’affiche que le <em>nom</em> des champs
        modifiés : la valeur se lit sur la fiche concernée, sous ses propres
        autorisations. Un salaire ou un motif médical n’a pas à être visible de
        quiconque ouvre la piste d’audit.
      </p>
    </PageBody>
  );
}
