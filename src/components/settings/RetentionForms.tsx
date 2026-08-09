'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  START_POINT_LABELS,
  START_POINTS,
} from '@/domain/retention/policy';
import {
  runPurgeAction,
  saveRetentionPolicyAction,
  toggleLegalHoldAction,
  type RetentionState,
} from '@/server/retention/actions';

const empty: RetentionState = {};

export function RetentionPolicyForm() {
  const [state, action, pending] = useActionState(
    saveRetentionPolicyAction,
    empty,
  );

  return (
    <PersistentForm
      action={action}
      resetAfter={state.ok ? state : null}
      className="grid gap-3 sm:grid-cols-2"
    >
      <Field
        label="Objet"
        name="objectType"
        placeholder="Document:SICK_NOTE"
        required
        hint="Un objet précis l’emporte sur le général : « Document:SICK_NOTE » avant « Document »."
      />
      <Field
        label="Durée en mois"
        name="durationMonths"
        type="number"
        min={1}
        required
        hint="De date à date. 60 pour cinq ans."
      />

      <label className="flex flex-col gap-1">
        <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
          Point de départ
        </span>
        <select
          name="startPoint"
          defaultValue="creation"
          className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        >
          {START_POINTS.map((point) => (
            <option key={point} value={point}>
              {START_POINT_LABELS[point]}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="En vigueur à partir du"
        name="effectiveFrom"
        type="date"
        required
        hint="Effectif-daté : une pièce relève de la politique en vigueur au jour de son dépôt."
      />

      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
          Justification
        </span>
        <textarea
          name="justification"
          rows={2}
          required
          minLength={10}
          className="rounded-2 border border-line-2 bg-surface px-2 py-1 text-sm text-ink-1"
        />
        <span className="text-micro text-ink-3">
          Obligatoire. Une durée sans motif est une durée qu’on ne saura pas
          défendre le jour d’un contrôle.
        </span>
      </label>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="primary" disabled={pending}>
          Enregistrer
        </Button>
        <Messages state={state} />
      </div>
    </PersistentForm>
  );
}

export function LegalHoldForm({
  policyId,
  held,
}: {
  policyId: string;
  held: boolean;
}) {
  const [state, action, pending] = useActionState(toggleLegalHoldAction, empty);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="policyId" value={policyId} />
      <Button type="submit" disabled={pending}>
        {held ? 'Lever la suspension' : 'Suspendre'}
      </Button>
      {held ? (
        <span className="text-micro text-info-soft-ink">Suspendue</span>
      ) : null}
      {state.error ? (
        <span role="alert" className="text-micro text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function PurgeForm({ due }: { due: number }) {
  const [state, action, pending] = useActionState(runPurgeAction, empty);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3 border-t border-line-1 pt-3">
      <Button type="submit" variant="primary" disabled={pending || due === 0}>
        Purger les pièces échues
      </Button>
      <span className="text-micro text-ink-3">
        {/* Le bouton est un dépannage : la matrice demande des purges
            automatiques, et `pnpm retention:purge` sert à les planifier. */}
        Aussi disponible en ligne de commande, pour une exécution périodique.
      </span>
      <Messages state={state} />
    </form>
  );
}

function Messages({ state }: { state: RetentionState }) {
  return (
    <>
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      {state.message ? (
        <span className="text-xs text-ok-soft-ink">{state.message}</span>
      ) : null}
    </>
  );
}

function Field({
  label,
  name,
  hint,
  ...rest
}: {
  label: string;
  name: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `retention-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        {...rest}
      />
      {hint ? <p className="text-micro text-ink-3">{hint}</p> : null}
    </div>
  );
}

// Exports nommés et non un objet de composants : une référence client passée
// depuis un composant serveur ne survit pas à l'indirection d'un namespace —
// React ne reçoit alors qu'un `undefined` et rend une page d'erreur.
