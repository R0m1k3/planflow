'use client';

import { useActionState, useState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  createEmployeeAction,
  type ActionState,
} from '@/server/employees/actions';
import type {
  ContractLocation,
  HiringOptions,
} from '@/server/employees/queries';

/**
 * Embauche.
 *
 * Deux sections et un seul envoi : ce qui identifie la personne, puis ce qui
 * l'emploie. Un salarié créé sans contrat ni équipe est un dossier que rien ne
 * rattache — il n'apparaît sur aucune grille et ne se déclare pas — d'où un
 * contrat proposé d'emblée, et décochable seulement pour les cas où
 * l'établissement n'est pas encore tranché.
 */

const empty: ActionState = {};

const CONTRACT_TYPES = [
  ['CDI', 'CDI'],
  ['CDD', 'CDD'],
  ['APPRENTISSAGE', 'Apprentissage'],
  ['STAGIAIRE', 'Stagiaire'],
  ['SAISONNIER', 'Saisonnier'],
  ['EXTRA', 'Extra'],
  ['INTERIM', 'Intérim'],
  ['DIRIGEANT_ASSIMILE_SALARIE', 'Dirigeant assimilé salarié'],
  ['DIRIGEANT_NON_SALARIE', 'Dirigeant non salarié'],
] as const;

const selectClass =
  'h-9 min-w-0 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1 outline-none focus-visible:border-focus';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export function AddEmployeeForm({
  locations,
  options,
  onSaved,
}: {
  /** Vide quand la capacité d'ouvrir un contrat manque : la section disparaît. */
  locations: ContractLocation[];
  options: HiringOptions;
  /** Appelé une fois l'ajout accepté — le panneau s'y referme. */
  onSaved?: () => void;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createEmployeeAction,
    empty,
  );
  const [withContract, setWithContract] = useState(locations.length > 0);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [forfait, setForfait] = useState(false);
  const [autoNumber, setAutoNumber] = useState(true);
  const [acknowledged, setAcknowledged] = useState<ActionState>(empty);

  // Acquitté une fois pour toutes : sans cela, un succès resté en mémoire
  // refermerait le panneau à sa réouverture.
  if (state !== acknowledged && state.ok) {
    setAcknowledged(state);
    onSaved?.();
  }

  const teams =
    locations.find((location) => location.id === locationId)?.teams ?? [];

  return (
    <PersistentForm
      action={formAction}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-6"
    >
      <Section title="Informations salarié">
        <Field label="Prénom" name="firstName" required />
        <Field
          label="Nom de naissance"
          name="birthName"
          hint="Laissez vide s’il est identique au nom de famille."
        />
        <Field label="Nom de famille" name="lastName" required />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-medium">Matricule</span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setAutoNumber(!autoNumber)}
              className="text-micro font-medium text-accent-soft-ink underline underline-offset-2"
            >
              {autoNumber
                ? 'Saisir un matricule'
                : 'Passer à la génération automatique'}
            </button>
          </div>
          {autoNumber ? (
            <p className="text-micro text-ink-3">
              Attribué à la suite du dernier, au moment de l’enregistrement.
            </p>
          ) : (
            <input
              name="employeeNumber"
              aria-label="Matricule"
              className="h-9 rounded-2 border border-line-2 bg-surface px-3 text-sm text-ink-1 outline-none focus-visible:border-focus"
            />
          )}
        </div>

        <Field label="Date de naissance" name="birthDate" type="date" />

        <Field
          label="Adresse électronique"
          name="email"
          type="email"
          hint="Permet de se connecter à PlanFlow et de recevoir ses plannings. Sans elle, le salarié reste planifiable et déclarable."
        />
        <Field label="Téléphone mobile" name="phone" type="tel" />

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="smsSchedules"
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium">Envoyer les plannings par SMS</span>
            <span className="block text-micro text-ink-3">
              Consentement du salarié : à recueillir avant de l’activer.
            </span>
          </span>
        </label>

        <Field label="Téléphone fixe" name="landline" type="tel" />
      </Section>

      {locations.length > 0 ? (
        <Section title="Contrat">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="withContract"
              checked={withContract}
              onChange={(event) => setWithContract(event.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Ouvrir un contrat maintenant
          </label>

          {withContract ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Field
                  label="Date de début de contrat"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={today()}
                />
                <Field
                  label="Heure de début de contrat"
                  name="startTime"
                  type="time"
                  required
                  defaultValue="09:00"
                  hint="Demandée par la DPAE."
                />
              </div>

              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium">Type de contrat</span>
                <select name="contractType" className={selectClass}>
                  {CONTRACT_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-3">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    Organisation du temps
                  </span>
                  <select
                    name="workTimeArrangement"
                    className={selectClass}
                    onChange={(event) =>
                      setForfait(event.target.value === 'FORFAIT_JOURS')
                    }
                  >
                    <option value="HOURLY">Décompte horaire</option>
                    <option value="FORFAIT_JOURS">Forfait jours</option>
                  </select>
                </label>

                {forfait ? (
                  <Field
                    label="Jours par an"
                    name="forfaitDaysPerYear"
                    type="number"
                    step="0.5"
                    min="0"
                    max="218"
                    defaultValue="218"
                  />
                ) : (
                  <Field
                    label="Temps de travail hebdomadaire"
                    name="weeklyHours"
                    type="number"
                    step="0.5"
                    min="0"
                    max="60"
                    defaultValue="35"
                  />
                )}
              </div>

              {forfait ? (
                <div className="flex flex-wrap gap-3">
                  <Field
                    label="Référence de la convention de forfait"
                    name="forfaitAgreementRef"
                    required
                    hint="Sans convention individuelle écrite, le forfait est inopposable."
                  />
                  <Field
                    label="Date d’accord du salarié"
                    name="forfaitAgreedAt"
                    type="date"
                    required
                  />
                </div>
              ) : null}

              <Field
                label="Fin du contrat"
                name="endDate"
                type="date"
                hint="Vide pour un contrat sans terme."
              />

              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium">
                  Établissement par défaut
                </span>
                <select
                  name="locationId"
                  className={selectClass}
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium">Équipe</span>
                <select name="teamId" className={selectClass}>
                  <option value="">Aucune pour l’instant</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium">
                  Responsable hiérarchique
                </span>
                <select name="lineManagerId" className={selectClass}>
                  <option value="">Aucun</option>
                  {options.managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </label>

              {options.rttPolicies.length > 0 ? (
                <label className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-sm font-medium">Politique RTT</span>
                  <select name="rttPolicyId" className={selectClass}>
                    <option value="">Aucune</option>
                    {options.rttPolicies.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
        </Section>
      ) : null}

      <FormError>{state.error}</FormError>

      <div className="sticky bottom-0 -mx-5 border-t border-line-1 bg-surface px-5 py-4">
        <SubmitButton className="w-full">Enregistrer</SubmitButton>
        {state.ok ? (
          <p className="mt-2 text-center text-xs text-ok-soft-ink">
            Salarié ajouté.
          </p>
        ) : null}
      </div>
    </PersistentForm>
  );
}
