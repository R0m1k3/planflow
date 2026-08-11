'use client';

import { useActionState } from 'react';

import { FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import { PRINT_DENSITIES, togglesOf } from '@/domain/settings/preferences';
import {
  savePreferencesAction,
  type ActionState,
  type Preferences,
} from '@/server/settings/account';

const empty: ActionState = {};

export function PrintForm({ preferences }: { preferences: Preferences }) {
  const [state, action] = useActionState(savePreferencesAction, empty);
  const toggles = togglesOf('print');

  return (
    <PersistentForm action={action} className="flex flex-col gap-4 px-4 py-4">
      {toggles.map((toggle) => (
        <input key={`scope-${toggle.key}`} type="hidden" name="scope" value={toggle.key} />
      ))}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Orientation</legend>
        <p className="text-micro text-ink-3">
          Une semaine se lit en largeur : le paysage évite de couper le
          dimanche sur une seconde page.
        </p>
        {[
          { value: 'landscape', label: 'Paysage' },
          { value: 'portrait', label: 'Portrait' },
        ].map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="printOrientation"
              value={option.value}
              defaultChecked={
                (option.value === 'landscape') === preferences.printLandscape
              }
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <label className="flex max-w-sm flex-col gap-1.5">
        <span className="text-sm font-medium">Densité</span>
        <select
          name="printDensity"
          defaultValue={preferences.printDensity}
          className="h-9 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        >
          {PRINT_DENSITIES.map((density) => (
            <option key={density.key} value={density.key}>
              {density.label} — {density.hint}
            </option>
          ))}
        </select>
      </label>

      {toggles.map((toggle) => (
        <div key={toggle.key} className="flex flex-col gap-1">
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name={toggle.key}
              defaultChecked={Boolean(
                preferences[toggle.key as keyof Preferences],
              )}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{toggle.label}</span>
              <span className="block text-micro leading-[var(--lh-prose)] text-ink-3">
                {toggle.hint}
              </span>
            </span>
          </label>

          {toggle.warning ? (
            <p className="ml-6 rounded-2 border border-warn bg-warn-soft px-2.5 py-1.5 text-micro leading-[var(--lh-prose)] text-warn-soft-ink">
              {toggle.warning}
            </p>
          ) : null}
        </div>
      ))}

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Enregistrer</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Réglages enregistrés.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}
