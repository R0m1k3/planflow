'use client';

import { useActionState, useEffect, useState } from 'react';

import { WeekGrid } from '@/components/planning/WeekGrid';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatMinutes } from '@/domain/counters/week';
import { displayName, type BoardRow } from '@/domain/planning/board';
import {
  createShiftAction,
  deleteShiftAction,
  publishWeekAction,
  unpublishWeekAction,
  type PlanningActionState,
} from '@/server/planning/actions';
import type { BoardLabel, BoardSection } from '@/server/planning/queries';

export interface TeamSectionProps {
  section: BoardSection;
  days: string[];
  dates: string[];
  labels: BoardLabel[];
  weekParam: string;
  /** Faux quand la capacité de modification manque : la grille reste lisible. */
  canEdit: boolean;
  canPublish: boolean;
}

const empty: PlanningActionState = {};

/**
 * Une équipe, une grille, un état de publication.
 *
 * La publication est **par équipe** : l'audit montre un bouton « Dépublier »
 * sur chaque section, pas un pour l'établissement. Le regrouper ferait
 * republier la caisse quand on corrige la réserve.
 */
export function TeamSection({
  section,
  days,
  dates,
  labels,
  weekParam,
  canEdit,
  canPublish,
}: TeamSectionProps) {
  const [target, setTarget] = useState<{
    membershipId: string | null;
    dayIndex: number;
  } | null>(null);

  const published = section.status === 'PUBLISHED';
  const plannedMinutes = section.rows.reduce(
    (total, row) => total + row.counters.plannedMinutes,
    0,
  );

  if (section.hidden) {
    // Le brouillon n'est pas seulement masqué : il n'a pas été chargé. Dire
    // « pas encore publié » est honnête et n'apprend rien de son contenu.
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink-1">
          {section.teamName}
        </h2>
        <p className="rounded-3 border border-line-1 bg-surface p-4 text-sm text-ink-2">
          Le planning de cette équipe n’est pas encore publié.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink-1">
            {section.teamName}
          </h2>
          <Badge tone={published ? 'ok' : 'warn'}>
            {published ? 'Publiée' : 'Brouillon'}
          </Badge>
          <span className="text-xs text-ink-3">
            {formatMinutes(plannedMinutes)} planifiées
          </span>
        </div>

        {canPublish ? (
          <PublishControl
            teamId={section.teamId}
            weekParam={weekParam}
            version={section.version}
            published={published}
          />
        ) : null}
      </header>

      <WeekGrid
        days={days}
        dates={dates}
        rows={section.rows}
        unassignedRow={section.unassignedRow}
        {...(canEdit
          ? {
              cellAction: (row: BoardRow, dayIndex: number) => (
                <button
                  type="button"
                  onClick={() =>
                    setTarget({ membershipId: row.membershipId, dayIndex })
                  }
                  className="mt-auto rounded-2 border border-dashed border-line-2 px-1 py-0.5 text-micro text-ink-3 opacity-0 transition-opacity hover:border-accent hover:text-accent focus-visible:opacity-100 group-hover/cell:opacity-100"
                >
                  + Créneau
                  <span className="sr-only">
                    {` pour ${row.unassigned ? 'un besoin non couvert' : displayName(row)} le ${days[dayIndex] ?? ''}`}
                  </span>
                </button>
              ),
              shiftAction: (shiftId: string) => (
                <DeleteShift shiftId={shiftId} />
              ),
            }
          : {})}
      />

      {target ? (
        <ShiftComposer
          teamId={section.teamId}
          weekParam={weekParam}
          labels={labels}
          rows={section.rows}
          localDate={dates[target.dayIndex] ?? ''}
          dayLabel={days[target.dayIndex] ?? ''}
          membershipId={target.membershipId}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </section>
  );
}

function PublishControl({
  teamId,
  weekParam,
  version,
  published,
}: {
  teamId: string;
  weekParam: string;
  version: number;
  published: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    published ? unpublishWeekAction : publishWeekAction,
    empty,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="week" value={weekParam} />
      {/* Verrou optimiste : la version lue au rendu est renvoyée telle quelle. */}
      <input type="hidden" name="expectedVersion" value={version} />
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      <Button
        type="submit"
        size="sm"
        variant={published ? 'secondary' : 'primary'}
        disabled={pending}
      >
        {published ? 'Dépublier' : 'Publier'}
      </Button>
    </form>
  );
}

function DeleteShift({ shiftId }: { shiftId: string }) {
  const [state, formAction, pending] = useActionState(deleteShiftAction, empty);

  return (
    <form action={formAction} className="absolute -top-1 -right-1">
      <input type="hidden" name="shiftId" value={shiftId} />
      {/* Volontairement pas désactivé pendant l'envoi : la suppression fait
          disparaître le créneau, donc le bouton, et un état désactivé
          transitoire ne protège de rien tout en rendant la cible instable. */}
      <button
        type="submit"
        aria-busy={pending}
        title={state.error ?? 'Supprimer le créneau'}
        className="flex size-4 items-center justify-center rounded-full border border-line-2 bg-surface text-micro leading-none text-ink-3 opacity-0 hover:border-danger hover:text-danger focus-visible:opacity-100 group-hover/cell:opacity-100"
      >
        <span aria-hidden>×</span>
        <span className="sr-only">Supprimer le créneau</span>
      </button>
    </form>
  );
}

function ShiftComposer({
  teamId,
  weekParam,
  labels,
  rows,
  localDate,
  dayLabel,
  membershipId,
  onClose,
}: {
  teamId: string;
  weekParam: string;
  labels: BoardLabel[];
  rows: BoardRow[];
  localDate: string;
  dayLabel: string;
  membershipId: string | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(createShiftAction, empty);

  // La grille est déjà revalidée côté serveur ; refermer le panneau évite de
  // reposter le même créneau par inadvertance.
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-3 border border-line-2 bg-surface-2 p-3"
    >
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="week" value={weekParam} />
      <input type="hidden" name="localDate" value={localDate} />

      <Field label="Jour">
        <span className="flex h-8 items-center px-1 text-sm text-ink-2">
          {dayLabel}
        </span>
      </Field>

      <Field label="Salarié" htmlFor="composer-membership">
        <select
          id="composer-membership"
          name="membershipId"
          defaultValue={membershipId ?? ''}
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        >
          <option value="">Besoin non couvert</option>
          {rows.map((row) => (
            <option key={row.membershipId} value={row.membershipId ?? ''}>
              {displayName(row)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Début" htmlFor="composer-start">
        <input
          id="composer-start"
          name="start"
          type="time"
          required
          defaultValue="09:00"
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      <Field label="Fin" htmlFor="composer-end">
        <input
          id="composer-end"
          name="end"
          type="time"
          required
          defaultValue="17:00"
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      <Field label="Pause (min)" htmlFor="composer-break">
        <input
          id="composer-break"
          name="breakMinutes"
          type="number"
          min={0}
          max={600}
          step={5}
          defaultValue={0}
          className="h-8 w-20 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      <Field label="Poste" htmlFor="composer-label">
        <select
          id="composer-label"
          name="labelId"
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        >
          {labels.map((label) => (
            <option key={label.id} value={label.id}>
              {label.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          Ajouter
        </Button>
        <Button type="button" size="sm" onClick={onClose}>
          Annuler
        </Button>
      </div>

      {state.error ? (
        <p role="alert" className="w-full text-xs text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
