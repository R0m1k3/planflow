'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { Button, type ButtonProps } from '@/components/ui/Button';
import { cx } from '@/lib/cx';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, className, ...rest }: FieldProps) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...rest}
        className={cx(
          'h-9 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1',
          'outline-none placeholder:text-ink-3 focus-visible:border-focus',
          className,
        )}
      />
      {hint ? <span className="text-micro text-ink-3">{hint}</span> : null}
    </label>
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
