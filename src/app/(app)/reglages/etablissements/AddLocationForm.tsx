'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  createLocationAction,
  type ActionState,
} from '@/server/settings/locations';

export function AddLocationForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createLocationAction,
    {},
  );

  return (
    <PersistentForm
      action={formAction}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap gap-3">
        <Field label="Nom" name="name" required placeholder="Nantes Atlantis" />
        <Field
          label="SIRET"
          name="siret"
          inputMode="numeric"
          placeholder="14 chiffres"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Field
          label="Fuseau horaire"
          name="timezone"
          defaultValue="Europe/Paris"
          hint="Les durées se calculent depuis les instants ; le fuseau ne sert qu'à l'affichage et au regroupement par jour."
        />
        <Field
          label="Cotisations patronales"
          name="employerContributionRate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue="42"
          hint="Taux moyen, utilisé pour le coût prévisionnel du planning."
        />
      </div>

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Créer l’établissement</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Établissement créé.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}
