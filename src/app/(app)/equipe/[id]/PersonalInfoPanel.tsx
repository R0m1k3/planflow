'use client';

import { useActionState, useState } from 'react';

import { InfoCard, InfoGrid, InfoRow } from '@/app/(app)/equipe/[id]/InfoCard';
import { Button } from '@/components/ui/Button';
import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import {
  GENDERS,
  MARITAL_STATUSES,
  genderLabel,
  maritalStatusLabel,
} from '@/domain/hr/civil-status';
import {
  COUNTRY_OPTIONS,
  NATIONALITY_OPTIONS,
  countryLabel,
  nationalityLabel,
} from '@/domain/legal/countries';
import { DEPARTMENTS, departmentLabel } from '@/domain/legal/departments';
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
  gender: string;
  firstName: string;
  birthName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  birthCountry: string;
  birthDepartment: string;
  nationality: string;
  maritalStatus: string;
  dependents: string;
  personalEmail: string;
  phone: string;
  landline: string;
  smsSchedules: boolean;
  addressLine1: string;
  addressLine2: string;
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

/**
 * Liste déroulante à valeur facultative.
 *
 * L'option vide est explicite : sans elle, ouvrir le formulaire poserait la
 * première valeur de la liste sur un champ que personne n'a renseigné.
 */
function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1 outline-none focus-visible:border-focus"
      >
        <option value="">Non renseigné</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

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
                <Select
                  label="Genre"
                  name="gender"
                  defaultValue={profile.gender}
                  options={GENDERS}
                />
                <Field label="Prénom" name="firstName" required defaultValue={profile.firstName} />
                <Field
                  label="Nom de naissance"
                  name="birthName"
                  defaultValue={profile.birthName}
                />
                <Field label="Nom de famille" name="lastName" required defaultValue={profile.lastName} />
                <Select
                  label="Nationalité"
                  name="nationality"
                  defaultValue={profile.nationality}
                  options={NATIONALITY_OPTIONS}
                />
                <Field
                  label="Date de naissance"
                  name="birthDate"
                  type="date"
                  defaultValue={profile.birthDate}
                />
                <Select
                  label="Pays de naissance"
                  name="birthCountry"
                  defaultValue={profile.birthCountry}
                  options={COUNTRY_OPTIONS}
                />
                {/* Renseigné pour une naissance en France ; laissé vide
                    ailleurs, où la notion n'existe pas. */}
                <Select
                  label="Département de naissance"
                  name="birthDepartment"
                  defaultValue={profile.birthDepartment}
                  options={DEPARTMENTS}
                />
                <Field
                  label="Commune de naissance"
                  name="birthPlace"
                  defaultValue={profile.birthPlace}
                />
                <Select
                  label="Situation familiale"
                  name="maritalStatus"
                  defaultValue={profile.maritalStatus}
                  options={MARITAL_STATUSES}
                />
                <Field
                  label="Nombre de personnes à charge"
                  name="dependents"
                  type="number"
                  min="0"
                  max="99"
                  defaultValue={profile.dependents}
                />
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
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="smsSchedules"
                    defaultChecked={profile.smsSchedules}
                    className="mt-0.5 size-4 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="font-medium">Notifications SMS</span>
                    <span className="block text-micro text-ink-3">
                      Consentement du salarié : à recueillir avant de l’activer.
                    </span>
                  </span>
                </label>
                <Field label="Téléphone fixe" name="landline" type="tel" defaultValue={profile.landline} />
                <Field label="Adresse" name="addressLine1" defaultValue={profile.addressLine1} />
                <Field
                  label="Complément d’adresse"
                  name="addressLine2"
                  defaultValue={profile.addressLine2}
                />
                <div className="flex flex-wrap gap-3">
                  <Field label="Code postal" name="postalCode" defaultValue={profile.postalCode} />
                  <Field label="Ville" name="city" defaultValue={profile.city} />
                </div>
                <Select
                  label="Pays"
                  name="country"
                  defaultValue={profile.country}
                  options={COUNTRY_OPTIONS}
                />
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
              <InfoRow label="Genre" value={genderLabel(profile.gender || null)} />
              <InfoRow label="Prénom" value={profile.firstName} />
              <InfoRow label="Nom de naissance" value={profile.birthName} />
              <InfoRow label="Nom de famille" value={profile.lastName} />
              <InfoRow label="Nationalité" value={nationalityLabel(profile.nationality || null)} />
              <InfoRow label="Date de naissance" value={readableDate(profile.birthDate)} tnum />
              <InfoRow label="Pays de naissance" value={countryLabel(profile.birthCountry || null)} />
              <InfoRow
                label="Département de naissance"
                value={departmentLabel(profile.birthDepartment || null)}
              />
              <InfoRow label="Commune de naissance" value={profile.birthPlace} />
              <InfoRow
                label="Situation familiale"
                value={maritalStatusLabel(profile.maritalStatus || null)}
              />
              <InfoRow
                label="Nombre de personnes à charge"
                value={profile.dependents}
                tnum
              />
            </InfoCard>

            <InfoCard title="Coordonnées">
              <InfoRow label="Adresse électronique personnelle" value={profile.personalEmail} />
              <InfoRow label="Téléphone mobile" value={profile.phone} tnum />
              <InfoRow
                label="Notifications SMS"
                value={profile.smsSchedules ? 'Oui' : 'Non'}
              />
              <InfoRow label="Téléphone fixe" value={profile.landline} tnum />
              <InfoRow label="Adresse" value={profile.addressLine1} />
              <InfoRow label="Complément d’adresse" value={profile.addressLine2} />
              <InfoRow label="Code postal" value={profile.postalCode} tnum />
              <InfoRow label="Ville" value={profile.city} />
              <InfoRow label="Pays" value={countryLabel(profile.country || null)} />
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
