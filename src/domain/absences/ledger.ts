/**
 * Registre des compteurs — PLAN.md §7.1.
 *
 * `LedgerOperation` est la source de vérité, et le solde est la **somme** des
 * écritures. Aucun solde n'est stocké : un solde stocké se désynchronise, et la
 * désynchronisation ne se voit qu'au moment où un salarié conteste.
 *
 * Corollaire : **aucune écriture n'est jamais modifiée ni supprimée.** Une
 * correction s'écrit — contre-passation puis nouvelle écriture — elle ne se
 * réécrit pas. Un trigger PostgreSQL l'impose, parce qu'une règle appliquée
 * seulement dans l'application finit par être contournée par un script.
 */

export type LedgerKind =
  | 'ACCRUAL'
  | 'TAKEN'
  | 'ADJUSTMENT'
  | 'CARRY_OVER'
  | 'EXPIRY'
  | 'REGULARISATION';

export type LedgerUnit = 'DAY' | 'HOUR';

export interface LedgerEntry {
  kind: LedgerKind;
  /** **Signé** : positif acquiert, négatif consomme. */
  quantity: number;
  unit: LedgerUnit;
  effectiveDate: string;
}

/** Le solde est la somme, jamais une valeur stockée. */
export function balanceOf(entries: LedgerEntry[]): number {
  return round(entries.reduce((sum, entry) => sum + entry.quantity, 0));
}

/** Solde à une date donnée, écritures postérieures exclues. */
export function balanceAt(entries: LedgerEntry[], isoDate: string): number {
  return balanceOf(entries.filter((entry) => entry.effectiveDate <= isoDate));
}

export interface CounterView {
  /** Acquis sur la période. */
  accrued: number;
  /** Pris, en valeur absolue. */
  taken: number;
  /** Solde courant. */
  balance: number;
  /** Solde projeté en fin de période d'acquisition. */
  projected: number;
  unit: LedgerUnit;
}

/**
 * Vue d'un compteur, courant et prévisionnel.
 *
 * Le prévisionnel projette les acquisitions **restant à courir** sur la période.
 * C'est ce que le salarié veut savoir avant de poser ses congés d'été : « ce
 * que j'aurai », pas « ce que j'ai ».
 */
export function counterView(
  entries: LedgerEntry[],
  remainingAccrual: number,
  unit: LedgerUnit = 'DAY',
): CounterView {
  const accrued = round(
    entries
      .filter((entry) => entry.quantity > 0)
      .reduce((sum, entry) => sum + entry.quantity, 0),
  );
  const taken = round(
    Math.abs(
      entries
        .filter((entry) => entry.kind === 'TAKEN')
        .reduce((sum, entry) => sum + entry.quantity, 0),
    ),
  );
  const balance = balanceOf(entries);

  return {
    accrued,
    taken,
    balance,
    projected: round(balance + remainingAccrual),
    unit,
  };
}

/**
 * Acquisition de congés payés — PLAN.md §12.3.
 *
 * 2,5 jours ouvrables par mois de travail effectif. Pendant un arrêt maladie
 * **non professionnelle**, l'acquisition continue à 2 jours par mois, dans la
 * limite de 24 jours par an : c'est le droit issu de la réforme de 2024, et
 * l'oublier prive le salarié d'un droit acquis.
 *
 * Les valeurs viennent des paramètres, pas d'ici.
 */
export interface AccrualParameters {
  /** Jours acquis par mois de travail effectif. */
  perWorkedMonth: number;
  /** Jours acquis par mois d'arrêt maladie non professionnelle. */
  perSickMonth: number;
  /** Plafond annuel d'acquisition pendant maladie. */
  sickAnnualCap: number;
}

export const PAID_LEAVE_ACCRUAL: AccrualParameters = {
  perWorkedMonth: 2.5,
  perSickMonth: 2,
  sickAnnualCap: 24,
};

export function accrualForMonth(
  worked: boolean,
  sickMonths: number,
  parameters: AccrualParameters = PAID_LEAVE_ACCRUAL,
): number {
  if (worked) return parameters.perWorkedMonth;

  const alreadyAccrued = sickMonths * parameters.perSickMonth;
  const remaining = parameters.sickAnnualCap - alreadyAccrued;
  return round(Math.max(0, Math.min(parameters.perSickMonth, remaining)));
}

/**
 * Écriture inverse d'une écriture existante.
 *
 * Même quantité, signe opposé. La date d'effet est celle de la correction, pas
 * celle de l'écriture d'origine : antidater masquerait la correction dans les
 * soldes déjà communiqués.
 */
export function reversalOf(entry: LedgerEntry, onDate: string): LedgerEntry {
  return {
    kind: 'REGULARISATION',
    quantity: -entry.quantity,
    unit: entry.unit,
    effectiveDate: onDate,
  };
}

/** Quatre décimales : la précision du ledger, pas celle de l'affichage. */
function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
