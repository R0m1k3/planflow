'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import {
  createTeamAction,
  type ActionState,
} from '@/server/settings/locations';

export function AddTeamForm({ locationId }: { locationId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createTeamAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="locationId" value={locationId} />
      <Field label="Nouvelle équipe" name="name" placeholder="Caisse" required />
      <SubmitButton size="md">Ajouter</SubmitButton>
      <div className="w-full">
        <FormError>{state.error}</FormError>
      </div>
    </form>
  );
}
