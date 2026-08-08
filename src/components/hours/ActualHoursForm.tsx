'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  saveActualHoursAction,
  validateHoursAction,
  type HoursActionState,
} from '@/server/hours/actions';
import type { HoursShiftRow } from '@/server/hours/queries';

const empty: HoursActionState = {};

/**
 * Saisie des heures réellement faites.
 *
 * Les champs sont **pré-remplis avec le prévu** quand rien n'a été saisi : le
 * cas courant est « comme prévu, sauf que », et retaper deux horaires pour
 * corriger un quart d'heure décourage la saisie — donc fausse le réalisé.
 */
export function ActualHoursForm({ shift }: { shift: HoursShiftRow }) {
  const [state, formAction, pending] = useActionState(
    saveActualHoursAction,
    empty,
  );

  const [plannedStart, plannedEnd] = shift.plannedRange.split('–');
  const [actualStart, actualEnd] = (shift.actualRange ?? '').split('–');

  if (shift.locked) {
    return (
      <span className="text-micro text-ink-3">
        Période verrouillée — saisie fermée
      </span>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="shiftId" value={shift.id} />

      <label className="sr-only" htmlFor={`start-${shift.id}`}>
        Début réel
      </label>
      <input
        id={`start-${shift.id}`}
        name="start"
        type="time"
        defaultValue={actualStart || plannedStart}
        className="h-7 rounded-2 border border-line-2 bg-surface px-1.5 text-xs text-ink-1"
      />

      <label className="sr-only" htmlFor={`end-${shift.id}`}>
        Fin réelle
      </label>
      <input
        id={`end-${shift.id}`}
        name="end"
        type="time"
        defaultValue={actualEnd || plannedEnd}
        className="h-7 rounded-2 border border-line-2 bg-surface px-1.5 text-xs text-ink-1"
      />

      {/* Le motif n'apparaît qu'en correction : une première saisie ne corrige
          rien, et demander un motif à chaque ligne le ferait remplir
          machinalement. */}
      {shift.hasActual ? (
        <>
          <label className="sr-only" htmlFor={`reason-${shift.id}`}>
            Motif de la correction
          </label>
          <input
            id={`reason-${shift.id}`}
            name="reason"
            type="text"
            maxLength={500}
            placeholder="Motif"
            className="h-7 w-32 rounded-2 border border-warn bg-surface px-1.5 text-xs text-ink-1"
          />
        </>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {shift.hasActual ? 'Corriger' : 'Saisir'}
      </Button>

      {state.error ? (
        <span role="alert" className="text-micro text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

/**
 * Validation groupée d'un salarié.
 *
 * Le libellé dit ce que fait l'action : elle **qualifie** des heures, elle ne
 * les autorise pas à être payées. Elles le sont déjà.
 */
export function ValidateRow({
  shiftIds,
  allValidated,
}: {
  shiftIds: string[];
  allValidated: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    validateHoursAction,
    empty,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      {shiftIds.map((id) => (
        <input key={id} type="hidden" name="shiftIds" value={id} />
      ))}
      <input
        type="hidden"
        name="validate"
        value={allValidated ? 'false' : 'true'}
      />
      {state.error ? (
        <span role="alert" className="text-micro text-danger">
          {state.error}
        </span>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {allValidated ? 'Dévalider' : 'Valider les heures'}
      </Button>
    </form>
  );
}
