/**
 * Règles de cohérence des contrats.
 *
 * Fonctions pures : elles s'appliquent aussi bien à la validation d'un
 * formulaire qu'au contrôle en transaction, et se testent sans base.
 */

export interface ContractPeriod {
  id?: string;
  startDate: Date;
  /** `null` = contrat sans terme (CDI en cours). */
  endDate: Date | null;
}

/**
 * Deux périodes se chevauchent-elles ?
 *
 * Un contrat sans terme court indéfiniment : il chevauche donc toute période
 * qui commence après lui. C'est le cas que l'on oublie en comparant bêtement
 * deux couples de dates.
 */
export function periodsOverlap(a: ContractPeriod, b: ContractPeriod): boolean {
  const aStart = a.startDate.getTime();
  const bStart = b.startDate.getTime();
  const aEnd = a.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const bEnd = b.endDate?.getTime() ?? Number.POSITIVE_INFINITY;

  return aStart <= bEnd && bStart <= aEnd;
}

/** Contrats existants qui empêcheraient la création de `candidate`. */
export function findOverlaps(
  candidate: ContractPeriod,
  existing: ContractPeriod[],
): ContractPeriod[] {
  return existing.filter(
    (period) => period.id !== candidate.id && periodsOverlap(candidate, period),
  );
}

export interface ContractValidationInput extends ContractPeriod {
  workTimeArrangement: 'HOURLY' | 'FORFAIT_JOURS';
  weeklyHours: number;
  forfaitDaysPerYear?: number | null;
  forfaitAgreementRef?: string | null;
  forfaitAgreedAt?: Date | null;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

/** Plafond conventionnel IDCC 1517, journée de solidarité incluse. */
export const FORFAIT_JOURS_CAP = 218;

export function validateContract(
  input: ContractValidationInput,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (input.endDate && input.endDate < input.startDate) {
    issues.push({
      field: 'endDate',
      message: 'La fin du contrat précède son début.',
    });
  }

  if (input.workTimeArrangement === 'FORFAIT_JOURS') {
    // Sans convention individuelle écrite et accord du salarié, le forfait est
    // inopposable : l'activer produirait un décompte en jours sans base légale,
    // et supprimerait au passage tout contrôle de durée hebdomadaire.
    if (!input.forfaitAgreementRef?.trim()) {
      issues.push({
        field: 'forfaitAgreementRef',
        message:
          'Le forfait jours exige une convention individuelle écrite (référence du document).',
      });
    }
    if (!input.forfaitAgreedAt) {
      issues.push({
        field: 'forfaitAgreedAt',
        message: 'Le forfait jours exige la date d’accord du salarié.',
      });
    }

    const days = input.forfaitDaysPerYear ?? 0;
    if (days <= 0) {
      issues.push({
        field: 'forfaitDaysPerYear',
        message: 'Indiquez le nombre de jours du forfait.',
      });
    } else if (days > FORFAIT_JOURS_CAP) {
      issues.push({
        field: 'forfaitDaysPerYear',
        message: `Le plafond conventionnel est de ${FORFAIT_JOURS_CAP} jours, journée de solidarité incluse.`,
      });
    }
  } else if (input.weeklyHours <= 0) {
    issues.push({
      field: 'weeklyHours',
      message: 'La durée hebdomadaire doit être positive.',
    });
  }

  return issues;
}

/** Un contrat au forfait ne se planifie pas en heures (PLAN.md §6.4). */
export function isHourScheduled(arrangement: string): boolean {
  return arrangement === 'HOURLY';
}
