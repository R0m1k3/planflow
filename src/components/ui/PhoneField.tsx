'use client';

import { useId, useState } from 'react';

import {
  DEFAULT_DIAL_COUNTRY,
  DIAL_CODES,
  countryLabel,
  splitDial,
} from '@/domain/hr/geo';

/**
 * Numéro de téléphone avec indicatif.
 *
 * Deux contrôles à l'écran, une seule valeur envoyée : l'indicatif et le reste
 * sont recollés dans un champ caché. Enregistrer l'indicatif à part obligerait
 * chaque lecture — annuaire, export, SMS — à le recomposer, et un numéro à
 * moitié lu ne joint personne.
 *
 * La liste des indicatifs est courte à dessein. Le champ accepte un numéro
 * international saisi en entier : c'est ce qui reste vrai pour les pays qui
 * n'y figurent pas.
 */
export function PhoneField({
  label,
  name,
  defaultValue = '',
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
}) {
  const generated = useId();
  const initial = splitDial(defaultValue);
  const [dial, setDial] = useState(initial.dial);
  const [rest, setRest] = useState(initial.rest);

  const options = Object.entries(DIAL_CODES)
    .map(([code, value]) => ({
      code,
      value,
      label: `${countryLabel(code) ?? code} ${value}`,
    }))
    .sort((a, b) => {
      if (a.code === DEFAULT_DIAL_COUNTRY) return -1;
      if (b.code === DEFAULT_DIAL_COUNTRY) return 1;
      return a.label.localeCompare(b.label, 'fr');
    });

  // Un numéro vide reste vide : recoller l'indicatif seul enregistrerait
  // « +33 » comme un numéro, et l'annuaire afficherait un contact fantôme.
  const composed = rest.trim() ? `${dial} ${rest.trim()}` : '';

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={generated} className="text-sm font-medium">
        {label}
      </label>
      <input type="hidden" name={name} value={composed} />
      <div className="flex gap-2">
        <select
          aria-label={`Indicatif — ${label}`}
          value={dial}
          onChange={(event) => setDial(event.target.value)}
          className="h-9 w-28 shrink-0 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1 outline-none focus-visible:border-focus"
        >
          {options.map((option) => (
            <option key={option.code} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          id={generated}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={rest}
          onChange={(event) => setRest(event.target.value)}
          {...(hint ? { 'aria-describedby': `${generated}-hint` } : {})}
          className="h-9 min-w-0 flex-1 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1 outline-none placeholder:text-ink-3 focus-visible:border-focus"
        />
      </div>
      {hint ? (
        <span id={`${generated}-hint`} className="text-micro text-ink-3">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
