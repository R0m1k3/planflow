import { WeekGrid } from '@/components/planning/WeekGrid';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { POSTE_CODES, POSTE_LABELS, posteTokens } from '@/lib/design/postes';
import { UNASSIGNED_ROW, WEEK_DAYS, WEEK_LABEL, WEEK_ROWS } from '@/lib/demo/semaine';

export const metadata = { title: 'Planning · semaine 33 · PlanFlow' };

export default function SemainePage() {
  return (
    <PageBody>
      <PageHeader
        title="Planning · semaine 33"
        subtitle={`Nantes Atlantis · ${WEEK_LABEL.split('·')[1]?.trim()} · ${WEEK_ROWS.length} salariés planifiés`}
        actions={
          <>
            <Button>Dupliquer S‑32</Button>
            <Button>Imprimer</Button>
            <Button variant="primary">Publier la semaine</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warn">2 alertes de convention</Badge>
        <Badge tone="info">Samedi non publié</Badge>
        <Badge tone="neutral">5 besoins non couverts</Badge>
      </div>

      <WeekGrid
        days={WEEK_DAYS}
        rows={WEEK_ROWS}
        unassignedRow={UNASSIGNED_ROW}
      />

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
