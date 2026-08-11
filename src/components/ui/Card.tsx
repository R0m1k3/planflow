import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={cx(
        'overflow-hidden rounded-3 border border-line-1 bg-surface',
        'shadow-e1',
        className,
      )}
    >
      {children}
    </section>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** Décompte ou statut affiché contre le titre. */
  badge?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, badge, action }: CardHeaderProps) {
  return (
    // Le filet de marge marque l'en-tête, comme la marge d'un registre marque
    // le début d'une écriture. Il remplace le fond gris qu'on met d'ordinaire
    // là : un aplat de plus sur un écran de tableaux ajoute du bruit, un trait
    // de 2 px suffit à dire « ici commence quelque chose ».
    <header className="flex items-center gap-2.5 border-b border-line-1 px-4 py-3">
      <span aria-hidden className="-ml-4 h-5 w-[2px] rounded-r-full bg-accent" />
      <h2 className="text-md font-semibold tracking-[-0.015em]">{title}</h2>
      {badge}
      <span className="flex-1" />
      {action}
    </header>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center gap-2.5 px-6 py-16 text-center',
        className,
      )}
    >
      <span
        aria-hidden
        className="size-9 rounded-2 border-[1.5px] border-line-3 bg-surface-2"
      />
      <p className="text-md font-semibold">{title}</p>
      {description ? (
        <p className="max-w-[46ch] text-sm leading-[var(--lh-prose)] text-ink-2">
          {description}
        </p>
      ) : null}
    </div>
  );
}
