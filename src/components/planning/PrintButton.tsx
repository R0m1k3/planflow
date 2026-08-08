'use client';

import { Button } from '@/components/ui/Button';

/**
 * Impression du planning.
 *
 * Pas de génération PDF côté serveur : le navigateur sait déjà paginer, et sa
 * boîte d'impression permet d'enregistrer en PDF. Un moteur de rendu de plus
 * serait un second endroit où la grille peut diverger de ce qui est à l'écran.
 * La mise en page d'impression vit dans `globals.css`.
 */
export function PrintButton({ label = 'Imprimer' }: { label?: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
