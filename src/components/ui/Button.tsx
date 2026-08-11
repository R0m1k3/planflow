import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '@/lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  // Le primaire porte une ombre courte : c'est le seul élément de l'interface
  // qui se soulève, et il n'y en a qu'un par écran.
  primary:
    'border-accent bg-accent text-accent-ink shadow-e1 hover:bg-accent-hover active:bg-accent-press active:shadow-none',
  secondary:
    'border-line-2 bg-surface text-ink-1 hover:border-line-3 hover:bg-surface-2 active:bg-surface-3',
  ghost:
    'border-transparent bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink-1',
  danger:
    'border-danger bg-danger text-danger-ink shadow-e1 hover:bg-danger-hover active:bg-danger-hover active:shadow-none',
};

/* Cibles plus hautes : 26 px était sous le seuil confortable au pointeur, et
   nettement sous les 44 px recommandés au doigt sur la version installable. */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2 border font-medium',
        'cursor-pointer transition-colors duration-[var(--d-1)] ease-organic',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  );
}
