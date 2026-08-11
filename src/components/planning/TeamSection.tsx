'use client';

import { useActionState, useEffect, useState } from 'react';

import { AlertPanel } from '@/components/planning/AlertPanel';
import { WeekGrid } from '@/components/planning/WeekGrid';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PersistentForm } from '@/components/ui/PersistentForm';
import { cx } from '@/lib/cx';
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
          dates={dates}
          days={days}
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
  dates,
  days,
  target,
  onClose,
}: {
  teamId: string;
  weekParam: string;
  labels: BoardLabel[];
  rows: BoardRow[];
  localDate: string;
  dayLabel: string;
  dates: string[];
  days: string[];
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

      <BreakRows
        initial={editing ? target.shift.breaks : []}
        fallbackMinutes={editing ? target.shift.breakMinutes : 0}
      />

      <Field label="Repas" htmlFor="composer-meals">
        <input
          id="composer-meals"
          name="mealCount"
          type="number"
          min={0}
          max={5}
          defaultValue={editing ? target.shift.mealCount : 0}
          className="h-8 w-16 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      {/* L'étiquette est modifiable à la correction aussi : posée de travers,
          elle se corrigeait en supprimant le créneau pour le refaire — ce qui
          perdait sa validation et son historique. */}
      <Field label="Poste" htmlFor="composer-label">
        <select
          id="composer-label"
          name="labelId"
          defaultValue={editing ? (target.shift.labelId ?? '') : ''}
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        >
          <option value="">Aucune étiquette</option>
          {labels.map((label) => (
            <option key={label.id} value={label.id}>
              {label.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notes" htmlFor="composer-note">
        <input
          id="composer-note"
          name="note"
          type="text"
          maxLength={500}
          defaultValue={editing ? (target.shift.note ?? '') : ''}
          placeholder="Consigne du jour"
          className="h-8 w-56 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      {editing ? null : (
        <>
          <RepeatDays dates={dates} days={days} selected={localDate} />

          {/* Décoché par défaut, à l'inverse du produit audité. Un avis par
              créneau posé remplit vite une boîte : c'est la publication de la
              semaine qui prévient, et cette case sert au créneau ajouté après
              coup — le cas où le salarié ne verrait rien sans elle. */}
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" name="notify" />
            Prévenir le salarié par courriel
          </label>
        </>
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

/**
 * Pauses d'un créneau, une ligne par pause.
 *
 * Un total unique ne disait pas ce qui composait la journée : deux pauses de
 * vingt minutes et une coupure de deux heures s'écrivaient « 120 », et rien ne
 * permettait de les distinguer — ni à l'écran, ni au contrôle.
 *
 * Le début est facultatif. Beaucoup de pauses se prennent « quand c'est
 * calme » : imposer une heure obligerait à inventer une précision que le
 * planning n'a pas, et qu'un contrôle prendrait pour un engagement.
 */
function BreakRows({
  initial,
  fallbackMinutes,
}: {
  initial: ReadonlyArray<{
    startMinutes: number | null;
    durationMinutes: number;
    isPaid: boolean;
    label: string | null;
  }>;
  fallbackMinutes: number;
}) {
  // Un créneau enregistré avant le détail des pauses n'a qu'un total : il est
  // repris comme une pause unique plutôt que perdu.
  const seeded =
    initial.length > 0
      ? initial
      : fallbackMinutes > 0
        ? [
            {
              startMinutes: null,
              durationMinutes: fallbackMinutes,
              isPaid: false,
              label: null,
            },
          ]
        : [];

  const [rows, setRows] = useState(seeded);

  return (
    <fieldset className="flex w-full flex-col gap-1.5">
      <legend className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
        Pauses
      </legend>

      {rows.length === 0 ? (
        <p className="text-micro text-ink-3">Aucune pause.</p>
      ) : null}

      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            name="breakDuration"
            type="number"
            min={1}
            max={600}
            step={5}
            required
            defaultValue={row.durationMinutes}
            aria-label={`Durée de la pause ${index + 1}, en minutes`}
            className="h-8 w-20 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
          />
          <span className="text-micro text-ink-3">min</span>

          <input
            name="breakStart"
            type="number"
            min={0}
            step={5}
            defaultValue={row.startMinutes ?? ''}
            placeholder="début"
            aria-label={`Début de la pause ${index + 1}, en minutes après la prise de poste`}
            className="h-8 w-24 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
          />

          <input
            name="breakLabel"
            type="text"
            maxLength={60}
            defaultValue={row.label ?? ''}
            placeholder="libellé"
            aria-label={`Libellé de la pause ${index + 1}`}
            className="h-8 w-28 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
          />

          <label className="flex items-center gap-1 text-micro text-ink-2">
            {/* La valeur porte l'index : une case non cochée n'est pas envoyée,
                et « on » seul ne dirait pas quelle ligne est payée. */}
            <input
              type="checkbox"
              name="breakPaid"
              value={String(index)}
              defaultChecked={row.isPaid}
            />
            rémunérée
          </label>

          <button
            type="button"
            onClick={() => setRows(rows.filter((_, at) => at !== index))}
            className="rounded-2 px-1.5 py-0.5 text-micro text-ink-3 hover:text-danger"
          >
            Retirer
            <span className="sr-only">{` la pause ${index + 1}`}</span>
          </button>
        </div>
      ))}

      <div>
        <Button
          type="button"
          size="sm"
          onClick={() =>
            setRows([
              ...rows,
              {
                startMinutes: null,
                durationMinutes: 20,
                isPaid: false,
                label: null,
              },
            ])
          }
        >
          + Ajouter une pause
        </Button>
      </div>
    </fieldset>
  );
}

/**
 * Répétition du créneau sur plusieurs jours.
 *
 * Le jour ouvert est coché et **verrouillé** : on ne crée pas « ailleurs qu'ici
 * » depuis la case d'un jour donné, et le décocher laisserait un formulaire qui
 * ne produit rien tout en paraissant valide.
 *
 * La création est tout ou rien côté serveur : un jour refusé — période close,
 * chevauchement — annule les autres. Une répétition à demi appliquée laisserait
 * un planning que personne n'a voulu.
 */
function RepeatDays({
  dates,
  days,
  selected,
}: {
  dates: string[];
  days: string[];
  selected: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
        Répéter sur
      </legend>
      <div className="flex flex-wrap gap-1">
        {dates.map((date, index) => {
          const locked = date === selected;
          return (
            <label
              key={date}
              className={cx(
                'flex cursor-pointer items-center gap-1 rounded-2 border px-2 py-1 text-micro',
                locked
                  ? 'border-accent bg-accent-soft text-accent-soft-ink'
                  : 'border-line-2 bg-surface text-ink-2 hover:bg-surface-2',
              )}
            >
              <input
                type="checkbox"
                name="localDates"
                value={date}
                defaultChecked={locked}
                disabled={locked}
                className="size-3"
              />
              {/* Un champ désactivé n'est pas envoyé : le jour ouvert voyage
                  donc dans un champ caché, sans quoi cocher zéro case
                  produirait une création vide. */}
              {locked ? (
                <input type="hidden" name="localDates" value={date} />
              ) : null}
              {(days[index] ?? date).slice(0, 3)}
            </label>
          );
        })}
      </div>
    </fieldset>
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
