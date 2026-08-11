/**
 * Composition des messages sortants.
 *
 * Séparé de l'envoi : la mise en forme d'un message se teste sans serveur SMTP,
 * et c'est là que se logent les erreurs qui font finir un message en
 * indésirable — un expéditeur mal formé, un sujet vide, un lien relatif.
 */

export interface Sender {
  name: string;
  address: string;
  replyTo?: string | null;
}

export interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Adresse d'expéditeur au format RFC 5322.
 *
 * Le nom est mis entre guillemets dès qu'il contient un caractère spécial :
 * « Frouard Distribution, RH » sans guillemets casse l'en-tête à la virgule et
 * le message part avec un second destinataire fantôme.
 */
export function formatSender(sender: Sender): string {
  const escaped = sender.name.replace(/["\\]/g, '\\$&');
  return /[",;:<>@[\]\\]/.test(sender.name)
    ? `"${escaped}" <${sender.address}>`
    : `${sender.name} <${sender.address}>`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmailAddress(value: string): boolean {
  return EMAIL.test(value.trim());
}

/** Échappe le texte destiné au corps HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface Layout {
  title: string;
  intro: string;
  /** Paragraphes du corps. */
  body: string[];
  action?: { label: string; url: string };
  footer: string;
}

/**
 * Gabarit unique, en HTML et en texte.
 *
 * Les deux versions sont produites **du même contenu** : un message dont la
 * version texte diffère du HTML est un message qu'on n'a pas relu, et beaucoup
 * de filtres anti-spam le remarquent avant le destinataire.
 *
 * Aucune image, aucune ressource distante — la charte de télémétrie de
 * PLAN.md §3.7 s'applique aussi au courrier : un pixel de suivi dans un
 * message RH est une collecte que personne n'a acceptée.
 */
export function render(layout: Layout): { text: string; html: string } {
  const text = [
    layout.title,
    '',
    layout.intro,
    '',
    ...layout.body,
    layout.action ? `\n${layout.action.label} : ${layout.action.url}` : '',
    '',
    '—',
    layout.footer,
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .trim();

  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#f6f5f3;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1b19">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e2dd;border-radius:12px;padding:24px">
    <h1 style="margin:0 0 12px;font-size:18px;font-weight:600">${escapeHtml(layout.title)}</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5">${escapeHtml(layout.intro)}</p>
    ${layout.body
      .map(
        (paragraph) =>
          `<p style="margin:0 0 12px;font-size:14px;line-height:1.5">${escapeHtml(paragraph)}</p>`,
      )
      .join('\n    ')}
    ${
      layout.action
        ? `<p style="margin:20px 0"><a href="${escapeHtml(layout.action.url)}" style="display:inline-block;background:#3f6f5f;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">${escapeHtml(layout.action.label)}</a></p>
    <p style="margin:0 0 12px;font-size:12px;color:#6b6862;word-break:break-all">${escapeHtml(layout.action.url)}</p>`
        : ''
    }
    <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #e5e2dd;font-size:12px;color:#6b6862">${escapeHtml(layout.footer)}</p>
  </div>
</body>
</html>`;

  return { text, html };
}

export interface InvitationInput {
  firstName: string;
  accountName: string;
  url: string;
  expiresAt: Date;
}

export function invitationMessage(
  to: string,
  input: InvitationInput,
): Omit<Message, 'to'> & { to: string } {
  const expiry = input.expiresAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const { text, html } = render({
    title: `Votre accès à PlanFlow — ${input.accountName}`,
    intro: `Bonjour ${input.firstName},`,
    body: [
      `${input.accountName} vous a ouvert un accès à PlanFlow pour consulter vos plannings, poser vos congés et suivre vos compteurs.`,
      `Ce lien est personnel et expire le ${expiry}.`,
    ],
    action: { label: 'Définir mon mot de passe', url: input.url },
    footer:
      'Si vous n’attendiez pas ce message, ignorez-le : sans action de votre part, aucun compte n’est activé.',
  });

  return {
    to,
    subject: `Votre accès à PlanFlow — ${input.accountName}`,
    text,
    html,
  };
}

export function testMessage(to: string, accountName: string): Message {
  const { text, html } = render({
    title: 'Test d’envoi PlanFlow',
    intro: 'Ce message confirme que l’envoi de courrier fonctionne.',
    body: [
      `Il a été émis depuis la configuration de ${accountName}.`,
      'Si vous le recevez dans les indésirables, vérifiez que l’adresse d’expéditeur appartient bien à un domaine que votre serveur est autorisé à signer (SPF, DKIM).',
    ],
    footer: 'Message de test — aucune action attendue.',
  });

  return { to, subject: 'Test d’envoi PlanFlow', text, html };
}

export interface ShiftAssignedInput {
  firstName: string;
  /** Jour rédigé, « lundi 10 août ». */
  day: string;
  start: string;
  end: string;
  teamName: string;
}

/**
 * Avis d'affectation d'un créneau.
 *
 * Le message dit le jour, l'horaire et l'équipe, et rien de plus : ni le motif,
 * ni le reste du planning. Un avis qui recopierait la semaine entière ferait
 * sortir de l'application des données que le destinataire n'a pas demandées, et
 * qu'un courriel transfère sans contrôle.
 */
export function shiftAssignedMessage(
  to: string,
  input: ShiftAssignedInput,
): Message {
  const subject = `Nouveau créneau le ${input.day}`;
  const { text, html } = render({
    title: subject,
    intro: `Bonjour ${input.firstName},`,
    body: [
      `Un créneau vous a été ajouté le ${input.day}, de ${input.start} à ${input.end}.`,
      `Équipe : ${input.teamName}.`,
      'Votre planning à jour reste consultable dans PlanFlow.',
    ],
    footer:
      'Avis automatique — en cas d’erreur, adressez-vous à votre responsable.',
  });

  return { to, subject, text, html };
}

/**
 * Message d'erreur d'envoi, débarrassé de tout secret.
 *
 * Une erreur SMTP contient volontiers l'identifiant, parfois la commande
 * complète. L'afficher à l'écran ou l'écrire au journal exposerait le mot de
 * passe du serveur d'envoi.
 */
export function redactSmtpError(error: unknown, username?: string | null): string {
  let message = error instanceof Error ? error.message : String(error);

  // Les serveurs renvoient souvent la commande AUTH en clair dans l'erreur.
  message = message.replace(/AUTH\s+\S+\s+\S+/gi, 'AUTH [masqué]');
  message = message.replace(/(pass(word)?|pwd)\s*[:=]\s*\S+/gi, '$1 [masqué]');
  if (username) {
    message = message.split(username).join('[identifiant]');
  }

  return message.slice(0, 500);
}
