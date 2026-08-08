'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  cancelTimeOffAction,
  decideTimeOffAction,
  type AbsenceActionState,
} from '@/server/absences/actions';

const empty: AbsenceActionState = {};

/** Accepter ou refuser une demande en attente. */
export function DecisionButtons({ timeOffId }: { timeOffId: string }) {
  const [state, formAction, pending] = useActionState(
    decideTimeOffAction,
    empty,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="timeOffId" value={timeOffId} />
      <input
        name="comment"
        type="text"
        maxLength={500}
        placeholder="Commentaire"
        className="h-7 w-40 rounded-2 border border-line-2 bg-surface px-2 text-xs text-ink-1"
      />
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      <Button
        type="submit"
        name="accept"
        value="true"
        size="sm"
        variant="primary"
        disabled={pending}
      >
        Accepter
      </Button>
      <Button
        type="submit"
        name="accept"
        value="false"
        size="sm"
        disabled={pending}
      >
        Refuser
      </Button>
    </form>
  );
}

/**
 * Annulation d'une absence.
 *
 * Sur une absence acceptée, la prise est contre-passée et non effacée : le
 * solde revient au même chiffre, et l'histoire reste lisible.
 */
export function CancelButton({ timeOffId }: { timeOffId: string }) {
  const [state, formAction, pending] = useActionState(
    cancelTimeOffAction,
    empty,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="timeOffId" value={timeOffId} />
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        Annuler
      </Button>
    </form>
  );
}
