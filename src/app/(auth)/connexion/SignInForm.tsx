'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { signInAction, type SignInState } from '@/server/auth/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full"
      disabled={pending}
    >
      {pending ? 'Connexion…' : 'Se connecter'}
    </Button>
  );
}

export function SignInForm() {
  const [state, formAction] = useActionState<SignInState, FormData>(
    signInAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Adresse électronique</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="h-9 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1 outline-none focus-visible:border-focus"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Mot de passe</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-9 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1 outline-none focus-visible:border-focus"
        />
      </label>

      {state.error ? (
        // `role="alert"` : l'échec doit être annoncé, pas seulement coloré.
        <p
          role="alert"
          className="rounded-2 border border-danger bg-danger-soft px-3 py-2 text-xs text-danger-soft-ink"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
