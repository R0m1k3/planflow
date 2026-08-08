'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/Button';
import { verifyMfaAction, type ChallengeState } from '@/server/auth/actions';

const empty: ChallengeState = {};

export function MfaChallengeForm() {
  const [state, formAction, pending] = useActionState(verifyMfaAction, empty);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
          Code
        </span>
        <input
          name="code"
          // `one-time-code` permet aux gestionnaires de mots de passe de
          // proposer le code sans le faire recopier.
          autoComplete="one-time-code"
          inputMode="text"
          autoFocus
          required
          className="tnum h-9 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
        <span className="text-micro text-ink-3">
          Six chiffres, ou l’un de vos codes de secours si vous n’avez pas votre
          téléphone.
        </span>
      </label>

      <Button type="submit" variant="primary" disabled={pending}>
        Vérifier
      </Button>

      {state.error ? (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
