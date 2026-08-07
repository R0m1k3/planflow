import Link from 'next/link';

import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { POSTE_LABELS, posteShort, posteTokens } from '@/lib/design/postes';
import { EMPLOYEES } from '@/lib/demo/equipe';
import { fullName, initials } from '@/lib/demo/types';

export const metadata = { title: 'Équipe · PlanFlow' };

const STATUS: Record<string, { label: string; tone: Tone }> = {
  actif: { label: 'Actif', tone: 'ok' },
  essai: { label: 'Période d’essai', tone: 'info' },
  sortie: { label: 'Sortie prévue', tone: 'warn' },
};

export default function EquipePage() {
  const actifs = EMPLOYEES.filter((e) => e.status !== 'sortie').length;
  const essai = EMPLOYEES.filter((e) => e.status === 'essai').length;

  return (
    <PageBody>
      <PageHeader
        title="Équipe"
        subtitle={`Nantes Atlantis · ${actifs} salariés actifs, ${essai} en période d’essai`}
        actions={
          <>
            <Button>Registre unique du personnel</Button>
            <Button variant="primary">Nouvelle embauche</Button>
          </>
        }
      />

      <div className="overflow-x-auto rounded-3 border border-line-1 bg-surface">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-2 bg-surface-2 text-left text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
              <th scope="col" className="px-4 py-2.5">
                Collaborateur
              </th>
              <th scope="col" className="px-4 py-2.5">
                Poste principal
              </th>
              <th scope="col" className="px-4 py-2.5">
                Contrat
              </th>
              <th scope="col" className="px-4 py-2.5">
                Entrée
              </th>
              <th scope="col" className="px-4 py-2.5">
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYEES.map((employee) => {
              const tokens = posteTokens(employee.poste);
              const status = STATUS[employee.status] ?? STATUS.actif!;
              return (
                <tr
                  key={employee.id}
                  className="border-b border-line-1 last:border-b-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/equipe/${employee.id}`}
                      className="flex items-center gap-2.5 rounded-2"
                    >
                      <span
                        aria-hidden
                        className="flex size-7 flex-none items-center justify-center rounded-full bg-surface-3 text-micro font-semibold text-ink-2"
                      >
                        {initials(employee)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {fullName(employee)}
                        </span>
                        <span className="block truncate text-micro text-ink-3">
                          {employee.job}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-2 px-2 py-0.5 text-micro"
                      style={{
                        background: tokens.bg,
                        color: tokens.fg,
                        border: `1px solid ${tokens.edge}`,
                      }}
                    >
                      <span className="font-semibold tracking-wide">
                        {posteShort(employee.poste)}
                      </span>
                      {POSTE_LABELS[employee.poste]}
                    </span>
                  </td>
                  <td className="tnum px-4 py-2.5 text-ink-2">
                    {employee.contract}
                  </td>
                  <td className="tnum px-4 py-2.5 text-ink-2">
                    {employee.since}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageBody>
  );
}
