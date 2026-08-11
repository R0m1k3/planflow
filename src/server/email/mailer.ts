import 'server-only';

import nodemailer from 'nodemailer';

import {
  formatSender,
  redactSmtpError,
  type Message,
  type Sender,
} from '@/domain/email/message';
import { decryptOptional } from '@/server/crypto';
import type { ScopedClient } from '@/server/tenant';

/**
 * Envoi de courrier — configuration par compte.
 *
 * Les réglages vivent en base, pas dans l'environnement : chaque client
 * auto-hébergé a sa propre boîte, et en changer ne doit exiger ni accès au
 * serveur ni redémarrage.
 *
 * Le mot de passe est chiffré au repos et **n'est déchiffré qu'ici**, au moment
 * d'ouvrir la connexion. Il ne remonte jamais vers un écran, jamais vers un
 * journal, jamais vers un message d'erreur.
 */

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  password: string | null;
  sender: Sender;
}

export type EmailKind =
  | 'TEST'
  | 'INVITATION'
  | 'PASSWORD_RESET'
  | 'PLANNING_PUBLISHED'
  | 'SHIFT_ASSIGNED'
  | 'TIMEOFF_DECISION'
  | 'LEAVE_NOTICE';

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Charge la configuration du compte, mot de passe déchiffré. */
export async function loadSmtpConfig(
  db: ScopedClient,
): Promise<SmtpConfig | null> {
  const settings = await db.emailSettings.findFirst();
  if (!settings) return null;

  return {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    username: settings.username,
    password: decryptOptional(settings.passwordEnc),
    sender: {
      name: settings.fromName,
      address: settings.fromAddress,
      replyTo: settings.replyTo,
    },
  };
}

/**
 * Envoie un message et journalise le résultat.
 *
 * Le corps n'est **pas** conservé : il porte des données personnelles et se
 * régénère. Ce qui compte, quand un salarié dit n'avoir rien reçu, c'est de
 * savoir si le serveur a accepté le message et à quelle adresse.
 */
export async function sendEmail(
  db: ScopedClient,
  message: Message,
  kind: EmailKind,
  membershipId?: string | null,
): Promise<SendResult> {
  const config = await loadSmtpConfig(db);

  if (!config) {
    const error =
      'Aucun serveur d’envoi configuré. Réglages · Envoi de courrier.';
    await logEmail(db, message, kind, 'FAILED', { error, membershipId });
    return { ok: false, error };
  }

  try {
    const result = await transportFor(config).sendMail({
      from: formatSender(config.sender),
      ...(config.sender.replyTo ? { replyTo: config.sender.replyTo } : {}),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    await logEmail(db, message, kind, 'SENT', {
      messageId: result.messageId,
      membershipId,
    });
    return { ok: true, messageId: result.messageId };
  } catch (error) {
    const redacted = redactSmtpError(error, config.username);
    await logEmail(db, message, kind, 'FAILED', {
      error: redacted,
      membershipId,
    });
    return { ok: false, error: redacted };
  }
}

/**
 * Vérifie la configuration sans envoyer.
 *
 * `verify` ouvre la connexion et authentifie : c'est ce qui distingue une
 * adresse de serveur fautive d'un mot de passe faux, alors qu'un envoi raté ne
 * dit que « ça n'a pas marché ».
 */
export async function verifySmtp(config: SmtpConfig): Promise<SendResult> {
  try {
    await transportFor(config).verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: redactSmtpError(error, config.username) };
  }
}

function transportFor(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // 465 chiffre dès la connexion ; 587 négocie STARTTLS. Se tromper produit
    // une erreur illisible côté serveur.
    secure: config.secure,
    ...(config.username && config.password
      ? { auth: { user: config.username, pass: config.password } }
      : {}),
    // Ne jamais accepter un certificat invalide : un envoi RH transporte des
    // noms et des adresses.
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
}

async function logEmail(
  db: ScopedClient,
  message: Message,
  kind: EmailKind,
  status: 'SENT' | 'FAILED',
  extra: {
    error?: string;
    messageId?: string;
    membershipId?: string | null | undefined;
  },
): Promise<void> {
  await db.emailLog.create({
    data: {
      to: message.to,
      subject: message.subject,
      kind,
      status,
      error: extra.error ?? null,
      messageId: extra.messageId ?? null,
      membershipId: extra.membershipId ?? null,
    } as never,
  });
}
