'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * Édition du registre unique du personnel.
 *
 * L'établissement est demandé avant le téléchargement, et non déduit : le
 * registre se tient **par établissement**, et en tirer un au hasard pour une
 * entreprise qui en compte trente ne répondrait à aucune demande d'inspection.
 *
 * L'avertissement sur les mentions manquantes arrive avant le fichier, pas
 * dedans : découvrir un registre incomplet en l'ouvrant, c'est le découvrir
 * devant l'inspection.
 */

export interface RegisterLocation {
  id: string;
  name: string;
  incomplete: number;
  total: number;
}

export function RegisterDialog({
  locations,
}: {
  locations: RegisterLocation[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState('');

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const chosen = locations.find((location) => location.id === locationId);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Registre unique du personnel
      </Button>

      <dialog
        ref={dialog}
        aria-labelledby="titre-rup"
        onClose={() => setOpen(false)}
        className="m-auto w-[min(38rem,calc(100vw-2rem))] rounded-3 border border-line-1 bg-surface p-0 text-ink-1 backdrop:bg-[rgb(0_0_0/0.4)]"
      >
        <header className="flex items-center gap-3 px-5 pt-5">
          <h2 id="titre-rup" className="text-lg font-semibold">
            Téléchargez votre registre unique du personnel
          </h2>
          <span className="flex-1" />
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </header>

        <div className="flex flex-col gap-4 p-5">
          <p className="rounded-3 border border-line-1 bg-surface-2 p-4 text-sm leading-[var(--lh-prose)] text-ink-2">
            Tout employeur doit tenir un registre unique du personnel par
            établissement. Aucune forme n’est imposée : en cas de contrôle par
            l’inspection du travail, le format numérique peut être présenté.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Établissement pour lequel éditer le registre
            </span>
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="h-10 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1 outline-none focus-visible:border-focus"
            >
              <option value="">Choisissez un établissement…</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          {chosen && chosen.incomplete > 0 ? (
            <div
              role="alert"
              className="rounded-3 border border-warn bg-warn-soft p-4 text-sm text-warn-soft-ink"
            >
              <p className="font-semibold">
                Des mentions manquent pour {chosen.incomplete} salarié
                {chosen.incomplete > 1 ? 's' : ''} de cet établissement
              </p>
              <p className="mt-1 leading-[var(--lh-prose)]">
                Le registre reste éditable, et les manques y figurent en clair.
                Un registre incomplet expose à une contravention par salarié
                concerné : complétez les dossiers avant de le présenter.
              </p>
            </div>
          ) : null}

          {chosen && chosen.total === 0 ? (
            <p className="text-sm text-ink-3">
              Aucun contrat n’est rattaché à cet établissement : le registre
              sera vide.
            </p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-line-1 px-5 py-4">
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          {/* Un lien, pas un bouton : le navigateur télécharge sans quitter la
              page, et l'adresse reste rejouable. */}
          <a
            href={
              locationId ? `/equipe/registre?etablissement=${locationId}` : '#'
            }
            aria-disabled={!locationId}
            onClick={(event) => {
              if (!locationId) event.preventDefault();
              else setOpen(false);
            }}
            className={
              locationId
                ? 'inline-flex h-8 items-center rounded-2 border border-accent bg-accent px-3.5 text-sm font-medium text-accent-ink hover:bg-accent-hover'
                : 'pointer-events-none inline-flex h-8 items-center rounded-2 border border-line-2 bg-surface-3 px-3.5 text-sm font-medium text-ink-3'
            }
          >
            Télécharger
          </a>
        </footer>
      </dialog>
    </>
  );
}
