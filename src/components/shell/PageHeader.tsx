import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-line-1 pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>
        ) : null}
      </div>
      <span className="flex-1" />
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  // `gap-6` plutôt que `gap-5` : sur un écran de cartes empilées, l'ancien
  // écart laissait deux cartes se lire comme une seule.
  return (
    <div className="flex flex-col gap-6 px-6 pt-6 pb-20">{children}</div>
  );
}
