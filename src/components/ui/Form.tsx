'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { Button, type ButtonProps } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, className, id, ...rest }: FieldProps) {
  // L'indication est rattachée par `aria-describedby` et non laissée dans le
  // `<label>`. Placée dedans, elle entre dans le **nom accessible** du champ :
  // une aide à la saisie devient alors une partie de son intitulé, annoncée
  // comme telle par un lecteur d'écran, et deux champs voisins cessent d'être
  // distinguables par leur nom.
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = `${fieldId}-hint`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {label}
      </label>
      <input
        {...rest}
        id={fieldId}
        {...(hint ? { 'aria-describedby': hintId } : {})}
        className={cx(
          'h-9 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1',
          'outline-none placeholder:text-ink-3 focus-visible:border-focus',
          className,
        )}
      />
      {hint ? (
        <span id={hintId} className="text-micro text-ink-3">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** Bouton de soumission qui se désactive pendant l'envoi, pour éviter le double clic. */
export function SubmitButton({ children, ...rest }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending} {...rest}>
      {pending ? 'Enregistrement…' : children}
    </Button>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-2 border border-danger bg-danger-soft px-3 py-2 text-xs text-danger-soft-ink"
    >
      {children}
    </p>
  );
}
