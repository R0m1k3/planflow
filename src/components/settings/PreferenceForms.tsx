'use client';

import { useActionState } from 'react';

import { FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  minutesToTime,
  togglesOf,
  type PreferenceGroup,
} from '@/domain/settings/preferences';
import {
  savePreferencesAction,
  type ActionState,
  type Preferences,
} from '@/server/settings/account';

const empty: ActionState = {};

/**
 * Un bloc de préférences.
 *
 * Chaque formulaire déclare les clés qu'il gouverne dans des champs `scope`.
 * Sans eux, enregistrer « Plannings » remettrait à faux tout « Droits » : une
 * case décochée n'arrive pas dans le `FormData`, et le serveur ne saurait pas
 * distinguer « décoché » de « pas dans ce formulaire ».
 */
export function PreferenceBlock({
  group,
  preferences,
  withEveningTime = false,
}: {
  group: PreferenceGroup;
  preferences: Preferences;
  withEveningTime?: boolean;
}) {
  const [state, action] = useActionState(savePreferencesAction, empty);
  const toggles = togglesOf(group);

  return (
    <PersistentForm action={action} className="flex flex-col gap-4 px-4 py-4">
      {toggles.map((toggle) => (
        <input key={`scope-${toggle.key}`} type="hidden" name="scope" value={toggle.key} />
      ))}

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

      {withEveningTime ? (
        <label className="flex max-w-xs flex-col gap-1.5">
          <span className="text-sm font-medium">
            Un créneau est « du soir » à partir de
          </span>
          <input
            type="time"
            name="eveningShiftStart"
            defaultValue={minutesToTime(preferences.eveningShiftStartMinutes)}
            className="h-9 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1"
          />
          <span className="text-micro text-ink-3">
            Sert au repérage à l’écran et aux majorations de soirée, pas au
            travail de nuit, qui relève de la convention.
          </span>
        </label>
      ) : null}

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
