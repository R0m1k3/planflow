'use client';

import { useActionState, useEffect, useState } from 'react';

import { AlertPanel } from '@/components/planning/AlertPanel';
import { WeekGrid } from '@/components/planning/WeekGrid';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PersistentForm } from '@/components/ui/PersistentForm';
import { formatMinutes } from '@/domain/counters/week';
import {
  displayName,
  type BoardRow,
  type BoardShift,
} from '@/domain/planning/board';
import {
  createShiftAction,
  deleteShiftAction,
  duplicateWeekAction,
  setWeekPublicationAction,
  updateShiftAction,
  type PlanningActionState,
} from '@/server/planning/actions';
import {
  PUBLICATION_INTENT_FIELD,
  PUBLISH_INTENT,
  UNPUBLISH_INTENT,
} from '@/domain/planning/publication';
import type { BoardLabel, BoardSection } from '@/server/planning/queries';

export interface TeamSectionProps {
  section: BoardSection;
  days: string[];
  dates: string[];
  labels: BoardLabel[];
  weekParam: string;
  /** Semaine précédente : proposition par défaut de la duplication. */
  previousParam: string;
  /** Faux quand la capacité de modification manque : la grille reste lisible. */
  canEdit: boolean;
  canPublish: boolean;
  canDuplicate: boolean;
}

const empty: PlanningActionState = {};

/** Cible du panneau d'édition : création dans une case, ou créneau existant. */
type Target =
  | { kind: 'create'; membershipId: string | null; dayIndex: number }
  | {
      kind: 'edit';
      shift: BoardShift;
      membershipId: string | null;
      dayIndex: number;
    };

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
  previousParam,
  canEdit,
  canPublish,
  canDuplicate,
}: TeamSectionProps) {
  const [target, setTarget] = useState<Target | null>(null);

  const names = new Map(
    section.rows
      .filter((row) => row.membershipId)
      .map((row) => [row.membershipId as string, displayName(row)]),
  );
  const flagged = new Set(section.flaggedShiftIds);
  const pendingWarnings = section.alerts.filter(
    (alert) => alert.severity === 'WARNING' && !alert.acknowledged,
  ).length;

  const published = section.status === 'PUBLISHED';
  const plannedMinutes = section.rows.reduce(
    (total, row) => total + row.counters.plannedMinutes,
    0,
  );
  const isEmpty =
    section.rows.every((row) => row.days.flat().length === 0) &&
    !section.unassignedRow;

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

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {canDuplicate && isEmpty ? (
            <DuplicateControl
              teamId={section.teamId}
              source={previousParam}
              target={weekParam}
            />
          ) : null}
          {canPublish ? (
            <PublishControl
              teamId={section.teamId}
              weekParam={weekParam}
              version={section.version}
              published={published}
              pendingWarnings={pendingWarnings}
            />
          ) : null}
        </div>
      </header>

      <WeekGrid
        days={days}
        dates={dates}
        rows={section.rows}
        unassignedRow={section.unassignedRow}
        flaggedShiftIds={flagged}
        {...(canEdit
          ? {
              cellAction: (row: BoardRow, dayIndex: number) => (
                <button
                  type="button"
                  onClick={() =>
                    setTarget({
                      kind: 'create',
                      membershipId: row.membershipId,
                      dayIndex,
                    })
                  }
                  className="mt-auto rounded-2 border border-dashed border-line-2 px-1 py-0.5 text-micro text-ink-3 opacity-0 transition-opacity hover:border-accent hover:text-accent focus-visible:opacity-100 group-hover/cell:opacity-100 print:hidden"
                >
                  + Créneau
                  <span className="sr-only">
                    {` pour ${row.unassigned ? 'un besoin non couvert' : displayName(row)} le ${days[dayIndex] ?? ''}`}
                  </span>
                </button>
              ),
              shiftAction: (shift, row, dayIndex) => (
                <div className="absolute -top-1 -right-1 flex gap-0.5 print:hidden">
                  <button
                    type="button"
                    title="Modifier le créneau"
                    onClick={() =>
                      setTarget({
                        kind: 'edit',
                        shift,
                        membershipId: row.membershipId,
                        dayIndex,
                      })
                    }
                    className="flex size-4 items-center justify-center rounded-full border border-line-2 bg-surface text-micro leading-none text-ink-3 opacity-0 hover:border-accent hover:text-accent focus-visible:opacity-100 group-hover/cell:opacity-100"
                  >
                    <span aria-hidden>✎</span>
                    <span className="sr-only">Modifier le créneau</span>
                  </button>
                  <DeleteShift shiftId={shift.id} />
                </div>
              ),
            }
          : {})}
      />

      <AlertPanel alerts={section.alerts} names={names} />

      {target ? (
        <ShiftComposer
          key={target.kind === 'edit' ? target.shift.id : 'create'}
          teamId={section.teamId}
          weekParam={weekParam}
          labels={labels}
          rows={section.rows}
          localDate={dates[target.dayIndex] ?? ''}
          dayLabel={days[target.dayIndex] ?? ''}
          target={target}
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
  pendingWarnings,
}: {
  teamId: string;
  weekParam: string;
  version: number;
  published: boolean;
  pendingWarnings: number;
}) {
  const [state, formAction, pending] = useActionState(
    setWeekPublicationAction,
    empty,
  );

  return (
    <PersistentForm
      action={formAction}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="week" value={weekParam} />
      {/* Verrou optimiste : la version lue au rendu est renvoyée telle quelle. */}
      <input type="hidden" name="expectedVersion" value={version} />

      {/* Le motif n'apparaît que s'il y a quelque chose à assumer : demander
          une justification quand tout est conforme apprendrait à la remplir
          machinalement. */}
      {!published && pendingWarnings > 0 ? (
        <label className="flex items-center gap-1.5 text-xs text-ink-2">
          <span className="sr-only">Motif de publication malgré les alertes</span>
          <input
            name="acknowledgement"
            type="text"
            maxLength={500}
            placeholder={`Motif — ${pendingWarnings} alerte${pendingWarnings > 1 ? 's' : ''}`}
            className="h-8 w-56 rounded-2 border border-warn bg-surface px-2 text-sm text-ink-1"
          />
        </label>
      ) : null}

      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      {/* L'intention voyage sur le bouton, et non dans un champ caché : la
          réinitialisation que React applique après chaque action remettrait un
          champ caché à sa valeur d'origine, jamais un bouton. */}
      <Button
        type="submit"
        name={PUBLICATION_INTENT_FIELD}
        value={published ? UNPUBLISH_INTENT : PUBLISH_INTENT}
        size="sm"
        variant={published ? 'secondary' : 'primary'}
        disabled={pending}
      >
        {published ? 'Dépublier' : 'Publier'}
      </Button>
    </PersistentForm>
  );
}

/**
 * Proposé seulement sur une semaine vide : dupliquer par-dessus un travail
 * commencé le détruirait, et l'action refuse de toute façon côté serveur.
 */
function DuplicateControl({
  teamId,
  source,
  target,
}: {
  teamId: string;
  source: string;
  target: string;
}) {
  const [state, formAction, pending] = useActionState(
    duplicateWeekAction,
    empty,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="target" value={target} />
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        Copier la semaine précédente
      </Button>
    </form>
  );
}

function DeleteShift({ shiftId }: { shiftId: string }) {
  const [state, formAction, pending] = useActionState(deleteShiftAction, empty);

  return (
    <form action={formAction}>
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

/**
 * Panneau d'édition d'un créneau, en création comme en modification.
 *
 * Un seul formulaire pour les deux : déplacer un créneau, c'est changer son
 * jour, son salarié ou ses heures — exactement les champs de la création. Deux
 * écrans distincts finiraient par diverger.
 */
function ShiftComposer({
  teamId,
  weekParam,
  labels,
  rows,
  localDate,
  dayLabel,
  target,
  onClose,
}: {
  teamId: string;
  weekParam: string;
  labels: BoardLabel[];
  rows: BoardRow[];
  localDate: string;
  dayLabel: string;
  target: Target;
  onClose: () => void;
}) {
  const editing = target.kind === 'edit';
  const [state, formAction, pending] = useActionState(
    editing ? updateShiftAction : createShiftAction,
    empty,
  );

  // La grille est déjà revalidée côté serveur ; refermer le panneau évite de
  // reposter le même créneau par inadvertance.
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const [start, end] = editing
    ? target.shift.time.split('–')
    : ['09:00', '17:00'];

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-3 border border-line-2 bg-surface-2 p-3 print:hidden"
    >
      {editing ? (
        <input type="hidden" name="shiftId" value={target.shift.id} />
      ) : (
        <>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="week" value={weekParam} />
        </>
      )}
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
          defaultValue={target.membershipId ?? ''}
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
          defaultValue={start}
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      <Field label="Fin" htmlFor="composer-end">
        <input
          id="composer-end"
          name="end"
          type="time"
          required
          defaultValue={end}
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
          defaultValue={editing ? target.shift.breakMinutes : 0}
          className="h-8 w-20 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      {editing ? null : (
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
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {editing ? 'Enregistrer' : 'Ajouter'}
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
