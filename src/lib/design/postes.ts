/**
 * Palette catégorielle des postes.
 *
 * Douze teintes dérivées d'une formule commune (voir globals.css) : clarté et
 * chroma partagés, seule la teinte varie, plus un palier alterné qui écarte les
 * voisines. C'est ce qui les garde distinguables en vision daltonienne.
 *
 * Règle non négociable : **la couleur ne porte jamais l'information seule**.
 * Tout bloc coloré affiche aussi le code du poste. Un planning se lit aussi en
 * noir et blanc, à l'impression, et par quelqu'un qui confond le rouge et le
 * vert — trois cas où une pastille de couleur seule ne dit plus rien.
 */

export const POSTE_CODES = [
  'cai',
  'vte',
  'res',
  'acc',
  'cab',
  'rss',
  'inv',
  'liv',
  'enc',
  'clc',
  'net',
  'for',
] as const;

export type PosteCode = (typeof POSTE_CODES)[number];

export const POSTE_LABELS: Record<PosteCode, string> = {
  cai: 'Caisse',
  vte: 'Vente conseil',
  res: 'Réserve',
  acc: 'Accueil',
  cab: 'Cabines',
  rss: 'Réassort',
  inv: 'Inventaire',
  liv: 'Livraison',
  enc: 'Encadrement',
  clc: 'Retrait web',
  net: 'Entretien',
  for: 'Formation',
};

/** Teinte oklch de chaque poste, pour la documentation et les tests. */
export const POSTE_HUES: Record<PosteCode, number> = {
  cai: 250,
  vte: 162,
  res: 30,
  acc: 205,
  cab: 100,
  rss: 308,
  inv: 138,
  liv: 52,
  enc: 276,
  clc: 340,
  net: 185,
  for: 68,
};

export interface PosteTokens {
  /** Aplat de fond. */
  bg: string;
  /** Encre lisible sur cet aplat. */
  fg: string;
  /** Liseré, conservé même quand le fond est vide (créneau non assigné). */
  edge: string;
}

/**
 * Jetons CSS d'un poste. Renvoie des `var(...)` plutôt que des couleurs
 * calculées : le thème sombre redéfinit les variables, donc la même expression
 * suit le thème sans que le composant ait à le savoir.
 */
export function posteTokens(code: PosteCode): PosteTokens {
  return {
    bg: `var(--post-${code}-bg)`,
    fg: `var(--post-${code}-fg)`,
    edge: `var(--post-${code}-edge)`,
  };
}

export function posteLabel(code: PosteCode): string {
  return POSTE_LABELS[code];
}

/** Code affiché dans le bloc — le second canal, en plus de la couleur. */
export function posteShort(code: PosteCode): string {
  return code.toUpperCase();
}

export function isPosteCode(value: string): value is PosteCode {
  return (POSTE_CODES as readonly string[]).includes(value);
}
