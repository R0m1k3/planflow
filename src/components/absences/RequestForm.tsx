'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  requestTimeOffAction,
  type AbsenceActionState,
} from '@/server/absences/actions';

const empty: AbsenceActionState = {};

/**
 * Demande d'absence.
 *
 * Le libellé du champ de fin dit **« dernier jour d'absence »** et non « date
 * de fin ». C'est la confusion la plus fréquente du domaine : elle décompte un
 * jour de trop ou de trop peu à chaque demande, et le salarié s'en aperçoit au
 * solde, des mois plus tard. Un libellé exact coûte moins qu'une régularisation.
 */
export function RequestForm({
  absenceTypes,
  people,
  ownMembershipId,
}: {
  absenceTypes: Array<{ id: string; code: string; name: string }>;
  people: Array<{ membershipId: string; name: string }>;
  ownMembershipId: string;
}) {
  const [state, formAction, pending] = useActionState(
    requestTimeOffAction,
    empty,
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-3 border border-line-2 bg-surface-2 p-3"
    >
      <Field label="Salarié" htmlFor="req-member">
        <select
          id="req-member"
          name="membershipId"
          defaultValue={ownMembershipId}
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        >
          {people.map((person) => (
            <option key={person.membershipId} value={person.membershipId}>
              {person.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Type" htmlFor="req-type">
        <select
          id="req-type"
          name="absenceTypeId"
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        >
          {absenceTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Premier jour" htmlFor="req-start">
        <input
          id="req-start"
          name="startDate"
          type="date"
          required
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      <Field label="Dernier jour d’absence" htmlFor="req-end">
        <input
          id="req-end"
          name="endDate"
          type="date"
          required
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      <label className="flex items-center gap-1.5 text-xs text-ink-2">
        <input name="startHalfDay" type="checkbox" className="size-4" />
        Demi-journée au début
      </label>
      <label className="flex items-center gap-1.5 text-xs text-ink-2">
        <input name="endHalfDay" type="checkbox" className="size-4" />
        Demi-journée à la fin
      </label>

      <Field label="Commentaire" htmlFor="req-comment">
        <input
          id="req-comment"
          name="comment"
          type="text"
          maxLength={500}
          className="h-8 w-56 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </Field>

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        Demander
      </Button>

      <p className="w-full text-micro text-ink-3">
        Le dernier jour d’absence est la veille de la reprise. Les jours fériés
        compris dans la période ne sont pas décomptés — inutile de scinder la
        demande.
      </p>

      {state.error ? (
        <p role="alert" className="w-full text-xs text-danger">
          {state.error}
        </p>
      ) : null}
      {state.warning ? (
        <p className="w-full text-xs text-warn-soft-ink">{state.warning}</p>
      ) : null}
      {state.ok && !state.warning ? (
        <p className="w-full text-xs text-ok-soft-ink">Demande enregistrée.</p>
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
  htmlFor: string;
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
