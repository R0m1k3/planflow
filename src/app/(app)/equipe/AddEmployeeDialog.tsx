'use client';

import { useEffect, useRef, useState } from 'react';

import { AddEmployeeForm } from '@/app/(app)/equipe/AddEmployeeForm';
import { Button } from '@/components/ui/Button';
import type { ContractLocation } from '@/server/employees/queries';

/**
 * Ajout d'un collaborateur, en modale.
 *
 * Le formulaire d'embauche compte une quinzaine de champs : posé au bas de la
 * liste, il occupait plus de place que l'effectif qu'on vient consulter. Il ne
 * s'ouvre donc qu'à la demande.
 *
 * `<dialog>` natif plutôt qu'un panneau maison : il apporte le piège de focus,
 * la fermeture par Échap et le fond inerte, trois choses qu'une `<div>` doit
 * réimplémenter et rate presque toujours.
 */
export function AddEmployeeDialog({
  locations,
}: {
  locations: ContractLocation[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Ajouter un collaborateur
      </Button>

      <dialog
        ref={dialog}
        aria-labelledby="ajout-collaborateur"
        onClose={() => setOpen(false)}
        className="m-auto w-[min(46rem,calc(100vw-2rem))] rounded-3 border border-line-1 bg-surface p-0 text-ink-1 backdrop:bg-[rgb(0_0_0/0.4)]"
      >
        <header className="flex items-center gap-3 border-b border-line-1 px-5 py-4">
          <h2 id="ajout-collaborateur" className="text-md font-semibold">
            Ajouter un collaborateur
          </h2>
          <span className="flex-1" />
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {open ? (
            // Monté à l'ouverture : un formulaire démonté entre deux usages
            // repart vide, sans traîner la saisie abandonnée la fois d'avant.
            <AddEmployeeForm
              locations={locations}
              onSaved={() => setOpen(false)}
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
}
