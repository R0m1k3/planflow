import Link from 'next/link';

import { AcceptInvitationForm } from '@/app/invitation/[token]/AcceptInvitationForm';
import { INVITATION_STATE_LABELS } from '@/domain/access/invitation';
import { resolveInvitation } from '@/server/invitations/service';

export const metadata = { title: 'Invitation · PlanFlow' };
export const dynamic = 'force-dynamic';

/**
 * Acceptation d'une invitation — page publique.
 *
 * Hors du shell applicatif : le destinataire n'a pas encore de session, et
 * afficher une navigation qu'il ne peut pas suivre serait déroutant.
 */
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await resolveInvitation(decodeURIComponent(token));

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 p-6">
      <header>
        <p className="text-micro font-semibold tracking-[0.12em] text-ink-3 uppercase">
          PlanFlow
        </p>
        <h1 className="mt-1 text-xl font-semibold text-ink-1">
          {invitation?.state === 'PENDING'
            ? `Bienvenue${invitation.firstName ? `, ${invitation.firstName}` : ''}`
            : 'Invitation'}
        </h1>
      </header>

      {!invitation ? (
        <Refusal message="Ce lien d’invitation n’est pas valide. Il a peut-être été tronqué par votre logiciel de messagerie — copiez-le entièrement, ou demandez-en un nouveau." />
      ) : invitation.state !== 'PENDING' ? (
        <Refusal
          title={INVITATION_STATE_LABELS[invitation.state]}
          message={
            invitation.state === 'ACCEPTED'
              ? 'Votre accès existe déjà. Connectez-vous avec votre adresse électronique.'
              : 'Demandez à votre responsable de vous envoyer une nouvelle invitation.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-ink-2">
            <strong className="text-ink-1">{invitation.accountName}</strong> vous
            ouvre un accès à PlanFlow, où vous consulterez votre planning, vos
            compteurs et vos demandes d’absence.
          </p>
          <AcceptInvitationForm
            token={decodeURIComponent(token)}
            email={invitation.email}
            hasUser={invitation.hasUser}
          />
        </>
      )}

      <p className="text-micro text-ink-3">
        <Link href="/connexion" className="underline">
          Aller à la connexion
        </Link>
      </p>
    </main>
  );
}

function Refusal({ title, message }: { title?: string; message: string }) {
  return (
    <div
      role="alert"
      className="rounded-3 border border-warn bg-warn-soft p-4 text-sm text-warn-soft-ink"
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <p className={title ? 'mt-1' : undefined}>{message}</p>
    </div>
  );
}
