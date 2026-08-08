import 'server-only';

import {
  composeInvitationToken,
  expiryFrom,
  invitationState,
  splitInvitationToken,
  type InvitationState,
} from '@/domain/access/invitation';
import { invitationMessage } from '@/domain/email/message';
import { env } from '@/lib/env';
import { hashPassword } from '@/server/auth/session';
import { generateToken, hashToken } from '@/server/crypto';
import { sendEmail } from '@/server/email/mailer';
import type { ScopedClient } from '@/server/tenant';
import { withTenant } from '@/server/tenant';

/**
 * Cycle de vie d'une invitation.
 *
 * Le secret n'existe en clair qu'entre sa génération et son départ dans le
 * message : la base n'en garde que l'empreinte, comme pour un jeton de session.
 * Personne — pas même un administrateur — ne peut relire un lien envoyé, ce qui
 * est le comportement attendu et la raison pour laquelle « renvoyer » émet un
 * nouveau lien plutôt que de rejouer l'ancien.
 */

export interface IssueInput {
  membershipId: string;
  email: string;
  createdBy: string;
}

export interface IssueResult {
  ok: boolean;
  /** Motif d'échec destiné à l'écran. */
  error?: string;
  /** Vrai si le message est parti. Faux = invitation créée mais non délivrée. */
  delivered: boolean;
  /**
   * Le lien, rendu **une seule fois** à celui qui vient de l'émettre.
   *
   * Sans cela, un déploiement neuf ne peut inviter personne : configurer le
   * serveur d'envoi demande d'être connecté, et être connecté demande une
   * invitation. C'est aussi la réponse à « le message n'est pas arrivé ».
   * Il n'est ni conservé ni journalisé : rouvrir l'écran ne le remontre pas.
   */
  url?: string;
}

/**
 * Émet une invitation et l'envoie.
 *
 * Toute invitation encore en attente pour ce salarié est révoquée d'abord :
 * laisser deux liens vivants pour un même accès multiplie les portes sans
 * qu'aucune ne soit tracée comme celle qui a servi.
 */
export async function issueInvitation(
  db: ScopedClient,
  accountId: string,
  input: IssueInput,
): Promise<IssueResult> {
  const membership = await db.membership.findUnique({
    where: { id: input.membershipId },
    include: { profile: { select: { firstName: true } }, user: { select: { id: true } } },
  });

  if (!membership) {
    return { ok: false, error: 'Salarié introuvable.', delivered: false };
  }
  if (membership.archivedAt) {
    return {
      ok: false,
      error: 'Ce salarié est archivé : réactivez-le avant de lui ouvrir un accès.',
      delivered: false,
    };
  }

  const now = new Date();
  const email = input.email.toLowerCase().trim();

  await db.invitation.updateMany({
    where: { membershipId: membership.id, acceptedAt: null, revokedAt: null },
    data: { revokedAt: now, revokedBy: input.createdBy },
  });

  const secret = generateToken();
  await db.invitation.create({
    data: {
      membershipId: membership.id,
      tokenHash: hashToken(secret),
      email,
      expiresAt: expiryFrom(now),
      createdBy: input.createdBy,
    } as never,
  });

  await db.membership.update({
    where: { id: membership.id },
    data: { status: 'INVITED', invitedAt: now } as never,
  });

  const account = await db.account.findFirst({ select: { name: true } });
  const url = `${env.APP_URL}/invitation/${composeInvitationToken(accountId, secret)}`;

  const message = invitationMessage(email, {
    firstName: membership.profile?.firstName ?? '',
    accountName: account?.name ?? 'PlanFlow',
    url,
    expiresAt: expiryFrom(now),
  });

  const sent = await sendEmail(db, message, 'INVITATION');

  // L'invitation existe même si le message n'est pas parti : elle est valide, et
  // l'écran propose de renvoyer. Supprimer l'invitation sur échec d'envoi
  // masquerait le vrai problème, qui est la configuration du serveur.
  return sent.ok
    ? { ok: true, delivered: true, url }
    : {
        ok: true,
        delivered: false,
        url,
        error: `Invitation créée mais non envoyée — ${sent.error ?? 'raison inconnue'}. Transmettez le lien ci-dessous, ou vérifiez les réglages d’envoi de courrier.`,
      };
}

export interface InvitationTarget {
  accountId: string;
  invitationId: string;
  membershipId: string;
  state: InvitationState;
  email: string;
  firstName: string;
  lastName: string;
  accountName: string;
  /** Un compte existe déjà pour cette adresse : il n'y a pas de mot de passe à choisir. */
  hasUser: boolean;
}

/**
 * Résout un lien d'invitation, sans session.
 *
 * Le compte vient du lien lui-même — la politique RLS exige de le connaître
 * avant toute lecture. Un identifiant de compte inventé ne donne rien : la
 * requête s'exécute dans un périmètre où l'empreinte cherchée n'existe pas.
 */
export async function resolveInvitation(
  token: string,
): Promise<InvitationTarget | null> {
  const parts = splitInvitationToken(token);
  if (!parts) return null;

  try {
    return await withTenant(parts.accountId, async (db) => {
      const invitation = await db.invitation.findFirst({
        where: { tokenHash: hashToken(parts.secret) },
        include: {
          membership: {
            include: {
              profile: { select: { firstName: true, lastName: true } },
              user: { select: { id: true } },
            },
          },
        },
      });

      if (!invitation) return null;

      const account = await db.account.findFirst({ select: { name: true } });

      return {
        accountId: parts.accountId,
        invitationId: invitation.id,
        membershipId: invitation.membershipId,
        state: invitationState(invitation, new Date()),
        email: invitation.email,
        firstName: invitation.membership.profile?.firstName ?? '',
        lastName: invitation.membership.profile?.lastName ?? '',
        accountName: account?.name ?? 'PlanFlow',
        hasUser: invitation.membership.userId !== null,
      };
    });
  } catch {
    // Un identifiant de compte malformé fait échouer la transaction avant toute
    // lecture. Du point de vue de l'appelant c'est un lien invalide, pas une
    // panne : le dire autrement inviterait à sonder les erreurs.
    return null;
  }
}

export type AcceptResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * Accepte une invitation.
 *
 * Deux cas, et un seul demande un mot de passe :
 *
 * - **Aucun compte pour cette adresse** — on le crée avec le mot de passe
 *   choisi ici.
 * - **Un compte existe déjà** — on rattache simplement le salarié, sans
 *   toucher au mot de passe. Détenir le lien prouve l'accès à la boîte, ce qui
 *   suffit à rattacher un accès mais ne justifie pas de réinitialiser le mot de
 *   passe d'un compte existant.
 */
export async function acceptInvitation(
  token: string,
  password: string | null,
): Promise<AcceptResult> {
  const parts = splitInvitationToken(token);
  if (!parts) return { ok: false, error: 'Lien d’invitation invalide.' };

  const target = await resolveInvitation(token);
  if (!target) return { ok: false, error: 'Lien d’invitation invalide.' };
  if (target.state !== 'PENDING') {
    return { ok: false, error: REFUSAL[target.state] };
  }

  // L'empreinte est calculée hors transaction : argon2 tient plusieurs
  // centaines de millisecondes, et les tenir ouverte sur une transaction
  // immobiliserait une connexion du pool pour rien.
  const passwordHash = password ? await hashPassword(password) : null;

  return withTenant(parts.accountId, async (db) => {
    // Marquer d'abord, et sur la condition « pas encore acceptée » : deux
    // ouvertures simultanées du même lien ne doivent pas créer deux comptes.
    const claimed = await db.invitation.updateMany({
      where: { id: target.invitationId, acceptedAt: null, revokedAt: null },
      data: { acceptedAt: new Date() },
    });

    if (claimed.count === 0) {
      return { ok: false as const, error: REFUSAL.ACCEPTED };
    }

    const existing = await db.user.findUnique({
      where: { email: target.email },
      select: { id: true },
    });

    let userId = existing?.id ?? null;

    if (!userId) {
      if (!passwordHash) {
        throw new Error('Mot de passe requis pour créer un compte');
      }
      const created = await db.user.create({
        data: {
          email: target.email,
          passwordHash,
          firstName: target.firstName,
          lastName: target.lastName,
        },
      });
      userId = created.id;
    }

    await db.membership.update({
      where: { id: target.membershipId },
      data: { userId, status: 'ACTIVE' } as never,
    });

    return { ok: true as const, email: target.email };
  });
}

const REFUSAL: Record<InvitationState, string> = {
  PENDING: '',
  ACCEPTED:
    'Cette invitation a déjà été acceptée. Connectez-vous, ou demandez un nouveau lien.',
  REVOKED:
    'Cette invitation a été révoquée. Rapprochez-vous de votre responsable.',
  EXPIRED:
    'Cette invitation a expiré. Demandez à votre responsable de vous en envoyer une nouvelle.',
};
