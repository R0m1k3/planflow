'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  saveMappingAction,
  type PayrollActionState,
} from '@/server/payroll/actions';
import type { MappingRow } from '@/server/payroll/queries';

const empty: PayrollActionState = {};

/**
 * Correspondance d'un élément calculé vers un code du dossier Silae.
 *
 * La confirmation est un acte distinct de la saisie. Un code peut être proposé
 * — `EV-HDimanche` se lit sans ambiguïté — mais seul le gestionnaire de paie
 * sait s'il est le bon dans **ce** dossier. Tant qu'il n'a pas confirmé,
 * l'export refuse de tourner.
 */
export function MappingForm({
  row,
  knownCodes,
}: {
  row: MappingRow;
  knownCodes: string[];
}) {
  const [state, formAction, pending] = useActionState(saveMappingAction, empty);

  const listId = `codes-${row.key}`;

  return (
    <PersistentForm
      resetAfter={state.ok ? state : null}
      action={formAction}
      className="flex flex-wrap items-center gap-3 border-b border-line-1 px-4 py-3 last:border-b-0"
    >
      <input type="hidden" name="sourceKey" value={row.key} />

      <div className="min-w-52 flex-1">
        <p className="text-sm font-medium text-ink-1">{row.label}</p>
        <p className="text-micro text-ink-3">
          {row.unit === 'DAYS' ? 'Jours' : 'Heures'} · famille {row.kind}
          {row.suggestedCode ? null : ' · code à obtenir du dossier'}
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="sr-only">Code Silae pour {row.label}</span>
        <input
          name="silaeCode"
          type="text"
          list={listId}
          maxLength={80}
          defaultValue={row.silaeCode ?? row.suggestedCode ?? ''}
          placeholder="Code du dossier"
          className="h-8 w-64 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
        <datalist id={listId}>
          {knownCodes.map((code) => (
            <option key={code} value={code} />
          ))}
        </datalist>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-ink-2">
        <input
          name="confirmed"
          type="checkbox"
          defaultChecked={row.confirmed}
          className="size-4"
        />
        Confirmé par la paie
      </label>

      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      {state.ok ? (
        <span className="text-xs text-ok-soft-ink">Enregistré</span>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        Enregistrer
      </Button>
    </PersistentForm>
  );
}
