'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  createJobTitleAction,
  renameJobTitleAction,
  type ActionState,
} from '@/server/settings/job-titles';

const empty: ActionState = {};

export function AddJobTitleForm() {
  const [state, action] = useActionState(createJobTitleAction, empty);

  return (
    <PersistentForm
      action={action}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Intitulé"
          name="name"
          required
          maxLength={120}
          placeholder="Hôte de caisse"
          hint="L’intitulé figure au registre unique du personnel et sur le contrat."
        />
        <SubmitButton>Ajouter l’emploi</SubmitButton>
      </div>
      <FormError>{state.error}</FormError>
      {state.ok ? (
        <p className="text-xs text-ok-soft-ink">Emploi enregistré.</p>
      ) : null}
    </PersistentForm>
  );
}

export function RenameJobTitleForm({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [state, action] = useActionState(renameJobTitleAction, empty);

  return (
    <PersistentForm action={action} className="flex flex-1 items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Field
        label="Intitulé"
        name="name"
        defaultValue={name}
        required
        maxLength={120}
        className="h-8"
      />
      <SubmitButton size="sm">Renommer</SubmitButton>
      <FormError>{state.error}</FormError>
    </PersistentForm>
  );
}
