'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import { POSTE_CODES, POSTE_LABELS } from '@/lib/design/postes';
import {
  createLabelAction,
  updateLabelAction,
  type ActionState,
} from '@/server/settings/labels';

const empty: ActionState = {};

function PaletteSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Teinte</span>
      <select
        name="paletteKey"
        defaultValue={defaultValue ?? POSTE_CODES[0]}
        className="h-9 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
      >
        {POSTE_CODES.map((code) => (
          <option key={code} value={code}>
            {POSTE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AddLabelForm() {
  const [state, action] = useActionState(createLabelAction, empty);

  return (
    <PersistentForm
      action={action}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Code"
          name="code"
          required
          maxLength={12}
          placeholder="cai"
          hint="Affiché sur le bloc de planning : la couleur ne porte jamais l’information seule."
        />
        <Field label="Libellé" name="name" required maxLength={120} placeholder="Caisse" />
        <PaletteSelect />
        <SubmitButton>Ajouter l’étiquette</SubmitButton>
      </div>
      <FormError>{state.error}</FormError>
      {state.ok ? (
        <p className="text-xs text-ok-soft-ink">Étiquette enregistrée.</p>
      ) : null}
    </PersistentForm>
  );
}

export function EditLabelForm({
  id,
  name,
  paletteKey,
}: {
  id: string;
  name: string;
  paletteKey: string;
}) {
  const [state, action] = useActionState(updateLabelAction, empty);

  return (
    <PersistentForm action={action} className="flex flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Field label="Libellé" name="name" defaultValue={name} required maxLength={120} />
      <PaletteSelect defaultValue={paletteKey} />
      <SubmitButton size="sm">Enregistrer</SubmitButton>
      <FormError>{state.error}</FormError>
    </PersistentForm>
  );
}
