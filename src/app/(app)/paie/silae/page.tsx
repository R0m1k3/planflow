import Link from 'next/link';

import { MappingForm } from '@/components/payroll/MappingForm';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { getSilaeMapping } from '@/server/payroll/queries';

export const metadata = { title: 'Codes Silae · PlanFlow' };

export default async function SilaeMappingPage() {
  const view = await getSilaeMapping();
  const pending = view.rows.filter((row) => !row.confirmed).length;

  return (
    <PageBody>
      <PageHeader
        title="Codes de paie Silae"
        subtitle={`${view.rows.length - pending} correspondance${view.rows.length - pending > 1 ? 's' : ''} confirmée${view.rows.length - pending > 1 ? 's' : ''} sur ${view.rows.length}`}
        actions={
          <Link
            href="/paie"
            className="flex h-8 items-center rounded-2 border border-line-3 px-3 text-sm text-ink-1 hover:bg-surface-2"
          >
            ← Retour à la paie
          </Link>
        }
      />

      <section className="rounded-3 border border-info bg-info-soft p-4 text-sm text-info-soft-ink">
        <p>
          Les codes appartiennent au dossier Silae du client et se lisent dans
          « Saisie des éléments variables ». PlanFlow en propose quelques-uns,
          relevés sur un export réel du dossier, mais{' '}
          <strong>ne devine jamais leur signification</strong> : savoir que{' '}
          <code>AB-300</code> existe ne dit pas quelle absence il désigne.
        </p>
        <p className="mt-2">
          Tant qu’une correspondance n’est pas confirmée par le gestionnaire de
          paie, l’export refuse de produire le fichier.
        </p>
      </section>

      <div className="rounded-3 border border-line-1 bg-surface">
        <h2 className="border-b border-line-1 px-4 py-2 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
          Éléments calculés par PlanFlow
        </h2>
        {view.rows.map((row) => (
          <MappingForm key={row.key} row={row} knownCodes={view.knownCodes} />
        ))}
      </div>

      <section className="rounded-3 border border-line-1 bg-surface">
        <h2 className="border-b border-line-1 px-4 py-2 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
          Codes relevés sur l’export de référence
        </h2>
        <ul className="flex flex-wrap gap-2 p-4">
          {view.knownCodes.map((code) => (
            <li key={code}>
              <Badge tone="neutral">{code}</Badge>
            </li>
          ))}
        </ul>
      </section>

      {view.exports.length > 0 ? (
        <section className="rounded-3 border border-line-1 bg-surface">
          <h2 className="border-b border-line-1 px-4 py-2 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
            Exports produits
          </h2>
          {/* Le contenu n'est pas conservé : il porte les heures de salariés
              identifiables, et sa génération est déterministe. L'empreinte
              suffit à prouver qu'un réexport est identique. */}
          <ul className="divide-y divide-line-1">
            {view.exports.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm"
              >
                <span className="tnum text-ink-1">
                  {entry.periodStart.toISOString().slice(0, 10)} →{' '}
                  {entry.periodEnd.toISOString().slice(0, 10)}
                </span>
                <span className="text-ink-2">{entry.lineCount} lignes</span>
                <span className="tnum text-micro text-ink-3">
                  {entry.checksum.slice(0, 16)}…
                </span>
                <span className="ml-auto text-micro text-ink-3">
                  {entry.generatedAt.toISOString().slice(0, 16).replace('T', ' ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageBody>
  );
}
