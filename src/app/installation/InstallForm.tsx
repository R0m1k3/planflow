'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { Field, FormError } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import { MIN_PASSWORD_LENGTH } from '@/domain/access/invitation';
import { DEFAULT_TIMEZONE } from '@/domain/install/rules';
import { installAction, type InstallState } from '@/server/install/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" className="w-full" disabled={pending}>
      {pending ? 'Installation…' : 'Installer PlanFlow'}
    </Button>
  );
}

export function InstallForm() {
  const [state, formAction] = useActionState<InstallState, FormData>(
    installAction,
    {},
  );

  return (
    <PersistentForm
      action={formAction}
      className="flex flex-col gap-6"
    >
      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Votre entreprise</legend>

        <Field
          label="Nom de l’entreprise"
          name="companyName"
          required
          autoComplete="organization"
        />

        <div className="flex flex-col gap-4 sm:flex-row">
          <Field
            label="Premier établissement"
            name="locationName"
            required
            hint="Vous pourrez en ajouter d’autres ensuite."
          />
          <Field
            label="Fuseau horaire"
            name="timezone"
            required
            defaultValue={DEFAULT_TIMEZONE}
            hint="Il décide des durées travaillées, changement d’heure compris."
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">
          Votre compte administrateur
        </legend>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Field label="Prénom" name="firstName" required autoComplete="given-name" />
          <Field label="Nom" name="lastName" required autoComplete="family-name" />
        </div>

        <Field
          label="Adresse électronique"
          name="email"
          type="email"
          required
          autoComplete="username"
        />

        <Field
          label="Mot de passe"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          hint={`${MIN_PASSWORD_LENGTH} caractères au moins, sans votre nom ni votre adresse.`}
        />
        <Field
          label="Confirmez le mot de passe"
          name="passwordConfirmation"
          type="password"
          required
          autoComplete="new-password"
        />
      </fieldset>

      <FormError>{state.error}</FormError>

      <SubmitButton />
    </PersistentForm>
  );
}
