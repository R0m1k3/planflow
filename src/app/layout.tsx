import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { headers } from 'next/headers';

import { THEME_INIT_SCRIPT } from '@/components/shell/ThemeToggle';

import './globals.css';

/**
 * IBM Plex Sans, et Plex Mono pour les codes.
 *
 * Le choix vient de ce que l'écran affiche vraiment : des **identifiants**.
 * `AB-300`, `HS-HS25`, un matricule `E0004`, un code de poste, un SIRET, un
 * département `2A`. Plex a été dessiné pour la documentation technique — le
 * 1 porte un empattement, le l est courbé, le 0 se distingue du O — et ces
 * trois détails décident si un gestionnaire de paie recopie le bon code.
 *
 * Ses formes légèrement carrées tiennent aussi dans une cellule de tableau
 * dense, là où une grotesque géométrique se referme et où deux lignes de
 * chiffres cessent de s'aligner à l'œil.
 *
 * `next/font` télécharge les fichiers **à la compilation** et les sert depuis
 * l'application : la directive `font-src 'self'` reste satisfaite, et aucune
 * requête ne part vers un tiers à l'exécution — ce que la charte de télémétrie
 * interdit de toute façon.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
  // Métriques ajustées sur la fonte de repli : sans cela, la bascule au
  // chargement décale toute la grille d'un demi-caractère.
  adjustFontFallback: true,
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PlanFlow',
  description: 'Gestion du personnel, des plannings et des temps.',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Le nonce est posé par requête dans src/proxy.ts. C'est la seule façon
  // d'exécuter un script inline sous notre CSP, qui n'autorise pas
  // 'unsafe-inline'.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html
      lang="fr"
      data-theme="light"
      className={`${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
