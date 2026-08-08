'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  createPeriodAction,
  deletePeriodAction,
  lockPeriodAction,
  unlockPeriodAction,
  type PeriodActionState,
} from '@/server/payroll/period-actions';

const empty: PeriodActionState = {};

export function CreatePeriodForm({
  locationId,
  suggestedMonth,
}: {
  locationId: string;
  suggestedMonth: string;
}) {
  const [state, formAction, pending] = useActionState(
    createPeriodAction,
    empty,
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-3 border border-line-2 bg-surface-2 p-3"
    >
      <input type="hidden" name="locationId" value={locationId} />

      <label className="flex flex-col gap-1">
        <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
          Mois
        </span>
        <input
          name="month"
          type="month"
          defaultValue={suggestedMonth}
          required
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
          Libellé
        </span>
        <input
          name="label"
          type="text"
          maxLength={80}
          placeholder="Facultatif"
          className="h-8 w-48 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </label>

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        Créer la période
      </Button>

      {state.error ? (
        <p role="alert" className="w-full text-xs text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Verrouillage d'une période.
 *
 * Le verrou fige les instantanés **et** ferme la période aux mutations : plus
 * aucun créneau ni congé ne peut être posé sur ces dates tant qu'elle n'est pas
 * rouverte.
 */
export function LockButton({
  periodId,
  version,
}: {
  periodId: string;
  version: number;
}) {
  const [state, formAction, pending] = useActionState(lockPeriodAction, empty);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="periodId" value={periodId} />
      <input type="hidden" name="expectedVersion" value={version} />
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      {state.message ? (
        <span className="text-xs text-ok-soft-ink">{state.message}</span>
      ) : null}
      <Button type="submit" size="sm" variant="primary" disabled={pending}>
        Verrouiller la période
      </Button>
    </form>
  );
}

/**
 * Déverrouillage.
 *
 * La justification est exigée à la saisie, pas seulement côté serveur : rouvrir
 * une période périme les fichiers déjà transmis au cabinet, et six mois plus
 * tard personne ne saura pourquoi.
 */
export function UnlockForm({
  periodId,
  version,
}: {
  periodId: string;
  version: number;
}) {
  const [state, formAction, pending] = useActionState(
    unlockPeriodAction,
    empty,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="periodId" value={periodId} />
      <input type="hidden" name="expectedVersion" value={version} />
      <label className="flex items-center gap-1.5">
        <span className="sr-only">Motif du déverrouillage</span>
        <input
          name="reason"
          type="text"
          required
          maxLength={500}
          placeholder="Motif du déverrouillage"
          className="h-8 w-56 rounded-2 border border-warn bg-surface px-2 text-sm text-ink-1"
        />
      </label>
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      {state.message ? (
        <span className="text-xs text-warn-soft-ink">{state.message}</span>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        Déverrouiller
      </Button>
    </form>
  );
}

/**
 * Suppression d'une période.
 *
 * La confirmation demande de **retaper le libellé** : supprimer une période
 * verrouillée efface les instantanés sur lesquels un export a pu être bâti, et
 * un simple « êtes-vous sûr » se clique sans lire.
 */
export function DeletePeriodForm({
  periodId,
  label,
}: {
  periodId: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(
    deletePeriodAction,
    empty,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="periodId" value={periodId} />
      <label className="flex items-center gap-1.5">
        <span className="sr-only">Confirmer en saisissant « {label} »</span>
        <input
          name="confirm"
          type="text"
          placeholder={`Saisir « ${label} »`}
          className="h-8 w-44 rounded-2 border border-line-2 bg-surface px-2 text-xs text-ink-1"
        />
      </label>
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      <Button type="submit" size="sm" variant="danger" disabled={pending}>
        Supprimer
      </Button>
    </form>
  );
}
