'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import {
  createAbsenceTypeAction,
  updateAbsenceTypeAction,
  type AbsenceTypeRow,
  type ActionState,
} from '@/server/settings/absence-types';

const empty: ActionState = {};

/** Drapeaux du type, avec ce que chacun décide réellement. */
const FLAGS = [
  {
    name: 'isPaid',
    label: 'Rémunérée',
    hint: 'L’absence est payée par l’employeur.',
  },
  {
    name: 'countsAsWorkTime',
    label: 'Compte comme temps de travail',
    hint: 'Entre dans le décompte horaire, donc dans les seuils de convention.',
  },
  {
    name: 'affectsPaidLeaveAccrual',
    label: 'Acquiert des congés payés',
    hint: 'La période continue d’ouvrir des droits à congés.',
  },
  {
    name: 'isSocialSecurity',
    label: 'Absence Sécurité sociale',
    hint: 'Maladie, maternité, accident du travail. Donnée de santé : le motif est masqué en vue manager.',
  },
  {
    name: 'requiresJustification',
    label: 'Justificatif exigé',
    hint: 'La demande est refusée sans pièce jointe.',
  },
] as const;

function Flags({ row }: { row?: AbsenceTypeRow }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
        Effets
      </legend>
      {FLAGS.map((flag) => (
        <label key={flag.name} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name={flag.name}
            defaultChecked={row ? Boolean(row[flag.name]) : flag.name === 'isPaid'}
            className="mt-0.5"
          />
          <span>
            {flag.label}
            <span className="block text-micro text-ink-3">{flag.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function SharedFields({ row }: { row?: AbsenceTypeRow }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Field
        label="Libellé"
        name="name"
        required
        maxLength={120}
        defaultValue={row?.name}
        placeholder="Congé payé"
      />
      <Field
        label="Clé de couleur"
        name="colorKey"
        required
        maxLength={40}
        defaultValue={row?.colorKey ?? 'neutral'}
      />
      <Field
        label="Délai de prévenance"
        name="minNoticeDays"
        type="number"
        min={0}
        max={365}
        defaultValue={row?.minNoticeDays ?? ''}
        hint="En jours. Vide : aucun délai."
      />
      <Field
        label="Code Silae"
        name="silaeCode"
        maxLength={20}
        defaultValue={row?.silaeCode ?? ''}
        hint="Partie « code » de AB-<code>. Sans lui, l’export de la période échoue."
      />
    </div>
  );
}

export function AddAbsenceTypeForm() {
  const [state, action] = useActionState(createAbsenceTypeAction, empty);

  return (
    <PersistentForm
      action={action}
      resetAfter={state.ok ? state : null}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap gap-3">
        <Field
          label="Code"
          name="code"
          required
          maxLength={20}
          placeholder="CP"
          hint="Identifiant stable du type. Il ne se renomme pas."
        />
      </div>
      <SharedFields />
      <Flags />
      <FormError>{state.error}</FormError>
      <div className="flex items-center gap-3">
        <SubmitButton>Ajouter le type</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Type enregistré.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}

export function EditAbsenceTypeForm({ row }: { row: AbsenceTypeRow }) {
  const [state, action] = useActionState(updateAbsenceTypeAction, empty);

  return (
    <PersistentForm action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={row.id} />
      <SharedFields row={row} />
      <Flags row={row} />
      <FormError>{state.error}</FormError>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm">Enregistrer</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">Modifications prises.</span>
        ) : null}
      </div>
    </PersistentForm>
  );
}
