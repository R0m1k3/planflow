'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { passwordProblem } from '@/domain/access/invitation';
import { isEmailAddress } from '@/domain/email/message';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
import {
  acceptInvitation,
  issueInvitation,
  resolveInvitation,
} from '@/server/invitations/service';

export interface InvitationState {
  error?: string;
  ok?: boolean;
  message?: string;
  /** Rendu une fois à l'émetteur, jamais rechargé ni journalisé. */
  url?: string;
}

const inviteInput = z.object({
  membershipId: z.string().trim().min(1),
  email: z.string().trim().min(1, 'Adresse électronique requise').max(255),
});

/**
 * Invite un salarié à se connecter.
 *
 * Sous `members.invite` et non `members.edit` : ouvrir un accès à l'application
 * n'est pas modifier un dossier. Un client peut vouloir qu'un responsable
 * corrige une fiche sans pouvoir distribuer des accès.
 */
export async function inviteMemberAction(
  _previous: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const parsed = inviteInput.safeParse({
    membershipId: formData.get('membershipId'),
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }
  if (!isEmailAddress(parsed.data.email)) {
    return { error: 'Cette adresse électronique n’est pas valide.' };
  }

  let outcome: InvitationState;

  try {
    outcome = await mutate('members.invite', async (db, actor) => {
      const result = await issueInvitation(db, actor.accountId, {
        membershipId: parsed.data.membershipId,
        email: parsed.data.email,
        createdBy: actor.membershipId,
      });

      if (!result.ok) {
        return { error: result.error ?? 'Invitation impossible.' };
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'membership.invite',
        entityType: 'Membership',
        entityId: parsed.data.membershipId,
        // L'adresse est la donnée utile en relecture ; le jeton, jamais.
        after: { email: parsed.data.email, delivered: result.delivered },
      });

      // Créée mais non délivrée : le succès est réel côté base, l'échec l'est
      // aussi côté salarié. L'écran doit dire les deux plutôt que d'en choisir
      // un — annoncer « envoyée » ferait attendre un message qui n'arrivera pas.
      const link = result.url ? { url: result.url } : {};

      return result.delivered
        ? {
            ok: true,
            message: `Invitation envoyée à ${parsed.data.email}.`,
            ...link,
          }
        : { ok: true, error: result.error ?? 'Invitation non envoyée.', ...link };
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit d'inviter un salarié.");
  }

  revalidatePath(`/equipe/${parsed.data.membershipId}`);
  revalidatePath('/equipe');
  return outcome;
}

export async function revokeInvitationAction(
  _previous: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const membershipId = String(formData.get('membershipId') ?? '');
  if (!membershipId) return { error: 'Salarié introuvable.' };

  try {
    await mutate('members.invite', async (db, actor) => {
      const revoked = await db.invitation.updateMany({
        where: { membershipId, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date(), revokedBy: actor.membershipId },
      });

      if (revoked.count === 0) return;

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'membership.invite.revoke',
        entityType: 'Membership',
        entityId: membershipId,
        after: { revoked: revoked.count },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de révoquer une invitation.");
  }

  revalidatePath(`/equipe/${membershipId}`);
  return { ok: true, message: 'Invitation révoquée. Le lien ne fonctionne plus.' };
}

/**
 * Acceptation, côté destinataire — **sans session**.
 *
 * Aucun `mutate` ici : il n'y a pas encore d'acteur. Le droit vient du lien
 * lui-même, et c'est pourquoi sa durée est courte et son usage unique.
 */
export async function acceptInvitationAction(
  _previous: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');

  const target = await resolveInvitation(token);
  if (!target) return { error: 'Lien d’invitation invalide.' };

  if (!target.hasUser) {
    const problem = passwordProblem(password, {
      firstName: target.firstName,
      lastName: target.lastName,
      email: target.email,
    });
    if (problem) return { error: problem };
    if (password !== confirmation) {
      return { error: 'Les deux mots de passe ne correspondent pas.' };
    }
  }

  const result = await acceptInvitation(
    token,
    target.hasUser ? null : password,
  );

  if (!result.ok) return { error: result.error };

  // Pas de connexion automatique : le salarié vient de choisir un mot de passe,
  // s'en servir tout de suite le fixe en mémoire. Et si son compte existait
  // déjà, l'ouvrir sans mot de passe transformerait le lien en dérobade
  // d'authentification.
  return {
    ok: true,
    message: 'Votre accès est actif. Connectez-vous avec votre adresse.',
  };
}

function toState(error: unknown, denied: string): InvitationState {
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
