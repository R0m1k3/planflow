'use client';

import { useActionState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import {
  exportSilaeAction,
  type PayrollActionState,
} from '@/server/payroll/actions';

const empty: PayrollActionState = {};

/**
 * Génération et téléchargement du fichier Silae.
 *
 * Le contenu revient dans la réponse de l'action plutôt que par une URL : un
 * fichier de paie ne doit pas rester adressable après coup. Il porte les heures
 * de salariés identifiables, et une URL se partage, se met en cache et se
 * retrouve dans un historique de navigation.
 */
export function ExportButton({
  month,
  locationId,
  disabled,
}: {
  month: string;
  locationId: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    exportSilaeAction,
    empty,
  );
  const downloaded = useRef('');

  useEffect(() => {
    if (!state.csv || !state.filename) return;
    if (downloaded.current === state.checksum) return;
    downloaded.current = state.checksum ?? '';

    // Le CSV est produit en ASCII : `text/csv` sans jeu de caractères, comme
    // le fichier de référence.
    const blob = new Blob([state.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = state.filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [state.csv, state.filename, state.checksum]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="locationId" value={locationId} />

      {state.error ? (
        <span role="alert" className="max-w-xl text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      {state.checksum ? (
        <span className="text-micro text-ink-3">
          Empreinte {state.checksum.slice(0, 12)}…
        </span>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        disabled={pending || disabled}
        title={
          disabled
            ? 'Des correspondances de codes restent à confirmer.'
            : undefined
        }
      >
        Exporter vers Silae
      </Button>
    </form>
  );
}
