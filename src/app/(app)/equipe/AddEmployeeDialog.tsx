'use client';

import { useEffect, useRef, useState } from 'react';

import { AddEmployeeForm } from '@/app/(app)/equipe/AddEmployeeForm';
import { Button } from '@/components/ui/Button';
import type {
  ContractLocation,
  HiringOptions,
} from '@/server/employees/queries';

/**
 * Embauche, en panneau latéral.
 *
 * Une trentaine de champs : posés au bas de la liste, ils occupaient plus de
 * place que l'effectif qu'on vient consulter. Le panneau glisse par la droite
 * et laisse l'annuaire visible — on embauche en regardant qui est déjà là.
 *
 * `<dialog>` natif plutôt qu'un panneau maison : le piège de focus, la
 * fermeture par Échap et le fond inerte viennent avec, et une `<div>` doit les
 * réimplémenter sans jamais les tenir tout à fait.
 */
export function AddEmployeeDialog({
  locations,
  options,
}: {
  locations: ContractLocation[];
  options: HiringOptions;
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
        aria-labelledby="titre-embauche"
        onClose={() => setOpen(false)}
        className="mt-0 mr-0 mb-0 ml-auto h-full max-h-none w-[min(30rem,100vw)] max-w-none border-l border-line-1 bg-surface p-0 text-ink-1 backdrop:bg-[rgb(0_0_0/0.4)]"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center gap-3 border-b border-line-1 px-5 py-4">
            <h2 id="titre-embauche" className="text-md font-semibold">
              Nouvel employé
            </h2>
            <span className="flex-1" />
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5">
            {open ? (
              // Monté à l'ouverture : un formulaire démonté entre deux usages
              // repart vide, sans traîner la saisie abandonnée la fois d'avant.
              <AddEmployeeForm
                locations={locations}
                options={options}
                onSaved={() => setOpen(false)}
              />
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}
