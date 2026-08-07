import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { THEME_INIT_SCRIPT } from '@/components/shell/ThemeToggle';

import './globals.css';

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
    <html lang="fr" data-theme="light" suppressHydrationWarning>
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
