import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.018em]">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-2">{subtitle}</p>
        ) : null}
      </div>
      <span className="flex-1" />
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 px-6 pt-5 pb-16">{children}</div>
  );
}
