'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  saveEmailSettingsAction,
  sendTestEmailAction,
  type EmailActionState,
} from '@/server/email/actions';

const empty: EmailActionState = {};

export interface EmailSettingsView {
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  hasPassword: boolean;
  fromName: string;
  fromAddress: string;
  replyTo: string | null;
  verifiedAt: Date | null;
  lastError: string | null;
}

/**
 * Réglages du serveur d'envoi.
 *
 * Le mot de passe n'est **jamais pré-rempli** : le serveur ne l'envoie pas à
 * l'écran, même masqué. Le laisser vide conserve celui déjà enregistré — sans
 * quoi changer un numéro de port casserait l'envoi.
 */
export function EmailSettingsForm({
  settings,
}: {
  settings: EmailSettingsView | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveEmailSettingsAction,
    empty,
  );

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-3 border border-line-1 bg-surface p-4 sm:grid-cols-2"
    >
      <Field
        label="Serveur SMTP"
        name="host"
        defaultValue={settings?.host ?? ''}
        placeholder="smtp.example.fr"
        required
        hint="Fourni par votre hébergeur de messagerie."
      />

      <Field
        label="Port"
        name="port"
        type="number"
        defaultValue={String(settings?.port ?? 587)}
        required
        hint="587 avec STARTTLS, 465 avec TLS implicite."
      />

      <label className="flex items-start gap-2 text-sm text-ink-2 sm:col-span-2">
        <input
          name="secure"
          type="checkbox"
          defaultChecked={settings?.secure ?? false}
          className="mt-0.5 size-4"
        />
        <span>
          TLS implicite (port 465)
          <span className="block text-micro text-ink-3">
            À cocher pour le port 465 seulement. Sur 587, laissez décoché : la
            connexion est chiffrée par STARTTLS.
          </span>
        </span>
      </label>

      <Field
        label="Identifiant"
        name="username"
        defaultValue={settings?.username ?? ''}
        placeholder="souvent l’adresse complète"
        hint="Laissez vide si le serveur n’exige pas d’authentification."
      />

      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder={
          settings?.hasPassword ? '•••••••• (inchangé)' : 'Mot de passe SMTP'
        }
        hint={
          settings?.hasPassword
            ? 'Laissez vide pour conserver celui enregistré.'
            : 'Chiffré au repos, jamais réaffiché.'
        }
      />

      <Field
        label="Nom d’expéditeur"
        name="fromName"
        defaultValue={settings?.fromName ?? ''}
        placeholder="Maison Rivage — RH"
        required
      />

      <Field
        label="Adresse d’expéditeur"
        name="fromAddress"
        type="email"
        defaultValue={settings?.fromAddress ?? ''}
        placeholder="rh@example.fr"
        required
        hint="Doit appartenir à un domaine que votre serveur est autorisé à signer (SPF, DKIM), sinon les messages partent en indésirable."
      />

      <Field
        label="Répondre à"
        name="replyTo"
        type="email"
        defaultValue={settings?.replyTo ?? ''}
        placeholder="Facultatif"
        hint="Adresse où arrivent les réponses des salariés."
      />

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="primary" disabled={pending}>
          Enregistrer
        </Button>
        {state.error ? (
          <span role="alert" className="text-xs text-danger">
            {state.error}
          </span>
        ) : null}
        {state.message ? (
          <span className="text-xs text-ok-soft-ink">{state.message}</span>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Envoi de test.
 *
 * Séparé de l'enregistrement : un réglage non éprouvé n'est pas un réglage,
 * c'est une intention. Tant que le test n'a pas abouti, l'écran le dit.
 */
export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const [state, formAction, pending] = useActionState(
    sendTestEmailAction,
    empty,
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-3 border border-line-2 bg-surface-2 p-3"
    >
      <label className="flex flex-col gap-1">
        <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
          Envoyer un test à
        </span>
        <input
          name="to"
          type="email"
          defaultValue={defaultTo}
          required
          className="h-8 w-64 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
      </label>

      <Button type="submit" disabled={pending}>
        Envoyer un test
      </Button>

      {state.error ? (
        <p role="alert" className="w-full text-xs text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="w-full text-xs text-ok-soft-ink">{state.message}</p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  ...rest
}: {
  label: string;
  name: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `email-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="h-8 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        {...rest}
      />
      {hint ? <p className="text-micro text-ink-3">{hint}</p> : null}
    </div>
  );
}
