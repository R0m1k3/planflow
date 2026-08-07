import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'PlanFlow',
  description: 'Gestion du personnel, des plannings et des temps.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
