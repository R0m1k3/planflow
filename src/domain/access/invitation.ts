/**
 * Invitations — entrée dans l'application.
 *
 * Le lien d'invitation est le seul chemin par lequel un salarié obtient un
 * accès. Il vaut donc autant qu'un mot de passe le temps de sa validité, ce qui
 * commande trois règles : une durée courte, un usage unique, et une révocation
 * possible sans attendre l'expiration.
 */

/**
 * Sept jours. Assez pour couvrir une semaine de congés du destinataire, trop
 * peu pour qu'un lien oublié dans une boîte reste exploitable des mois.
 */
export const INVITATION_TTL_DAYS = 7;

export type InvitationState = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface InvitationTimestamps {
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

/**
 * État d'une invitation.
 *
 * L'ordre des tests compte : une invitation acceptée reste acceptée une fois
 * sa date d'expiration passée — dire « expirée » d'un accès qui a servi
 * induirait en erreur celui qui relit le dossier.
 */
export function invitationState(
  invitation: InvitationTimestamps,
  now: Date,
): InvitationState {
  if (invitation.acceptedAt) return 'ACCEPTED';
  if (invitation.revokedAt) return 'REVOKED';
  if (invitation.expiresAt <= now) return 'EXPIRED';
  return 'PENDING';
}

export function expiryFrom(now: Date): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Longueur minimale d'un mot de passe.
 *
 * Douze caractères sans règle de composition : les exigences de casse et de
 * caractères spéciaux produisent des mots de passe plus courts et plus
 * prévisibles, sans gain mesurable. C'est un choix produit, pas une obligation
 * réglementaire.
 */
export const MIN_PASSWORD_LENGTH = 12;

export interface PersonalContext {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

/**
 * Motif de refus d'un mot de passe, ou `null` s'il convient.
 *
 * Le refus est **motivé** : « mot de passe invalide » sans explication conduit
 * l'utilisateur à essayer des variantes tout aussi faibles.
 */
export function passwordProblem(
  password: string,
  personal: PersonalContext = {},
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  // Une limite haute évite qu'une saisie de plusieurs mégaoctets fasse tourner
  // argon2 indéfiniment ; elle ne bride aucun usage réel.
  if (password.length > 200) {
    return 'Le mot de passe ne peut pas dépasser 200 caractères.';
  }

  const needle = fold(password);
  const forbidden = [
    personal.firstName,
    personal.lastName,
    personal.email?.split('@')[0],
  ]
    .filter((value): value is string => Boolean(value) && value!.length >= 3)
    .map(fold);

  if (forbidden.some((value) => needle.includes(value))) {
    return 'Le mot de passe ne doit pas contenir votre nom ni votre adresse : ce sont les premières combinaisons essayées.';
  }

  if (/^(.)\1*$/.test(password)) {
    return 'Le mot de passe ne peut pas être une répétition du même caractère.';
  }

  return null;
}

/**
 * Composition du jeton de lien.
 *
 * Le compte est porté **par le lien**, préfixé au secret. La table des
 * invitations est protégée par RLS, laquelle exige de connaître le compte avant
 * de lire quoi que ce soit : sans ce préfixe, il faudrait ou bien ouvrir la
 * politique aux requêtes sans compte — c'est-à-dire la vider de son sens — ou
 * bien passer par une fonction privilégiée. Divulguer l'identifiant de compte
 * ne coûte rien : c'est un identifiant opaque, et le destinataire du lien en
 * est membre.
 */
export function composeInvitationToken(accountId: string, secret: string): string {
  return `${accountId}.${secret}`;
}

export function splitInvitationToken(
  value: string,
): { accountId: string; secret: string } | null {
  const separator = value.indexOf('.');
  if (separator <= 0 || separator === value.length - 1) return null;

  return {
    accountId: value.slice(0, separator),
    secret: value.slice(separator + 1),
  };
}

/**
 * Minuscules sans accents.
 *
 * Comparer « Rivière » à « riviere2026 » sans replier les accents laisserait
 * passer exactement la variante qu'un salarié écrira spontanément au clavier.
 */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export const INVITATION_STATE_LABELS: Record<InvitationState, string> = {
  PENDING: 'Invitation en attente',
  ACCEPTED: 'Invitation acceptée',
  REVOKED: 'Invitation révoquée',
  EXPIRED: 'Invitation expirée',
};
