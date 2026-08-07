'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { LEGAL_DOMAINS } from '@/domain/legal/domains';
import {
  addLegalEntryAction,
  type ActionState,
} from '@/server/settings/legal-register';

export function AddEntryForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addLegalEntryAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">Domaine</span>
          <select
            name="domain"
            required
            className="h-9 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1 outline-none focus-visible:border-focus"
          >
            {LEGAL_DOMAINS.map((domain) => (
              <option key={domain.key} value={domain.key}>
                {domain.label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Paramètre"
          name="key"
          required
          placeholder="Durée quotidienne maximale"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Field label="Valeur" name="value" required placeholder="10 h" />
        <Field
          label="Source"
          name="source"
          required
          placeholder="IDCC 1517, texte consolidé Legifrance du…"
          hint="Texte, article, ou référence de l’accord. Une valeur sans source n’est pas opposable."
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Field
          label="Date d’effet"
          name="effectiveFrom"
          type="date"
          required
          defaultValue="2026-01-01"
        />
        <Field
          label="Population"
          name="population"
          required
          defaultValue="Tous les salariés"
          placeholder="Cadres autonomes niveaux VII à IX"
        />
      </div>

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Consigner</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">
            Paramètre consigné — il reste à approuver.
          </span>
        ) : null}
      </div>
    </form>
  );
}
