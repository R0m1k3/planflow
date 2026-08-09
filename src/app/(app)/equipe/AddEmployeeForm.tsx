'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  createEmployeeAction,
  type ActionState,
} from '@/server/employees/actions';

export function AddEmployeeForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createEmployeeAction,
    {},
  );

  return (
    <PersistentForm
      action={formAction}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap gap-3">
        <Field label="Prénom" name="firstName" required />
        <Field label="Nom" name="lastName" required />
        <Field label="Matricule" name="employeeNumber" required />
      </div>

      <Field
        label="Adresse électronique"
        name="email"
        type="email"
        hint="Facultative. Un salarié sans adresse reste plannifiable et déclarable ; il n'aura simplement pas d'accès à l'application."
      />

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Ajouter</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Salarié ajouté.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}
