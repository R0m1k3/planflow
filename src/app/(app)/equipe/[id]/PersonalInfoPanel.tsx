'use client';

import { useActionState, useState } from 'react';

import { InfoCard, InfoGrid, InfoRow } from '@/app/(app)/equipe/[id]/InfoCard';
import { Button } from '@/components/ui/Button';
import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import {
  updateProfileAction,
  updateSensitiveAction,
  type ProfileActionState,
} from '@/server/employees/profile-actions';

/**
 * Dossier personnel : consultation, puis saisie.
 *
 * Un seul écran et deux modes, plutôt qu'une page de lecture et une page de
 * formulaire. Le dossier se corrige champ par champ, souvent au téléphone avec
 * la personne concernée : la faire changer de page pour changer un chiffre
 * ferait perdre le reste de vue.
 */

export interface ProfileFields {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  personalEmail: string;
  phone: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface SensitiveFields {
  socialSecurityNumber: string;
  iban: string;
  bic: string;
}

const empty: ProfileActionState = {};

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

function readableDate(value: string): string {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : dateFormat.format(parsed);
}

export function PersonalInfoPanel({
  membershipId,
  profile,
  sensitive,
  canEdit,
}: {
  membershipId: string;
  profile: ProfileFields;
  /** Absent quand la capacité de lecture manque : la carte n'est pas rendue. */
  sensitive: SensitiveFields | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, save] = useActionState(updateProfileAction, empty);
  const [acknowledged, setAcknowledged] = useState<ProfileActionState>(empty);

  // L'enregistrement referme le mode saisie, mais seulement après la réponse :
  // refermer à l'envoi ferait disparaître le message d'erreur avec le
  // formulaire, et avec lui ce que la personne venait de taper.
  //
  // La réponse est **acquittée** une fois pour toutes : sans cela, un succès
  // resté en mémoire refermerait aussitôt le formulaire à la prochaine
  // ouverture, et le dossier ne serait plus jamais modifiable.
  if (state !== acknowledged && state.ok) {
    setAcknowledged(state);
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-5">
      {editing ? (
        <form action={save} className="flex flex-col gap-5">
          <input type="hidden" name="membershipId" value={membershipId} />

          <InfoGrid>
            <InfoCard title="État civil">
              <div className="flex flex-col gap-3 pt-1">
                <Field label="Prénom" name="firstName" required defaultValue={profile.firstName} />
                <Field label="Nom de famille" name="lastName" required defaultValue={profile.lastName} />
                <Field
                  label="Date de naissance"
                  name="birthDate"
                  type="date"
                  defaultValue={profile.birthDate}
                />
                <Field
                  label="Lieu de naissance"
                  name="birthPlace"
                  defaultValue={profile.birthPlace}
                  hint="Commune, et département pour la France."
                />
                <Field label="Nationalité" name="nationality" defaultValue={profile.nationality} />
              </div>
            </InfoCard>

            <InfoCard title="Coordonnées">
              <div className="flex flex-col gap-3 pt-1">
                <Field
                  label="Adresse électronique personnelle"
                  name="personalEmail"
                  type="email"
                  defaultValue={profile.personalEmail}
                />
                <Field label="Téléphone mobile" name="phone" type="tel" defaultValue={profile.phone} />
                <Field label="Adresse" name="addressLine1" defaultValue={profile.addressLine1} />
                <div className="flex flex-wrap gap-3">
                  <Field label="Code postal" name="postalCode" defaultValue={profile.postalCode} />
                  <Field label="Ville" name="city" defaultValue={profile.city} />
                </div>
                <Field label="Pays" name="country" defaultValue={profile.country} />
              </div>
            </InfoCard>

            <InfoCard title="Contact d’urgence">
              <div className="flex flex-col gap-3 pt-1">
                <Field
                  label="Nom"
                  name="emergencyContactName"
                  defaultValue={profile.emergencyContactName}
                />
                <Field
                  label="Téléphone"
                  name="emergencyContactPhone"
                  type="tel"
                  defaultValue={profile.emergencyContactPhone}
                />
              </div>
            </InfoCard>
          </InfoGrid>

          <FormError>{state.error}</FormError>

          {/* Barre collante : le dossier est long, et le bouton d'enregistrement
              ne doit pas se trouver hors de l'écran au moment où l'on finit de
              corriger un champ du haut. */}
          <div className="sticky bottom-4 flex flex-wrap items-center justify-center gap-3 rounded-3 border border-line-1 bg-surface p-3 shadow-[var(--shadow-1,0_1px_2px_rgba(0,0,0,0.06))]">
            <Button type="button" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <SubmitButton>Enregistrer les modifications</SubmitButton>
          </div>
        </form>
      ) : (
        <>
          <InfoGrid>
            <InfoCard title="État civil">
              <InfoRow label="Prénom" value={profile.firstName} />
              <InfoRow label="Nom de famille" value={profile.lastName} />
              <InfoRow label="Date de naissance" value={readableDate(profile.birthDate)} tnum />
              <InfoRow label="Lieu de naissance" value={profile.birthPlace} />
              <InfoRow label="Nationalité" value={profile.nationality} />
            </InfoCard>

            <InfoCard title="Coordonnées">
              <InfoRow label="Adresse électronique personnelle" value={profile.personalEmail} />
              <InfoRow label="Téléphone mobile" value={profile.phone} tnum />
              <InfoRow label="Adresse" value={profile.addressLine1} />
              <InfoRow label="Code postal" value={profile.postalCode} tnum />
              <InfoRow label="Ville" value={profile.city} />
              <InfoRow label="Pays" value={profile.country} />
            </InfoCard>

            <InfoCard title="Contact d’urgence">
              <InfoRow label="Nom" value={profile.emergencyContactName} />
              <InfoRow label="Téléphone" value={profile.emergencyContactPhone} tnum />
            </InfoCard>
          </InfoGrid>

          {canEdit ? (
            <div className="flex justify-center">
              <Button variant="primary" onClick={() => setEditing(true)}>
                Modifier les informations personnelles
              </Button>
            </div>
          ) : null}
        </>
      )}

      {sensitive ? (
        <SensitivePanel
          membershipId={membershipId}
          sensitive={sensitive}
          canEdit={canEdit}
        />
      ) : null}
    </div>
  );
}

/**
 * NIR, IBAN et BIC.
 *
 * Séparés du reste, et pas seulement à l'écran : ils sont chiffrés au repos,
 * leur lecture demande sa propre capacité, et leur écriture passe par une autre
 * action. Les mêler au formulaire commun ferait dépendre leur sort d'un droit
 * qui ne les concerne pas.
 */
function SensitivePanel({
  membershipId,
  sensitive,
  canEdit,
}: {
  membershipId: string;
  sensitive: SensitiveFields;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, save] = useActionState(updateSensitiveAction, empty);
  const [acknowledged, setAcknowledged] = useState<ProfileActionState>(empty);

  if (state !== acknowledged && state.ok) {
    setAcknowledged(state);
    setEditing(false);
  }

  return (
    <InfoCard title="Données protégées">
      {editing ? (
        <form action={save} className="flex flex-col gap-3 pt-1">
          <input type="hidden" name="membershipId" value={membershipId} />
          <Field
            label="Numéro de sécurité sociale"
            name="socialSecurityNumber"
            inputMode="numeric"
            defaultValue={sensitive.socialSecurityNumber}
            hint="Quinze chiffres. Conservé chiffré ; jamais écrit au journal."
          />
          <Field label="IBAN" name="iban" defaultValue={sensitive.iban} />
          <Field label="BIC" name="bic" defaultValue={sensitive.bic} />

          <FormError>{state.error}</FormError>

          <div className="flex items-center gap-3">
            <SubmitButton>Enregistrer</SubmitButton>
            <Button type="button" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <>
          <InfoRow
            label="Numéro de sécurité sociale"
            value={sensitive.socialSecurityNumber}
            tnum
          />
          <InfoRow label="IBAN" value={sensitive.iban} tnum />
          <InfoRow label="BIC" value={sensitive.bic} tnum />
          {canEdit ? (
            <div className="pt-3">
              <Button onClick={() => setEditing(true)}>Modifier</Button>
            </div>
          ) : null}
        </>
      )}
    </InfoCard>
  );
}
