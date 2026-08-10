'use client';

import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  createEmployeeAction,
  type ActionState,
} from '@/server/employees/actions';
import type { ContractLocation } from '@/server/employees/queries';

/**
 * Embauche.
 *
 * Un salarié créé sans contrat ni équipe est un dossier que rien ne rattache :
 * il n'apparaît sur aucune grille et ne se déclare pas. Le contrat est donc
 * proposé d'emblée — et reste décochable, parce qu'un remplaçant se saisit
 * parfois avant que son établissement soit tranché.
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

export function AddEmployeeForm({
  locations,
}: {
  /** Vide quand la capacité d'ouvrir un contrat manque : la section disparaît. */
  locations: ContractLocation[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createEmployeeAction,
    empty,
  );
  const [withContract, setWithContract] = useState(locations.length > 0);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [forfait, setForfait] = useState(false);

  const teams =
    locations.find((location) => location.id === locationId)?.teams ?? [];

  return (
    <PersistentForm
      action={formAction}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap gap-3">
        <Field label="Prénom" name="firstName" required />
        <Field label="Nom" name="lastName" required />
        <Field label="Matricule" name="employeeNumber" required />
      </div>

      <div className="flex flex-wrap gap-3">
        <Field
          label="Adresse électronique"
          name="email"
          type="email"
          hint="Facultative. Sans adresse, le salarié reste planifiable et déclarable ; il n’aura simplement pas d’accès à l’application."
        />
        <Field label="Téléphone mobile" name="phone" type="tel" />
      </div>

      {locations.length > 0 ? (
        <>
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
            <div className="flex flex-col gap-3 rounded-3 border border-line-1 bg-surface-2 p-4">
              <div className="flex flex-wrap gap-3">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-sm font-medium">Établissement</span>
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

                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
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

                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-sm font-medium">Type de contrat</span>
                  <select name="contractType" className={selectClass}>
                    {CONTRACT_TYPES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <Field
                  label="Début du contrat"
                  name="startDate"
                  type="date"
                  required={withContract}
                />
                <Field
                  label="Fin du contrat"
                  name="endDate"
                  type="date"
                  hint="Vide pour un contrat sans terme."
                />
              </div>

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
                    label="Durée hebdomadaire"
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
            </div>
          ) : null}
        </>
      ) : null}

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Ajouter</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Salarié ajouté.</span>
        ) : null}
        {withContract ? null : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setWithContract(true)}
            disabled={locations.length === 0}
          >
            Ajouter un contrat
          </Button>
        )}
      </div>
    </PersistentForm>
  );
}
