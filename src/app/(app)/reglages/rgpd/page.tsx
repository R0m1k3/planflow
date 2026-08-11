import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  DATA_DICTIONARY,
  LEGAL_BASIS_LABELS,
} from '@/domain/legal/data-dictionary';
import { query } from '@/server/context';

export const metadata = { title: 'RGPD · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function RgpdPage() {
  // Les durées ne sont pas écrites dans le dictionnaire : elles viennent des
  // politiques de conservation, qui se paramètrent et s'auditent. Un artefact
  // qui afficherait sa propre durée mentirait le jour où la politique change.
  const policies = await query('settings.access', async (db) =>
    db.retentionPolicy.findMany({
      orderBy: [{ objectType: 'asc' }, { effectiveFrom: 'desc' }],
      select: {
        objectType: true,
        durationMonths: true,
        effectiveFrom: true,
      },
    }),
  );

  const durationFor = (objectTypes: string[]): string => {
    const matches = objectTypes
      .map((objectType) => {
        // Une politique précise l'emporte sur une politique générale :
        // « Document:SICK_NOTE » avant « Document ».
        const exact = policies.find((policy) => policy.objectType === objectType);
        if (exact) return exact;
        const base = objectType.split(':')[0] as string;
        return policies.find((policy) => policy.objectType === base);
      })
      .filter((policy) => policy !== undefined);

    if (matches.length === 0) return 'Non déclarée';

    const months = [...new Set(matches.map((policy) => policy.durationMonths))];
    return months
      .sort((a, b) => a - b)
      .map((count) =>
        count % 12 === 0 ? `${count / 12} an${count > 12 ? 's' : ''}` : `${count} mois`,
      )
      .join(' · ');
  };

  const undeclared = DATA_DICTIONARY.filter(
    (entry) => durationFor(entry.objectTypes) === 'Non déclarée',
  ).length;

  return (
    <PageBody>
      <PageHeader
        title="RGPD"
        subtitle="Dictionnaire des données : finalité, base légale, destinataires, durée"
      />

      <p
        role="note"
        className="max-w-[70ch] rounded-2 border border-warn bg-warn-soft px-3 py-2 text-xs leading-[var(--lh-prose)] text-warn-soft-ink"
      >
        L’affectation d’une base légale est une qualification juridique. Ce
        tableau porte la lecture usuelle d’un traitement de paie et de planning ;
        il doit être confirmé par le responsable de traitement avant d’être
        opposé à qui que ce soit.
      </p>

      {undeclared > 0 ? (
        <p
          role="status"
          className="max-w-[70ch] rounded-2 border border-danger bg-danger-soft px-3 py-2 text-xs leading-[var(--lh-prose)] text-danger-soft-ink"
        >
          {undeclared} catégorie{undeclared > 1 ? 's' : ''} sans durée de
          conservation déclarée. Le plan interdit d’appliquer une durée par
          défaut : déclarez-la dans{' '}
          <Link href="/reglages/conservation" className="underline">
            Durées de conservation
          </Link>
          .
        </p>
      ) : null}

      <Card>
        <CardHeader
          title="Données traitées"
          badge={<Badge tone="neutral">{DATA_DICTIONARY.length}</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-1 text-left">
                {[
                  'Catégorie',
                  'Finalité',
                  'Base légale',
                  'Destinataires',
                  'Durée',
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
              {DATA_DICTIONARY.map((entry) => {
                const duration = durationFor(entry.objectTypes);
                return (
                  <tr key={entry.category}>
                    <td className="px-4 py-3 align-top">
                      <span className="font-medium">{entry.category}</span>
                      {entry.sensitive ? (
                        <Badge tone="danger" className="ml-1.5">
                          Catégorie particulière
                        </Badge>
                      ) : null}
                      <span className="mt-1 block font-mono text-micro text-ink-3">
                        {entry.objectTypes.join(', ')}
                      </span>
                    </td>
                    <td className="max-w-[28ch] px-4 py-3 align-top text-ink-2">
                      {entry.purpose}
                      {entry.notes ? (
                        <span className="mt-1 block text-micro text-ink-3">
                          {entry.notes}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {LEGAL_BASIS_LABELS[entry.basis]}
                    </td>
                    <td className="px-4 py-3 align-top text-ink-2">
                      {entry.recipients.join(', ')}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {duration === 'Non déclarée' ? (
                        <Badge tone="danger">Non déclarée</Badge>
                      ) : (
                        <span className="tnum">{duration}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Droits des personnes" />
        <div className="flex flex-col gap-2 px-4 py-3 text-sm leading-[var(--lh-prose)] text-ink-2">
          <p>
            L’accès, la rectification et l’effacement s’exercent sur le dossier
            du salarié. L’effacement ne franchit pas les durées de conservation
            légales : une pièce sous obligation de conservation ne s’efface pas
            à la demande, et le refus doit être motivé.
          </p>
          <p>
            La portabilité passe par le paquet de départ : export filtré des
            données du salarié, accompagné de son manifeste et de son empreinte.
          </p>
          <p>
            Toute lecture d’une pièce de santé est journalisée et consultable
            dans le{' '}
            <Link href="/rapports/activite" className="underline">
              journal d’activité
            </Link>
            .
          </p>
        </div>
      </Card>
    </PageBody>
  );
}
