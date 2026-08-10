import type { ReactNode } from 'react';

/**
 * Carte de consultation du dossier.
 *
 * Deux colonnes par ligne — l'intitulé, puis la valeur — et un filet entre
 * chaque : c'est la forme d'un état civil, qui se parcourt du regard en
 * cherchant un champ précis plutôt qu'en lisant de haut en bas.
 */
export function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3 border border-line-1 bg-surface p-5">
      <header className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="size-7 flex-none rounded-2 border border-accent bg-accent-soft"
        />
        <h2 className="text-md font-semibold">{title}</h2>
      </header>
      <dl className="mt-4">{children}</dl>
    </section>
  );
}

export function InfoRow({
  label,
  value,
  tnum = false,
}: {
  label: string;
  value: string | null | undefined;
  /** Chiffres alignés : dates, téléphones, numéros. */
  tnum?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line-1 py-3 last:border-b-0">
      <dt className="min-w-[11rem] flex-none text-sm font-medium text-ink-1">
        {label}
      </dt>
      <dd
        className={
          value
            ? `text-sm text-ink-2${tnum ? ' tnum' : ''}`
            : 'text-sm text-ink-3'
        }
      >
        {value || 'Non renseigné'}
      </dd>
    </div>
  );
}

/** Grille à deux colonnes des cartes du dossier. */
export function InfoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
      {children}
    </div>
  );
}
