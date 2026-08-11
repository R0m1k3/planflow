import Link from 'next/link';

import { AccountIdentityForm } from '@/components/settings/AccountIdentityForm';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Card, CardHeader, EmptyState } from '@/components/ui/Card';
import { getAccountIdentity } from '@/server/settings/account';

export const metadata = { title: 'Informations du compte · PlanFlow' };
export const dynamic = 'force-dynamic';

export default async function ComptePage() {
  const account = await getAccountIdentity();

  return (
    <PageBody>
      <PageHeader
        title="Informations du compte"
        subtitle="Identité de l’entreprise et siège social"
      />

      {account === null ? (
        <Card>
          <EmptyState title="Compte introuvable" />
        </Card>
      ) : (
        <Card>
          <CardHeader title={account.name} />
          <AccountIdentityForm account={account} />
        </Card>
      )}

      <p className="max-w-[70ch] text-xs leading-[var(--lh-prose)] text-ink-3">
        Le siège n’est pas un établissement : il porte l’identité juridique, là
        où{' '}
        <Link href="/reglages/etablissements" className="underline">
          les établissements
        </Link>{' '}
        portent le SIRET, le fuseau effectif et les plannings. Une entreprise
        dont le siège n’ouvre aucun magasin garde donc une adresse ici et aucune
        équipe.
      </p>
    </PageBody>
  );
}
