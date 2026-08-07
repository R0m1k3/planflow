import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  isPosteCode,
  POSTE_CODES,
  POSTE_HUES,
  POSTE_LABELS,
  posteShort,
  posteTokens,
} from '@/lib/design/postes';

const CSS = readFileSync(
  fileURLToPath(new URL('../../src/app/globals.css', import.meta.url)),
  'utf8',
);

describe('palette des postes', () => {
  it('déclare douze postes distincts', () => {
    expect(POSTE_CODES).toHaveLength(12);
    expect(new Set(POSTE_CODES).size).toBe(12);
  });

  it('donne un libellé à chaque poste', () => {
    for (const code of POSTE_CODES) {
      expect(POSTE_LABELS[code], `libellé manquant pour ${code}`).toBeTruthy();
    }
  });

  it('sépare suffisamment les teintes voisines', () => {
    // Deux postes séparés de quelques degrés seraient indiscernables à petite
    // taille, ce qui rendrait la grille fausse à la lecture.
    const hues = [...Object.values(POSTE_HUES)].sort((a, b) => a - b);
    for (let i = 1; i < hues.length; i += 1) {
      const gap = (hues[i] as number) - (hues[i - 1] as number);
      expect(gap, `teintes trop proches : ${hues[i - 1]} et ${hues[i]}`).toBeGreaterThanOrEqual(12);
    }
  });

  it('définit les trois jetons CSS de chaque poste', () => {
    for (const code of POSTE_CODES) {
      for (const suffix of ['bg', 'fg', 'edge']) {
        expect(
          CSS.includes(`--post-${code}-${suffix}:`),
          `jeton --post-${code}-${suffix} absent de globals.css`,
        ).toBe(true);
      }
    }
  });

  it('renvoie des variables CSS, pour que le thème sombre suive', () => {
    const tokens = posteTokens('cai');
    expect(tokens.bg).toBe('var(--post-cai-bg)');
    expect(tokens.fg).toBe('var(--post-cai-fg)');
    expect(tokens.edge).toBe('var(--post-cai-edge)');
  });

  it('fournit un code court affichable — le second canal de lecture', () => {
    // La couleur ne porte jamais l'information seule : un planning se lit aussi
    // en niveaux de gris et par quelqu'un qui confond le rouge et le vert.
    expect(posteShort('vte')).toBe('VTE');
    for (const code of POSTE_CODES) {
      expect(posteShort(code)).toHaveLength(3);
    }
  });

  it('reconnaît les codes valides', () => {
    expect(isPosteCode('cai')).toBe(true);
    expect(isPosteCode('zzz')).toBe(false);
  });
});

describe('jetons de thème', () => {
  it('redéfinit les couleurs pour le thème sombre', () => {
    expect(CSS).toContain(":root[data-theme='dark']");
    for (const token of ['--color-canvas', '--color-ink-1', '--color-accent']) {
      const occurrences = CSS.split(token).length - 1;
      expect(
        occurrences,
        `${token} doit être défini en clair et redéfini en sombre`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('inverse le sens du palier de clarté en sombre', () => {
    // Sans cette inversion, le palier qui écarte les teintes voisines pousse du
    // mauvais côté et les rapproche au lieu de les séparer.
    expect(CSS).toContain('--tier-dir: -1');
    expect(CSS).toContain('--tier-dir: 1');
  });
});
