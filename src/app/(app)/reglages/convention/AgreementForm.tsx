'use client';

import { useActionState } from 'react';

import { Field, FormError, SubmitButton } from '@/components/ui/Form';
import { PersistentForm } from '@/components/ui/PersistentForm';
import type { AgreementParameters } from '@/domain/compliance/parameters';
import {
  publishAgreementVersionAction,
  type ActionState,
} from '@/server/settings/agreement';

const empty: ActionState = {};

function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2 border-t border-line-1 pt-3">
      <legend className="text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
        {title}
      </legend>
      {note ? <p className="text-micro text-ink-3">{note}</p> : null}
      <div className="flex flex-wrap gap-3">{children}</div>
    </fieldset>
  );
}

function Area({
  label,
  name,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  defaultValue: string;
  hint: string;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        name={name}
        rows={4}
        defaultValue={defaultValue}
        className="rounded-2 border border-line-2 bg-surface px-3 py-2 font-mono text-xs text-ink-1 outline-none focus-visible:border-focus"
      />
      <span className="text-micro text-ink-3">{hint}</span>
    </label>
  );
}

export function AgreementForm({
  idcc,
  name,
  parameters,
}: {
  idcc: string;
  name: string;
  parameters: AgreementParameters;
}) {
  const [state, action] = useActionState(publishAgreementVersionAction, empty);
  const p = parameters;

  const tiers = p.overtime.tiers
    .map((tier) => `${tier.fromMinutes};${tier.toMinutes ?? ''};${tier.ratePercent}`)
    .join('\n');
  const derogations = p.partTime.derogations
    .map((row) => `${row.code};${row.label};${row.minWeeklyMinutes}`)
    .join('\n');

  return (
    <PersistentForm action={action} className="flex flex-col gap-4 p-4">
      <Group title="Version" note="Les durées sont en minutes entières.">
        <Field label="IDCC" name="idcc" defaultValue={idcc} required maxLength={10} />
        <Field label="Intitulé" name="name" defaultValue={name} required maxLength={160} />
        <Field
          label="En vigueur à partir du"
          name="effectiveFrom"
          type="date"
          required
          hint="La version précédente reste applicable aux semaines antérieures."
        />
        <Field
          label="Source"
          name="source"
          required
          maxLength={400}
          placeholder="Legifrance, texte consolidé au…"
          hint="Sans source, le paramètre n’est pas opposable."
        />
        <Field label="Approuvé par" name="approvedBy" maxLength={160} />
      </Group>

      <Group title="Durées">
        <Field label="Référence hebdomadaire" name="weeklyReferenceMinutes" type="number" defaultValue={p.weeklyReferenceMinutes} required />
        <Field label="Maximum quotidien" name="maxDailyWorkMinutes" type="number" defaultValue={p.maxDailyWorkMinutes} required />
        <Field
          label="Amplitude quotidienne"
          name="maxDailyAmplitudeMinutes"
          type="number"
          defaultValue={p.maxDailyAmplitudeMinutes ?? ''}
          hint="Vide : la convention n’en fixe pas, la règle reste muette."
        />
        <Field label="Repos quotidien minimal" name="minDailyRestMinutes" type="number" defaultValue={p.minDailyRestMinutes} required />
        <Field label="Repos hebdomadaire minimal" name="minWeeklyRestMinutes" type="number" defaultValue={p.minWeeklyRestMinutes} required />
        <Field label="Maximum hebdomadaire absolu" name="maxWeeklyWorkAbsoluteMinutes" type="number" defaultValue={p.maxWeeklyWorkAbsoluteMinutes} required />
        <Field label="Fenêtre de moyenne (semaines)" name="averagedWindowWeeks" type="number" defaultValue={p.averagedWeeklyWork.windowWeeks} required />
        <Field label="Moyenne maximale" name="averagedMaxMinutes" type="number" defaultValue={p.averagedWeeklyWork.maxAverageMinutes} required />
        <Field label="Jours consécutifs maximum" name="maxConsecutiveWorkDays" type="number" defaultValue={p.maxConsecutiveWorkDays} required />
        <Field label="Seuil de pause" name="breakThresholdMinutes" type="number" defaultValue={p.breakAfterThreshold.thresholdMinutes} required />
        <Field label="Pause minimale" name="breakMinMinutes" type="number" defaultValue={p.breakAfterThreshold.minBreakMinutes} required />
        <Field label="Tolérance d’écart au contrat" name="deviationToleranceMinutes" type="number" defaultValue={p.contractDeviationToleranceMinutes} required />
      </Group>

      <Group title="Temps partiel">
        <Field label="Minimum hebdomadaire" name="partTimeMinWeeklyMinutes" type="number" defaultValue={p.partTime.minWeeklyMinutes} required />
        <Area
          label="Dérogations"
          name="derogations"
          defaultValue={derogations}
          hint="Une par ligne : code;libellé;minutes."
        />
      </Group>

      <Group title="Heures supplémentaires">
        <Area
          label="Tranches"
          name="overtimeTiers"
          defaultValue={tiers}
          hint="Une par ligne : début;fin;taux. Fin vide = sans plafond. Cumulatives depuis le début de la semaine."
        />
        <Field label="Contingent annuel" name="overtimeQuotaMinutes" type="number" defaultValue={p.overtime.annualQuotaMinutes} required />
        <Field label="Repos au-delà du contingent (%)" name="overtimeBeyondRestPercent" type="number" step="0.01" defaultValue={p.overtime.beyondQuotaRestPercent} required />
      </Group>

      <Group title="Heures complémentaires">
        <Field label="Taux première tranche (%)" name="complementaryFirstRate" type="number" step="0.01" defaultValue={p.complementaryHours.firstTierRatePercent} required />
        <Field label="Taux au-delà (%)" name="complementaryBeyondRate" type="number" step="0.01" defaultValue={p.complementaryHours.beyondRatePercent} required />
        <Field label="Fraction première tranche" name="complementaryFirstFraction" type="number" step="0.01" defaultValue={p.complementaryHours.firstTierFraction} required />
        <Field label="Plafond (fraction)" name="complementaryCapFraction" type="number" step="0.01" defaultValue={p.complementaryHours.capFraction} required />
      </Group>

      <Group
        title="Dimanche"
        note="La majoration et le repos compensateur vont ensemble : l’un sans l’autre est un manquement à L3132-27."
      >
        <Field label="Majoration (%)" name="sundayPremiumPercent" type="number" step="0.01" defaultValue={p.sunday.premiumPercent} required />
        <Field label="Repos compensateur (%)" name="sundayRestPercent" type="number" step="0.01" defaultValue={p.sunday.compensatoryRestPercent} required />
        <Field label="Dimanches du maire par an" name="sundayMayorQuota" type="number" defaultValue={p.sunday.mayorQuotaPerYear} required />
      </Group>

      <Group title="Jours fériés">
        <Field label="Indemnité si travaillé (%)" name="holidayWorkedPremium" type="number" step="0.01" defaultValue={p.holiday.workedPremiumPercent} required />
        <Field label="1er mai travaillé (%)" name="holidayLabourDayPremium" type="number" step="0.01" defaultValue={p.holiday.labourDayPremiumPercent} required />
        <Field label="Fériés chômés garantis" name="holidayPaidOffDays" type="number" defaultValue={p.holiday.paidOffDaysPerYear} required />
        <Field label="Repos de substitution (%)" name="holidaySubstitutionRest" type="number" step="0.01" defaultValue={p.holiday.substitutionRestPercent} required />
      </Group>

      <Group title="Nuit et forfait jours">
        <Field label="Début de nuit (min. depuis minuit)" name="nightStartMinutes" type="number" defaultValue={p.night.startMinutes} required />
        <Field label="Fin de nuit" name="nightEndMinutes" type="number" defaultValue={p.night.endMinutes} required />
        <Field label="Non imposable à partir de" name="nightNotEnforceableFromAge" type="number" defaultValue={p.night.notEnforceableFromAge} required />
        <Field label="Jours de forfait maximum" name="forfaitMaxDaysPerYear" type="number" defaultValue={p.forfaitJours.maxDaysPerYear} required />
        <Field label="Entretien de charge (mois)" name="forfaitReviewMonths" type="number" defaultValue={p.forfaitJours.workloadReviewIntervalMonths} required />
      </Group>

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Publier une nouvelle version</SubmitButton>
        {state.ok ? (
          <span className="text-xs text-ok-soft-ink">
            Version enregistrée. Les semaines antérieures gardent la précédente.
          </span>
        ) : null}
      </div>
    </PersistentForm>
  );
}
