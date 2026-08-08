'use client';

import { useActionState, useState, useTransition } from 'react';

import { Button } from '@/components/ui/Button';
import { formatSecret } from '@/domain/access/totp';
import {
  confirmEnrolmentAction,
  disableMfaAction,
  startEnrolmentAction,
  type MfaState,
  type OfferState,
} from '@/server/auth/mfa-actions';

const empty: MfaState = {};

/**
 * Second facteur du compte courant.
 *
 * Trois états successifs et un seul écran : rien d'activé, un enrôlement en
 * cours, un facteur en place. Les séparer en pages ferait perdre le secret
 * proposé au premier retour arrière.
 */
export function MfaSettings({
  enrolled,
  required,
}: {
  enrolled: boolean;
  required: boolean;
}) {
  const [offer, setOffer] = useState<OfferState | null>(null);
  const [starting, startTransition] = useTransition();

  const [confirmState, confirm, confirming] = useActionState(
    confirmEnrolmentAction,
    empty,
  );
  const [disableState, disable, disabling] = useActionState(
    disableMfaAction,
    empty,
  );

  const codes = confirmState.recoveryCodes;
  const active = (enrolled || confirmState.ok) && !disableState.ok;

  if (codes && codes.length > 0) {
    return <RecoveryCodes codes={codes} />;
  }

  if (active) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-ink-2">
          Un second facteur est actif sur votre compte. Il vous sera demandé à
          chaque connexion.
        </p>

        {required ? (
          <p className="rounded-3 border border-info bg-info-soft p-3 text-sm text-info-soft-ink">
            Votre rôle donne accès aux rémunérations ou à la distribution des
            droits : le second facteur est <strong>exigé</strong> et ne peut pas
            être retiré.
          </p>
        ) : (
          <form action={disable} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
                Mot de passe
              </span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-8 w-64 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
              />
              <span className="text-micro text-ink-3">
                Redemandé pour qu’un poste laissé ouvert ne suffise pas à
                désarmer la protection.
              </span>
            </label>
            <Button type="submit" disabled={disabling}>
              Désactiver
            </Button>
          </form>
        )}

        {disableState.error ? (
          <p role="alert" className="text-xs text-danger">
            {disableState.error}
          </p>
        ) : null}
      </div>
    );
  }

  if (!offer?.secret) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-ink-2">
          Un code à six chiffres, produit par une application
          d’authentification, s’ajoute au mot de passe. Il change toutes les
          trente secondes et ne transite par aucun réseau.
        </p>
        {required ? (
          <p role="alert" className="rounded-3 border border-warn bg-warn-soft p-3 text-sm text-warn-soft-ink">
            Votre rôle l’exige : tant qu’il n’est pas activé, l’accès aux
            écrans reste fermé.
          </p>
        ) : null}
        <div>
          <Button
            variant="primary"
            disabled={starting}
            onClick={() =>
              startTransition(async () => {
                setOffer(await startEnrolmentAction());
              })
            }
          >
            Activer le second facteur
          </Button>
        </div>
        {disableState.message ? (
          <p className="text-xs text-ok-soft-ink">{disableState.message}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={confirm} className="flex flex-col gap-4 p-4">
      <input type="hidden" name="secret" value={offer.secret} />

      <ol className="flex flex-col gap-4 text-sm text-ink-2">
        <li>
          <p className="font-medium text-ink-1">
            1. Ajoutez le compte à votre application
          </p>
          {offer.qr ? (
            <div
              aria-label="QR code d’enrôlement"
              className="mt-2 w-40 [&>svg]:h-full [&>svg]:w-full"
              // Le SVG vient du serveur, produit à partir d'une URI que nous
              // avons nous-mêmes composée : il n'y a pas de contenu tiers.
              dangerouslySetInnerHTML={{ __html: offer.qr }}
            />
          ) : null}
          <p className="mt-2 text-micro text-ink-3">
            Sans appareil photo, saisissez cette clé :
          </p>
          <p className="font-mono text-sm break-all text-ink-1">
            {formatSecret(offer.secret)}
          </p>
        </li>
        <li>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-ink-1">
              2. Recopiez le code affiché
            </span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              required
              className="tnum h-9 w-40 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
            />
          </label>
        </li>
      </ol>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={confirming}>
          Valider
        </Button>
        <Button type="button" onClick={() => setOffer(null)}>
          Annuler
        </Button>
        {confirmState.error ? (
          <span role="alert" className="text-xs text-danger">
            {confirmState.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

/**
 * Codes de secours, affichés une seule fois.
 *
 * Ils sont conservés hachés : ni le support ni un administrateur ne peuvent les
 * relire. La seule issue, ensuite, est d'en régénérer une série.
 */
function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm text-ink-1">
        <strong>Second facteur activé.</strong> Conservez ces codes de secours :
        ils sont votre seule issue si vous perdez votre téléphone.
      </p>
      <ul
        data-testid="recovery-codes"
        className="grid gap-1 rounded-3 border border-line-2 bg-surface-2 p-3 font-mono text-sm sm:grid-cols-2"
      >
        {codes.map((code) => (
          <li key={code} className="tnum">
            {code}
          </li>
        ))}
      </ul>
      <p className="text-micro text-ink-3">
        Affichés une seule fois : ils ne sont pas conservés en clair. Chacun ne
        sert qu’une fois.
      </p>
    </div>
  );
}
