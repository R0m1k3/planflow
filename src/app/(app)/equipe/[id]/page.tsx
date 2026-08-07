import { notFound } from 'next/navigation';

import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { POSTE_LABELS, posteShort, posteTokens } from '@/lib/design/postes';
import { EMPLOYEES, findEmployee } from '@/lib/demo/equipe';
import {
  FICHE_COUNTERS,
  FICHE_DOCUMENTS,
  FICHE_SHIFTS,
} from '@/lib/demo/fiche';
import { fullName, initials } from '@/lib/demo/types';

export function generateStaticParams() {
  return EMPLOYEES.map((employee) => ({ id: employee.id }));
}

export default async function FichePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = findEmployee(id);
  if (!employee) notFound();

  return (
    <PageBody>
      <PageHeader
        title={fullName(employee)}
        subtitle={`${employee.job} · Nantes Atlantis · entrée le ${employee.since}`}
        actions={
          <>
            <Button>Documents</Button>
            <Button variant="primary">Modifier le contrat</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-3 border border-line-1 bg-surface p-4">
        <span
          aria-hidden
          className="flex size-11 flex-none items-center justify-center rounded-full bg-surface-3 text-sm font-semibold text-ink-2"
        >
          {initials(employee)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{employee.contract}</p>
          <p className="text-micro text-ink-3">
            Poste principal · {POSTE_LABELS[employee.poste]}
          </p>
        </div>
        <span className="flex-1" />
        {employee.forfaitJours ? (
          <Badge tone="accent">Forfait jours · 218 j</Badge>
        ) : null}
        <ul className="flex flex-wrap items-center gap-2">
          {FICHE_COUNTERS.map((counter) => (
            <li
              key={counter.label}
              className="rounded-2 border border-line-1 bg-surface-2 px-3 py-1.5"
            >
              <span className="block text-micro text-ink-3">
                {counter.label}
              </span>
              <span
                className={`tnum block text-sm font-semibold ${
                  counter.tone === 'warn' ? 'text-warn-soft-ink' : 'text-ink-1'
                }`}
              >
                {counter.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(400px,1fr))]">
        <Card>
          <CardHeader
            title="Créneaux de la semaine"
            action={
              <Button size="sm" variant="ghost">
                Voir le planning
              </Button>
            }
          />
          <ul>
            {FICHE_SHIFTS.map((shift, index) => {
              const tokens = posteTokens(shift.poste);
              return (
                <li
                  key={`${shift.day}-${index}`}
                  className="flex items-center gap-3 border-b border-line-1 px-4 py-2.5 last:border-b-0"
                >
                  <span className="tnum w-28 flex-none text-xs text-ink-2">
                    {shift.day}
                  </span>
                  <span
                    className="flex-none rounded-2 px-1.5 py-0.5 text-micro font-semibold tracking-wide"
                    style={{
                      background: tokens.bg,
                      color: tokens.fg,
                      border: `1px solid ${tokens.edge}`,
                    }}
                    title={POSTE_LABELS[shift.poste]}
                  >
                    {posteShort(shift.poste)}
                  </span>
                  <span className="tnum flex-1 text-sm">{shift.time}</span>
                  <span className="tnum flex-none text-xs text-ink-2">
                    {shift.worked}
                  </span>
                  <Badge tone={shift.tone}>{shift.state}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Documents" />
          <ul>
            {FICHE_DOCUMENTS.map((document) => (
              <li
                key={document.label}
                className="flex items-center gap-3 border-b border-line-1 px-4 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {document.label}
                  </span>
                  <span className="tnum block text-micro text-ink-3">
                    {document.date}
                  </span>
                </span>
                <Badge tone={document.tone}>{document.state}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageBody>
  );
}
