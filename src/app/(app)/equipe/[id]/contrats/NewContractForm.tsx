'use client';

import { useActionState, useState } from 'react';

import { InfoCard } from '@/app/(app)/equipe/[id]/InfoCard';
import { Button } from '@/components/ui/Button';
import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import {
  createContractAction,
  type ActionState,
} from '@/server/employees/actions';

/**
 * Ouverture d'un contrat.
 *
 * Le forfait jours découvre ses propres champs : la convention individuelle
 * écrite et sa date d'accord sont exigées par la règle métier, et les demander
 * en permanence ferait porter à tous les contrats horaires deux champs qui ne
 * les concernent pas.
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
  'h-9 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1 outline-none focus-visible:border-focus';

export function NewContractForm({
  membershipId,
  locations,
}: {
  membershipId: string;
  locations: Array<{ id: string; name: string }>;
}) {
  const [state, submit] = useActionState(createContractAction, empty);
  const [forfait, setForfait] = useState(false);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="flex justify-center">
        <Button variant="primary" onClick={() => setOpen(true)}>
          Ouvrir un contrat
        </Button>
      </div>
    );
  }

  return (
    <InfoCard title="Nouveau contrat">
      <form action={submit} className="flex flex-col gap-3 pt-1">
        <input type="hidden" name="membershipId" value={membershipId} />

        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium">Établissement</span>
            <select name="locationId" required className={selectClass}>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium">Type de contrat</span>
            <select name="contractType" required className={selectClass}>
              {CONTRACT_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Field label="Début du contrat" name="startDate" type="date" required />
          <Field
            label="Fin du contrat"
            name="endDate"
            type="date"
            hint="Laissez vide pour un contrat sans terme."
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium">Organisation du temps</span>
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
              hint="Plafond conventionnel : 218 jours, journée de solidarité incluse."
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

        <FormError>{state.error}</FormError>

        <div className="flex items-center gap-3">
          <SubmitButton>Ouvrir le contrat</SubmitButton>
          <Button type="button" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>
    </InfoCard>
  );
}
