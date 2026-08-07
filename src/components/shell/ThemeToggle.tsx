'use client';

import { useEffect, useState } from 'react';

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

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  // Le thème réel est posé par THEME_INIT_SCRIPT avant l'hydratation ; on le
  // lit après montage plutôt que de le deviner au rendu serveur, où
  // localStorage n'existe pas.
  useEffect(() => setTheme(readTheme()), []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Stockage indisponible (navigation privée) : le thème reste valable
      // pour la session, ce qui est préférable à une erreur.
    }
    setTheme(next);
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
