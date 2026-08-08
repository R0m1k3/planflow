'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { isEmailAddress, testMessage } from '@/domain/email/message';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
import { encryptOptional } from '@/server/crypto';
import { loadSmtpConfig, sendEmail, verifySmtp } from '@/server/email/mailer';

/**
 * Configuration du serveur d'envoi.
 *
 * Le mot de passe est traité comme un secret, au même titre que le NIR et
 * l'IBAN : chiffré au repos, jamais renvoyé à l'écran, jamais recopié dans un
 * message d'erreur. Un accès SMTP volé permet d'écrire au nom de l'entreprise.
 */

export interface EmailActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

class ValidationError extends Error {}

const settingsInput = z.object({
  host: z.string().trim().min(1, 'Serveur requis').max(255),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().max(255).optional(),
  /** Vide = on conserve le mot de passe déjà enregistré. */
  password: z.string().max(255).optional(),
  fromName: z.string().trim().min(1, 'Nom d’expéditeur requis').max(120),
  fromAddress: z.string().trim().min(1, 'Adresse d’expéditeur requise').max(255),
  replyTo: z.string().trim().max(255).optional(),
});

export async function saveEmailSettingsAction(
  _previous: EmailActionState,
  formData: FormData,
): Promise<EmailActionState> {
  const parsed = settingsInput.safeParse({
    host: formData.get('host'),
    port: formData.get('port') ?? 587,
    secure: formData.get('secure') === 'on',
    username: formData.get('username') || undefined,
    password: formData.get('password') || undefined,
    fromName: formData.get('fromName'),
    fromAddress: formData.get('fromAddress'),
    replyTo: formData.get('replyTo') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  if (!isEmailAddress(parsed.data.fromAddress)) {
    return { error: 'L’adresse d’expéditeur n’est pas une adresse valide.' };
  }
  if (parsed.data.replyTo && !isEmailAddress(parsed.data.replyTo)) {
    return { error: 'L’adresse de réponse n’est pas une adresse valide.' };
  }

  try {
    await mutate('settings.notifications.manage', async (db, actor) => {
      const existing = await db.emailSettings.findFirst();

      // Un mot de passe laissé vide **conserve** l'ancien : le formulaire ne
      // peut pas le pré-remplir puisqu'il ne le reçoit jamais, et le vider à
      // chaque enregistrement casserait l'envoi au premier changement de port.
      const passwordEnc = parsed.data.password
        ? encryptOptional(parsed.data.password)
        : (existing?.passwordEnc ?? null);

      const data = {
        host: parsed.data.host,
        port: parsed.data.port,
        secure: parsed.data.secure,
        username: parsed.data.username ?? null,
        passwordEnc,
        fromName: parsed.data.fromName,
        fromAddress: parsed.data.fromAddress,
        replyTo: parsed.data.replyTo ?? null,
        // Toute modification invalide la vérification : un réglage changé n'est
        // plus le réglage éprouvé.
        verifiedAt: null,
        lastError: null,
      };

      if (existing) {
        await db.emailSettings.update({
          where: { id: existing.id },
          data: data as never,
        });
      } else {
        await db.emailSettings.create({ data: data as never });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'settings.email.update',
        entityType: 'EmailSettings',
        entityId: existing?.id ?? 'nouveau',
        before: existing
          ? { host: existing.host, port: existing.port, from: existing.fromAddress }
          : null,
        // Le mot de passe n'apparaît pas, même chiffré : un journal d'audit se
        // lit plus largement qu'une table de réglages.
        after: {
          host: parsed.data.host,
          port: parsed.data.port,
          from: parsed.data.fromAddress,
          passwordChanged: Boolean(parsed.data.password),
        },
      });
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit de modifier ces réglages.");
  }

  revalidatePath('/reglages/email');
  return { ok: true, message: 'Réglages enregistrés. Faites un envoi de test.' };
}

/**
 * Envoi de test.
 *
 * Deux étapes distinctes : `verify` ouvre la connexion et authentifie, ce qui
 * sépare une adresse de serveur fautive d'un mot de passe faux ; puis l'envoi
 * réel, qui seul prouve que le message sort.
 */
export async function sendTestEmailAction(
  _previous: EmailActionState,
  formData: FormData,
): Promise<EmailActionState> {
  const to = String(formData.get('to') ?? '').trim();
  if (!isEmailAddress(to)) {
    return { error: 'Indiquez une adresse de destination valide.' };
  }

  let outcome: EmailActionState = { ok: true };

  try {
    await mutate('settings.notifications.manage', async (db, actor) => {
      const config = await loadSmtpConfig(db);
      if (!config) {
        throw new ValidationError(
          'Enregistrez d’abord les réglages du serveur d’envoi.',
        );
      }

      const account = await db.account.findFirst({ select: { name: true } });
      const checked = await verifySmtp(config);

      if (!checked.ok) {
        await db.emailSettings.updateMany({
          data: { verifiedAt: null, lastError: checked.error ?? 'Échec' },
        });
        outcome = {
          error: `Connexion au serveur impossible — ${checked.error ?? 'raison inconnue'}`,
        };
        return;
      }

      const result = await sendEmail(
        db,
        testMessage(to, account?.name ?? 'PlanFlow'),
        'TEST',
      );

      await db.emailSettings.updateMany({
        data: {
          verifiedAt: result.ok ? new Date() : null,
          lastError: result.ok ? null : (result.error ?? 'Échec'),
        },
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'settings.email.test',
        entityType: 'EmailSettings',
        entityId: 'test',
        after: { to, ok: result.ok },
      });

      outcome = result.ok
        ? { ok: true, message: `Message envoyé à ${to}.` }
        : { error: `Envoi refusé — ${result.error ?? 'raison inconnue'}` };
    });
  } catch (error) {
    return toState(error, "Vous n'avez pas le droit d'envoyer un test.");
  }

  revalidatePath('/reglages/email');
  return outcome;
}

function toState(error: unknown, denied: string): EmailActionState {
  if (error instanceof ValidationError) return { error: error.message };
  if (error instanceof AuthorizationError) return { error: denied };
  throw error;
}
