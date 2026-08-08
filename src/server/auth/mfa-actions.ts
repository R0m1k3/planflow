'use server';

import { revalidatePath } from 'next/cache';

import { mfaRequired } from '@/domain/access/mfa-policy';
import { recordAudit } from '@/server/audit';
import { requireSession } from '@/server/context';
import { confirmEnrolment, disableMfa, enrolmentOffer } from '@/server/auth/mfa';
import { verifyPassword } from '@/server/auth/session';
import { withTenant } from '@/server/tenant';
import { unscoped } from '@/server/tenant';

/**
 * Enrôlement et retrait du second facteur.
 *
 * Aucune capacité n'est exigée : chacun gère **son** facteur. Nul ne peut en
 * poser un sur le compte d'autrui, ce qui reviendrait à en prendre le contrôle.
 */

export interface MfaState {
  error?: string;
  ok?: boolean;
  message?: string;
  /** Rendus une seule fois, à l'écran qui vient de les produire. */
  recoveryCodes?: string[];
}

export interface OfferState extends MfaState {
  secret?: string;
  uri?: string;
  qr?: string;
}

/**
 * Propose un secret.
 *
 * Il n'est **pas** enregistré à ce stade : il transite par le formulaire, et
 * n'entre en base qu'une fois qu'un code en a été tiré. Un secret enregistré
 * d'avance ferme le compte de qui abandonne l'enrôlement en cours de route.
 */
export async function startEnrolmentAction(): Promise<OfferState> {
  const session = await requireSession();
  const offer = enrolmentOffer(session.user.email, session.accountName);

  // Import différé : le générateur de QR n'a rien à faire dans le lot commun
  // des pages qui n'affichent jamais de code.
  const { toString: renderQr } = await import('qrcode');
  const qr = await renderQr(offer.uri, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
  });

  return { ok: true, secret: offer.secret, uri: offer.uri, qr };
}

export async function confirmEnrolmentAction(
  _previous: MfaState,
  formData: FormData,
): Promise<MfaState> {
  const session = await requireSession();
  const userId = session.actor.userId;
  const secret = String(formData.get('secret') ?? '');
  const code = String(formData.get('code') ?? '');

  if (!secret) return { error: 'Recommencez l’activation.' };
  // Un membership sans compte utilisateur n'a pas de session : le cas ne peut
  // pas se produire ici, mais le type le permet et l'ignorer masquerait un
  // câblage fautif.
  if (!userId) return { error: 'Compte introuvable.' };

  const result = await confirmEnrolment(userId, secret, code);
  if (!result.ok) return { error: result.error ?? 'Code refusé.' };

  await withTenant(session.actor.accountId, (db) =>
    recordAudit(db, {
      actorMembershipId: session.actor.membershipId,
      action: 'security.mfa.enable',
      entityType: 'User',
      entityId: userId,
      after: { enrolled: true },
    }),
  );

  // Pas de `revalidatePath` ici, délibérément : réactualiser la route
  // remplacerait l'écran par celui d'un compte déjà enrôlé, et emporterait les
  // codes de secours avant que leur destinataire ait pu les noter. Ils ne sont
  // affichés qu'une fois — les perdre à l'instant même où ils sont produits est
  // précisément ce qui rend un second facteur dangereux.
  return {
    ok: true,
    message: 'Second facteur activé.',
    ...(result.recoveryCodes ? { recoveryCodes: result.recoveryCodes } : {}),
  };
}

/**
 * Retire le second facteur.
 *
 * Le mot de passe est redemandé : sans cela, un poste laissé ouvert suffirait à
 * désarmer la protection que le facteur est censé apporter à ce poste précis.
 */
export async function disableMfaAction(
  _previous: MfaState,
  formData: FormData,
): Promise<MfaState> {
  const session = await requireSession();
  const userId = session.actor.userId;
  const password = String(formData.get('password') ?? '');
  if (!userId) return { error: 'Compte introuvable.' };

  // L'écran masque déjà le bouton, mais un bouton masqué n'est pas un contrôle :
  // l'obligation se tient là où l'effet se produit.
  if (mfaRequired(session.actor.permissions)) {
    return {
      error:
        'Votre rôle exige un second facteur : il ne peut pas être retiré. Faites d’abord modifier votre rôle.',
    };
  }

  const user = await unscoped().user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
    return { error: 'Mot de passe incorrect.' };
  }

  await disableMfa(userId);

  await withTenant(session.actor.accountId, (db) =>
    recordAudit(db, {
      actorMembershipId: session.actor.membershipId,
      action: 'security.mfa.disable',
      entityType: 'User',
      entityId: userId,
      before: { enrolled: true },
      after: { enrolled: false },
    }),
  );

  revalidatePath('/reglages/securite');
  return { ok: true, message: 'Second facteur désactivé.' };
}
