import { DayTimeline, type DayLane } from '@/components/planning/DayTimeline';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UNASSIGNED_ROW, WEEK_ROWS } from '@/lib/demo/semaine';

export const metadata = { title: 'Planning · mercredi 12 août · PlanFlow' };

/** Mercredi = index 2 dans la semaine de démonstration. */
const DAY_INDEX = 2;

export default function JourPage() {
  const lanes: DayLane[] = WEEK_ROWS.map((row) => ({
    employee: row.employee,
    shifts: row.days[DAY_INDEX] ?? [],
  })).filter((lane) => lane.shifts.length > 0);

  const unassigned = UNASSIGNED_ROW.days[DAY_INDEX] ?? [];
  if (unassigned.length > 0) {
    lanes.push({
      employee: UNASSIGNED_ROW.employee,
      shifts: unassigned,
      unassigned: true,
    });
  }

  return (
    <PageBody>
      <PageHeader
        title="Planning · mercredi 12 août"
        subtitle="Nantes Atlantis · amplitude 06:00 – 21:00"
        actions={
          <>
            <Button>Imprimer la journée</Button>
            <Button variant="primary">Ajouter un créneau</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{lanes.length} salariés présents</Badge>
        <Badge tone="warn">Creux de couverture à 13 h</Badge>
      </div>

      <DayTimeline lanes={lanes} fromHour={6} toHour={21} />
    </PageBody>
  );
}
