'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  saveAccountIdentityAction,
  type AccountIdentity,
  type ActionState,
} from '@/server/settings/account';

const empty: ActionState = {};

export function AccountIdentityForm({
  account,
}: {
  account: AccountIdentity;
}) {
  const [state, action] = useActionState(saveAccountIdentityAction, empty);

  return (
    <PersistentForm action={action} className="flex flex-col gap-3 p-4">
      <Field
        label="Raison sociale"
        name="name"
        defaultValue={account.name}
        required
        maxLength={200}
      />

      <div className="flex flex-wrap gap-3">
        <Field
          label="SIREN"
          name="siren"
          defaultValue={account.siren ?? ''}
          inputMode="numeric"
          placeholder="9 chiffres"
          hint="Identifie l’entreprise. Le SIRET, propre à chaque établissement, se saisit sur l’établissement."
        />
        <Field
          label="Code APE"
          name="apeCode"
          defaultValue={account.apeCode ?? ''}
          placeholder="4759B"
        />
      </div>

      <Field
        label="Adresse du siège"
        name="addressLine"
        defaultValue={account.addressLine ?? ''}
        maxLength={200}
        hint="Figure sur les documents édités et au registre unique du personnel."
      />

      <div className="flex flex-wrap gap-3">
        <Field
          label="Code postal"
          name="postalCode"
          defaultValue={account.postalCode ?? ''}
          inputMode="numeric"
        />
        <Field
          label="Ville"
          name="city"
          defaultValue={account.city ?? ''}
          maxLength={120}
        />
      </div>

      <Field
        label="Fuseau horaire"
        name="timezone"
        defaultValue={account.timezone}
        required
        hint="Défaut du compte. Un établissement dans un autre fuseau porte le sien."
      />

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Enregistrer</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Compte enregistré.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}
