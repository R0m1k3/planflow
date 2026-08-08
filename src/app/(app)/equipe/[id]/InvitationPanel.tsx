'use client';

import { useActionState } from 'react';

import { Badge, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  INVITATION_STATE_LABELS,
  type InvitationState as State,
} from '@/domain/access/invitation';
import {
  inviteMemberAction,
  revokeInvitationAction,
  type InvitationState,
} from '@/server/invitations/actions';

const empty: InvitationState = {};

const TONES: Record<State, Tone> = {
  PENDING: 'info',
  ACCEPTED: 'ok',
  REVOKED: 'neutral',
  EXPIRED: 'warn',
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export interface InvitationView {
  state: State;
  email: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Accès applicatif d'un salarié.
 *
 * Le lien envoyé n'est **pas réaffiché** : seule son empreinte est conservée.
 * « Renvoyer » émet donc un nouveau lien et invalide le précédent — ce qui est
 * aussi la bonne réponse à « il a perdu le message ».
 */
export function InvitationPanel({
  membershipId,
  defaultEmail,
  hasAccount,
  invitation,
}: {
  membershipId: string;
  defaultEmail: string;
  hasAccount: boolean;
  invitation: InvitationView | null;
}) {
  const [inviteState, invite, inviting] = useActionState(
    inviteMemberAction,
    empty,
  );
  const [revokeState, revoke, revoking] = useActionState(
    revokeInvitationAction,
    empty,
  );

  const pending = invitation?.state === 'PENDING';

  return (
    <div className="flex flex-col gap-3 p-4">
      {invitation ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <Badge tone={TONES[invitation.state]}>
            {INVITATION_STATE_LABELS[invitation.state]}
          </Badge>
          <span className="text-ink-1">{invitation.email}</span>
          <span className="tnum text-micro text-ink-3">
            {invitation.state === 'PENDING'
              ? `valable jusqu’au ${dateFormat.format(invitation.expiresAt)}`
              : `envoyée le ${dateFormat.format(invitation.createdAt)}`}
          </span>
        </p>
      ) : null}

      {hasAccount ? (
        <p className="text-sm text-ink-2">
          Ce salarié a un accès actif. Réinviter n’est utile que pour rattacher
          une nouvelle adresse.
        </p>
      ) : (
        <p className="text-sm text-ink-2">
          Sans invitation, ce salarié reste planifiable et exportable, mais ne
          peut ni consulter son planning ni demander une absence.
        </p>
      )}

      <form action={invite} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="membershipId" value={membershipId} />
        <label className="flex flex-col gap-1">
          <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
            Adresse d’invitation
          </span>
          <input
            name="email"
            type="email"
            defaultValue={defaultEmail}
            required
            className="h-8 w-72 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
          />
        </label>
        <Button type="submit" variant="primary" disabled={inviting}>
          {pending ? 'Renvoyer l’invitation' : 'Inviter'}
        </Button>
      </form>

      {pending ? (
        <form action={revoke}>
          <input type="hidden" name="membershipId" value={membershipId} />
          <Button type="submit" disabled={revoking}>
            Révoquer l’invitation
          </Button>
        </form>
      ) : null}

      {inviteState.error ? (
        <p role="alert" className="text-xs text-danger">
          {inviteState.error}
        </p>
      ) : null}
      {inviteState.message ? (
        <p className="text-xs text-ok-soft-ink">{inviteState.message}</p>
      ) : null}

      {inviteState.url ? (
        <div className="rounded-3 border border-line-2 bg-surface-2 p-3">
          <p className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
            Lien d’invitation
          </p>
          {/* Affiché une seule fois. Recharger l'écran ne le remontrera pas :
              la base n'en garde que l'empreinte. */}
          <p
            data-testid="invitation-link"
            className="mt-1 break-all font-mono text-xs text-ink-1"
          >
            {inviteState.url}
          </p>
          <p className="mt-1 text-micro text-ink-3">
            Visible une seule fois. Utile si le message n’arrive pas, ou tant
            que le serveur d’envoi n’est pas configuré.
          </p>
        </div>
      ) : null}
      {revokeState.error ? (
        <p role="alert" className="text-xs text-danger">
          {revokeState.error}
        </p>
      ) : null}
      {revokeState.message ? (
        <p className="text-xs text-ok-soft-ink">{revokeState.message}</p>
      ) : null}
    </div>
  );
}
