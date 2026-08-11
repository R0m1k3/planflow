'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  createTemplateAction,
  updateTemplateAction,
  type ActionState,
} from '@/server/settings/templates';

const empty: ActionState = {};

function BodyField({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Corps du document</span>
      <textarea
        name="bodyHtml"
        rows={10}
        required
        defaultValue={defaultValue}
        placeholder="<p>Je soussigné…, atteste que {{salarie.prenom}} {{salarie.nom}} est employé…</p>"
        className="rounded-2 border border-line-2 bg-surface px-3 py-2 font-mono text-xs text-ink-1 outline-none focus-visible:border-focus"
      />
      <span className="text-micro text-ink-3">
        Les variables s’écrivent entre doubles accolades. Une variable inconnue
        fait refuser l’enregistrement — mieux vaut la corriger ici que de
        découvrir un trou dans l’attestation au moment de la remettre.
      </span>
    </label>
  );
}

export function AddTemplateForm() {
  const [state, action] = useActionState(createTemplateAction, empty);

  return (
    <PersistentForm
      action={action}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-3"
    >
      <Field
        label="Nom du modèle"
        name="name"
        required
        maxLength={160}
        placeholder="Attestation d’emploi"
      />
      <BodyField />
      <FormError>{state.error}</FormError>
      <div className="flex items-center gap-3">
        <SubmitButton>Créer le modèle</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Modèle enregistré.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}

export function EditTemplateForm({
  id,
  name,
  bodyHtml,
}: {
  id: string;
  name: string;
  bodyHtml: string;
}) {
  const [state, action] = useActionState(updateTemplateAction, empty);

  return (
    <PersistentForm action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Nom du modèle" name="name" defaultValue={name} required maxLength={160} />
      <BodyField defaultValue={bodyHtml} />
      <FormError>{state.error}</FormError>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm">Enregistrer</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Modifications prises.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}
