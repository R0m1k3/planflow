'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  assignRttPolicyAction,
  createRttPolicyAction,
  type ActionState,
} from '@/server/settings/rtt-policies';

const empty: ActionState = {};

export function AddPolicyForm() {
  const [state, action] = useActionState(createRttPolicyAction, empty);

  return (
    <PersistentForm
      action={action}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap gap-3">
        <Field
          label="Nom"
          name="name"
          required
          maxLength={160}
          placeholder="RTT cadres"
        />
        <Field
          label="Jours par an"
          name="daysPerYear"
          type="number"
          step="0.5"
          min="0"
          max="365"
          required
          defaultValue="0"
        />
        <Field
          label="Début de période"
          name="periodStart"
          required
          placeholder="01-01"
          pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])"
          hint="Format MM-JJ : la période se reconduit d’une année sur l’autre, sans millésime à réécrire."
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="autoRenew" defaultChecked className="mt-0.5" />
        <span>
          Reconduction automatique
          <span className="block text-micro text-ink-3">
            La politique ouvre un nouveau droit à chaque début de période.
            Archivée, elle cesse de le faire.
          </span>
        </span>
      </label>

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Créer la politique</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Politique enregistrée.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}

export function AssignForm({
  policyId,
  candidates,
  assigned,
}: {
  policyId: string;
  candidates: Array<{ membershipId: string; name: string }>;
  assigned: string[];
}) {
  const [state, action] = useActionState(assignRttPolicyAction, empty);
  const available = candidates.filter(
    (candidate) => !assigned.includes(candidate.membershipId),
  );

  if (available.length === 0) {
    return (
      <p className="text-xs text-ink-3">
        Tous les salariés actifs sont déjà couverts par cette politique.
      </p>
    );
  }

  return (
    <PersistentForm
      action={action}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="policyId" value={policyId} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Salariés à assigner</span>
        <select
          name="membershipIds"
          multiple
          size={Math.min(8, available.length)}
          className="rounded-2 border border-line-2 bg-surface px-2 py-1 text-sm text-ink-1"
        >
          {available.map((candidate) => (
            <option key={candidate.membershipId} value={candidate.membershipId}>
              {candidate.name}
            </option>
          ))}
        </select>
      </label>

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton size="sm">Assigner</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Affectation enregistrée.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}
