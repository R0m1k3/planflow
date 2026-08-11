/**
 * Pauses d'un créneau — PLAN.md §4.4.
 *
 * Un créneau porte une **liste** de pauses, pas un total. Deux pauses de vingt
 * minutes et une coupure de deux heures ne se planifient pas de la même façon
 * et ne se contrôlent pas pareil : la première satisfait la pause minimale au
 * delà de six heures, la seconde interroge l'amplitude de la journée.
 *
 * Le créneau conserve deux totaux dérivés, et c'est délibéré :
 *
 * - `breakMinutes` — les pauses **non rémunérées**, déduites du temps de
 *   travail. C'est ce que lisent la paie, les compteurs et l'export, sans
 *   changer d'un caractère.
 * - `paidBreakMinutes` — les pauses **rémunérées**. Non déduites, mais bien des
 *   pauses : la règle de pause minimale regarde la somme des deux, sans quoi une
 *   pause payée passerait pour une absence de pause et alerterait à tort.
 *
 * Les totaux ne sont pas une optimisation : ils sont la forme sous laquelle le
 * reste du produit lit déjà l'information. Les recalculer à chaque écriture
 * coûte moins qu'un second chemin de lecture qui finirait par diverger.
 */

export interface BreakInput {
  /** Minutes depuis le début du créneau. `null` = pause non située. */
  startMinutes: number | null;
  durationMinutes: number;
  isPaid: boolean;
  label: string | null;
}

export interface BreakTotals {
  /** Déduit du temps de travail. */
  breakMinutes: number;
  /** Compté comme repos, pas déduit. */
  paidBreakMinutes: number;
}

export class BreakError extends Error {}

const MAX_BREAKS = 6;
const MAX_DURATION = 600;

/**
 * Valide et ordonne une liste de pauses.
 *
 * Refuse plutôt que de corriger. Une pause de durée nulle vient d'une ligne
 * ajoutée puis laissée vide ; l'écarter en silence donnerait un enregistrement
 * réussi et une pause disparue, ce qui est le pire des deux mondes — sauf pour
 * une ligne **entièrement** vide, qui n'est pas une saisie mais un formulaire
 * en cours.
 */
export function normaliseBreaks(
  raw: ReadonlyArray<Partial<BreakInput>>,
  shiftMinutes: number,
): BreakInput[] {
  const entered = raw.filter(
    (entry) =>
      entry.durationMinutes !== undefined &&
      entry.durationMinutes !== null &&
      !Number.isNaN(entry.durationMinutes),
  );

  if (entered.length > MAX_BREAKS) {
    throw new BreakError(
      `Six pauses au plus par créneau ; ${entered.length} ont été saisies.`,
    );
  }

  const breaks = entered.map((entry, index) => {
    const duration = Number(entry.durationMinutes);

    if (!Number.isInteger(duration) || duration <= 0) {
      throw new BreakError(
        `Pause ${index + 1} : la durée doit être un nombre de minutes positif.`,
      );
    }
    if (duration > MAX_DURATION) {
      throw new BreakError(
        `Pause ${index + 1} : ${duration} min dépasse le maximum de ${MAX_DURATION} min.`,
      );
    }

    const start =
      entry.startMinutes === null || entry.startMinutes === undefined
        ? null
        : Number(entry.startMinutes);

    if (start !== null) {
      if (!Number.isInteger(start) || start < 0) {
        throw new BreakError(
          `Pause ${index + 1} : le début doit être un nombre de minutes positif.`,
        );
      }
      // Une pause qui déborde du créneau n'est pas une pause : c'est une
      // saisie fausse, et la laisser passer fausserait l'amplitude.
      if (start + duration > shiftMinutes) {
        throw new BreakError(
          `Pause ${index + 1} : elle sort du créneau.`,
        );
      }
    }

    return {
      startMinutes: start,
      durationMinutes: duration,
      isPaid: Boolean(entry.isPaid),
      label: entry.label?.trim() ? entry.label.trim() : null,
    } satisfies BreakInput;
  });

  assertNoOverlap(breaks);

  // Les pauses situées d'abord, dans l'ordre ; les non situées ensuite. C'est
  // l'ordre de lecture d'une journée.
  return [...breaks].sort((a, b) => {
    if (a.startMinutes === null) return b.startMinutes === null ? 0 : 1;
    if (b.startMinutes === null) return -1;
    return a.startMinutes - b.startMinutes;
  });
}

/**
 * Deux pauses situées ne peuvent pas se chevaucher.
 *
 * Elles compteraient deux fois dans le total déduit, et le salarié se verrait
 * retirer un temps qu'il n'a pris qu'une fois.
 */
function assertNoOverlap(breaks: BreakInput[]): void {
  const placed = breaks
    .filter((entry) => entry.startMinutes !== null)
    .sort((a, b) => (a.startMinutes as number) - (b.startMinutes as number));

  for (let index = 1; index < placed.length; index += 1) {
    const previous = placed[index - 1] as BreakInput;
    const current = placed[index] as BreakInput;
    const previousEnd =
      (previous.startMinutes as number) + previous.durationMinutes;
    if ((current.startMinutes as number) < previousEnd) {
      throw new BreakError(
        'Deux pauses se chevauchent : le temps serait déduit deux fois.',
      );
    }
  }
}

export function breakTotals(breaks: ReadonlyArray<BreakInput>): BreakTotals {
  return breaks.reduce<BreakTotals>(
    (totals, entry) => ({
      breakMinutes:
        totals.breakMinutes + (entry.isPaid ? 0 : entry.durationMinutes),
      paidBreakMinutes:
        totals.paidBreakMinutes + (entry.isPaid ? entry.durationMinutes : 0),
    }),
    { breakMinutes: 0, paidBreakMinutes: 0 },
  );
}

/** Durée totale de repos, rémunérée ou non — ce que regarde la règle de pause. */
export function totalRestMinutes(totals: BreakTotals): number {
  return totals.breakMinutes + totals.paidBreakMinutes;
}
