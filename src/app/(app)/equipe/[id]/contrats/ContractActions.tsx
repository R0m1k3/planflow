'use client';

import { useActionState, useState } from 'react';

import { InfoCard, InfoRow } from '@/app/(app)/equipe/[id]/InfoCard';
import { Button } from '@/components/ui/Button';
import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import {
  createAmendmentAction,
  endContractAction,
  type ActionState,
} from '@/server/employees/actions';

/**
 * Vie du contrat en cours.
 *
 * Trois gestes et un seul menu : lire le détail, déclarer un changement,
 * terminer. Ils sont réunis parce qu'ils portent sur le même objet, et séparés
 * du formulaire de création parce qu'un contrat qui existe ne se recrée pas.
 */

const empty: ActionState = {};

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export interface ActiveContract {
  id: string;
  label: string;
  startDate: string;
  endDate: string | null;
  trialEndDate: string | null;
  weeklyHours: string;
  forfaitJours: boolean;
  forfaitDaysPerYear: string | null;
  forfaitAgreementRef: string | null;
  isModulated: boolean;
  classification: string | null;
  coefficient: string | null;
  locationName: string | null;
  monthlySalary: string | null;
  jobTitle: string | null;
}

const readable = (iso: string | null) =>
  iso ? dateFormat.format(new Date(`${iso}T00:00:00Z`)) : '';

type Panel = 'none' | 'detail' | 'amend' | 'end';

export function ContractActions({
  contract,
  canEdit,
  canSeeSalary,
}: {
  contract: ActiveContract;
  canEdit: boolean;
  canSeeSalary: boolean;
}) {
  const [panel, setPanel] = useState<Panel>('none');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-md font-semibold">Contrat en cours</h2>
        <span className="flex-1" />
        <Button
          onClick={() => setPanel(panel === 'detail' ? 'none' : 'detail')}
        >
          {panel === 'detail' ? 'Masquer le détail' : 'Afficher le détail'}
        </Button>
        {canEdit ? (
          <>
            <Button
              onClick={() => setPanel(panel === 'amend' ? 'none' : 'amend')}
            >
              Déclarer un changement
            </Button>
            <Button
              variant="danger"
              onClick={() => setPanel(panel === 'end' ? 'none' : 'end')}
            >
              Terminer le contrat
            </Button>
          </>
        ) : null}
      </div>

      <InfoCard title={contract.label}>
        <InfoRow label="Début du contrat" value={readable(contract.startDate)} tnum />
        <InfoRow label="Fin du contrat" value={readable(contract.endDate)} tnum />
        <InfoRow label="Emploi" value={contract.jobTitle} />
        <InfoRow
          label="Organisation du temps"
          value={
            contract.forfaitJours
              ? `Forfait jours · ${contract.forfaitDaysPerYear ?? '—'} jours par an`
              : `${contract.weeklyHours} heures hebdomadaires`
          }
        />
        {canSeeSalary ? (
          <InfoRow
            label="Rémunération mensuelle brute"
            value={contract.monthlySalary ? `${contract.monthlySalary} €` : ''}
            tnum
          />
        ) : null}
        <InfoRow label="Établissement" value={contract.locationName} />

        {panel === 'detail' ? (
          <>
            <InfoRow
              label="Fin de période d’essai"
              value={readable(contract.trialEndDate)}
              tnum
            />
            <InfoRow label="Classification" value={contract.classification} />
            <InfoRow label="Coefficient" value={contract.coefficient} tnum />
            <InfoRow
              label="Modulation"
              value={contract.isModulated ? 'Oui' : 'Non'}
            />
            {contract.forfaitJours ? (
              <InfoRow
                label="Convention de forfait"
                value={contract.forfaitAgreementRef}
              />
            ) : null}
          </>
        ) : null}
      </InfoCard>

      {panel === 'amend' ? (
        <AmendmentForm
          contractId={contract.id}
          weeklyHours={contract.weeklyHours}
          onDone={() => setPanel('none')}
        />
      ) : null}

      {panel === 'end' ? (
        <EndForm contractId={contract.id} onDone={() => setPanel('none')} />
      ) : null}
    </div>
  );
}

/**
 * Avenant.
 *
 * Le motif est obligatoire : un changement de durée sans raison écrite est
 * indéfendable devant un contrôle, et illisible six mois plus tard.
 */
function AmendmentForm({
  contractId,
  weeklyHours,
  onDone,
}: {
  contractId: string;
  weeklyHours: string;
  onDone: () => void;
}) {
  const [state, submit] = useActionState(createAmendmentAction, empty);
  const [acknowledged, setAcknowledged] = useState<ActionState>(empty);

  if (state !== acknowledged && state.ok) {
    setAcknowledged(state);
    onDone();
  }

  return (
    <InfoCard title="Déclarer un changement">
      <form action={submit} className="flex flex-col gap-3 pt-1">
        <input type="hidden" name="contractId" value={contractId} />
        <div className="flex flex-wrap gap-3">
          <Field
            label="Date d’effet"
            name="effectiveDate"
            type="date"
            required
          />
          <Field
            label="Durée hebdomadaire"
            name="weeklyHours"
            type="number"
            step="0.5"
            min="0"
            max="60"
            defaultValue={weeklyHours}
          />
        </div>
        <Field
          label="Motif"
          name="reason"
          required
          hint="Ce que l’avenant change, et pourquoi. Conservé au journal."
        />

        <FormError>{state.error}</FormError>

        <div className="flex items-center gap-3">
          <SubmitButton>Enregistrer l’avenant</SubmitButton>
          <Button type="button" onClick={onDone}>
            Annuler
          </Button>
        </div>
      </form>
    </InfoCard>
  );
}

function EndForm({
  contractId,
  onDone,
}: {
  contractId: string;
  onDone: () => void;
}) {
  const [state, submit] = useActionState(endContractAction, empty);
  const [acknowledged, setAcknowledged] = useState<ActionState>(empty);

  if (state !== acknowledged && state.ok) {
    setAcknowledged(state);
    onDone();
  }

  return (
    <InfoCard title="Terminer le contrat">
      <form action={submit} className="flex flex-col gap-3 pt-1">
        <input type="hidden" name="contractId" value={contractId} />
        <p className="text-sm text-ink-2">
          Le contrat est daté et clos, non supprimé : la période travaillée
          reste opposable, et le solde de tout compte s’appuie dessus.
        </p>
        <div className="flex flex-wrap gap-3">
          <Field label="Date de fin" name="endDate" type="date" required />
          <Field
            label="Motif de fin"
            name="endReason"
            required
            hint="Démission, fin de CDD, rupture conventionnelle…"
          />
        </div>

        <FormError>{state.error}</FormError>

        <div className="flex items-center gap-3">
          <SubmitButton>Terminer le contrat</SubmitButton>
          <Button type="button" onClick={onDone}>
            Annuler
          </Button>
        </div>
      </form>
    </InfoCard>
  );
}
