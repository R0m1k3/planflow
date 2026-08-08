'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import { MIN_PASSWORD_LENGTH } from '@/domain/access/invitation';
import {
  acceptInvitationAction,
  type InvitationState,
} from '@/server/invitations/actions';

const empty: InvitationState = {};

export function AcceptInvitationForm({
  token,
  email,
  hasUser,
}: {
  token: string;
  email: string;
  hasUser: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    acceptInvitationAction,
    empty,
  );

  if (state.ok) {
    return (
      <div className="rounded-3 border border-ok bg-ok-soft p-4 text-sm text-ok-soft-ink">
        <p>{state.message}</p>
        <p className="mt-3">
          <Link href="/connexion" className="font-medium underline">
            Se connecter
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-3 border border-line-1 bg-surface p-4"
    >
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1">
        <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
          Votre adresse
        </span>
        {/* Non modifiable : l'invitation vaut pour cette adresse, et pouvoir la
            changer ici reviendrait à ouvrir l'accès à qui bon semble. */}
        <p className="text-sm text-ink-1">{email}</p>
      </div>

      {hasUser ? (
        <p className="text-sm text-ink-2">
          Un compte existe déjà pour cette adresse. Il sera simplement rattaché à
          votre nouvel employeur : votre mot de passe actuel reste valable.
        </p>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
              Choisissez un mot de passe
            </span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              className="h-9 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
            />
            <span className="text-micro text-ink-3">
              {MIN_PASSWORD_LENGTH} caractères au minimum. Une phrase dont vous
              vous souvenez vaut mieux qu’un assemblage de symboles.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
              Confirmez
            </span>
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              className="h-9 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
            />
          </label>
        </>
      )}

      <Button type="submit" variant="primary" disabled={pending}>
        {hasUser ? 'Rattacher mon compte' : 'Activer mon accès'}
      </Button>

      {state.error ? (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
