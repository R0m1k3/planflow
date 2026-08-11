'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  saveProductivityTargetAction,
  type ActionState,
} from '@/server/settings/account';

const empty: ActionState = {};

export function ProductivityForm({ target }: { target: string | null }) {
  const [state, action] = useActionState(saveProductivityTargetAction, empty);

  return (
    <PersistentForm action={action} className="flex flex-col gap-3 p-4">
      <div className="flex max-w-sm items-end gap-2">
        <Field
          label="Objectif de productivité"
          name="target"
          type="number"
          step="0.01"
          min="0"
          defaultValue={target ?? ''}
          hint="Chiffre d’affaires attendu par heure travaillée, en euros. Laisser vide pour n’en fixer aucun."
        />
        <span className="pb-2.5 text-sm text-ink-2">€/h</span>
      </div>

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Enregistrer</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Objectif enregistré.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}
