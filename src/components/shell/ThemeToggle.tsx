'use client';

import { useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/Button';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'planflow.theme';

/**
 * Script appliqué avant le premier rendu.
 *
 * Sans lui, la page s'affiche en clair puis bascule — un flash blanc en pleine
 * figure pour qui travaille en sombre. Il est injecté avec le nonce de la
 * requête, seule façon d'exécuter de l'inline sous notre CSP (src/proxy.ts).
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`.trim();

/**
 * L'attribut `data-theme` du document est la source de vérité : il est posé par
 * le script ci-dessus avant l'hydratation, donc avant que React n'existe.
 * On s'y abonne plutôt que d'en tenir une copie, qui serait fausse au premier
 * rendu et devrait être rattrapée après coup.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
}

/** Le serveur rend toujours le thème clair, que le script corrige aussitôt. */
function getServerSnapshot(): Theme {
  return 'light';
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Stockage indisponible (navigation privée) : le thème reste valable
      // pour la session, ce qui vaut mieux qu'une erreur.
    }
  }

  return (
    <Button
      size="sm"
      className="rounded-full"
      onClick={toggle}
      aria-pressed={theme === 'dark'}
    >
      Thème {theme === 'dark' ? 'sombre' : 'clair'}
    </Button>
  );
}
