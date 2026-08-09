/**
 * Durées de conservation — PLAN.md §12.5, matrice n° 21.
 *
 * La matrice est explicite : les minima légaux ne sont ni universels ni une
 * autorisation de tout garder. **Aucune durée par défaut n'est appliquée ici.**
 * Un objet sans politique déclarée se conserve, et l'écran le dit — inventer
 * « cinq ans partout » serait précisément la faute que le plan interdit.
 */

/**
 * Points de départ du décompte.
 *
 * `employee_departure` est **déclaré mais pas calculable** : PlanFlow ne modèle
 * pas encore de date de départ. Une politique qui s'y adosse est conservée et
 * affichée, jamais appliquée — la déclarer applicable reviendrait à purger sur
 * une date inventée.
 */
export const START_POINTS = [
  'creation',
  'contract_end',
  'period_end',
  'employee_departure',
] as const;

export type StartPoint = (typeof START_POINTS)[number];

export const START_POINT_LABELS: Record<StartPoint, string> = {
  creation: 'Création de l’objet',
  contract_end: 'Fin du contrat',
  period_end: 'Fin de la période de paie',
  employee_departure: 'Départ du salarié',
};

/** Points de départ que le code sait situer dans le temps aujourd'hui. */
export const COMPUTABLE_START_POINTS = new Set<StartPoint>([
  'creation',
  'contract_end',
  'period_end',
]);

export function isComputable(startPoint: string): boolean {
  return COMPUTABLE_START_POINTS.has(startPoint as StartPoint);
}

export interface RetentionPolicyLike {
  objectType: string;
  durationMonths: number;
  startPoint: string;
  legalHold: boolean;
  effectiveFrom: Date;
}

/**
 * Politique applicable à une date donnée.
 *
 * Effectif-daté comme le reste : une pièce déposée en mars relève de la
 * politique en vigueur en mars, même si elle a changé depuis. Sans cela, un
 * durcissement rétroactif purgerait des pièces que la règle du moment
 * autorisait à garder.
 */
export function applicablePolicy<T extends RetentionPolicyLike>(
  policies: readonly T[],
  objectType: string,
  at: Date,
): T | null {
  const candidates = policies
    .filter(
      (policy) =>
        policy.objectType === objectType && policy.effectiveFrom <= at,
    )
    .sort(
      (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime(),
    );

  return candidates[0] ?? null;
}

/**
 * Politique applicable, en remontant du plus précis au plus général.
 *
 * `Document:SICK_NOTE` avant `Document` : un arrêt de travail et un contrat
 * n'ont aucune raison de se conserver aussi longtemps, et la matrice demande
 * justement de trancher par objet.
 */
export function resolvePolicy<T extends RetentionPolicyLike>(
  policies: readonly T[],
  objectTypes: readonly string[],
  at: Date,
): T | null {
  for (const objectType of objectTypes) {
    const found = applicablePolicy(policies, objectType, at);
    if (found) return found;
  }
  return null;
}

/**
 * Échéance de conservation.
 *
 * Un décalage en mois, pas en jours : « cinq ans » se compte de date à date.
 * `setUTCMonth` ramène le 31 mars + 1 mois au 31 avril, donc au 1er mai ; on
 * borne au dernier jour du mois visé pour que l'échéance reste dans le mois
 * attendu.
 */
export function dueAt(anchor: Date, durationMonths: number): Date {
  const target = new Date(anchor.getTime());
  const day = target.getUTCDate();

  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + durationMonths);

  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));

  return target;
}

export type PurgeVerdict =
  | 'NO_POLICY'
  | 'NOT_DUE'
  | 'HELD'
  | 'NOT_COMPUTABLE'
  | 'DUE';

export interface PurgeInput {
  policy: RetentionPolicyLike | null;
  anchor: Date | null;
  now: Date;
}

/**
 * Faut-il purger ?
 *
 * Chaque refus porte son motif : « rien à purger » sans distinguer l'absence de
 * politique, la suspension pour contentieux et l'échéance non atteinte
 * empêcherait de vérifier que la conservation est tenue.
 */
export function purgeVerdict({ policy, anchor, now }: PurgeInput): PurgeVerdict {
  if (!policy) return 'NO_POLICY';
  // Le legal hold prime sur tout : une pièce sous séquestre ne se purge pas,
  // même largement échue.
  if (policy.legalHold) return 'HELD';
  if (!isComputable(policy.startPoint)) return 'NOT_COMPUTABLE';
  if (!anchor) return 'NOT_COMPUTABLE';

  return dueAt(anchor, policy.durationMonths) <= now ? 'DUE' : 'NOT_DUE';
}

export const VERDICT_LABELS: Record<PurgeVerdict, string> = {
  NO_POLICY: 'Aucune politique déclarée',
  NOT_DUE: 'Échéance non atteinte',
  HELD: 'Suspendue — conservation à titre probatoire',
  NOT_COMPUTABLE: 'Point de départ non calculable',
  DUE: 'À purger',
};
