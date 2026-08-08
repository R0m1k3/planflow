import { RULES } from '@/domain/compliance/rules';
import {
  RULE_CODES,
  type ComplianceContext,
  type RuleCode,
  type Severity,
  type Violation,
} from '@/domain/compliance/types';

/**
 * Exécution du moteur — PLAN.md §6.5.
 *
 * Le moteur n'écrit rien et ne décide rien : il constate. C'est la couche
 * serveur qui refuse un enregistrement sur un `BLOCKING`, et le manager qui
 * assume un `WARNING` en le justifiant.
 */

export interface EvaluationResult {
  violations: Violation[];
  blocking: Violation[];
  warnings: Violation[];
  /** Règles qui ont levé pendant l'évaluation, avec leur message d'erreur. */
  failures: Array<{ ruleCode: RuleCode; error: string }>;
}

export function evaluate(context: ComplianceContext): EvaluationResult {
  const violations: Violation[] = [];
  const failures: EvaluationResult['failures'] = [];

  for (const ruleCode of RULE_CODES) {
    try {
      violations.push(...RULES[ruleCode](context));
    } catch (error) {
      // Une règle qui lève ne doit pas emporter les dix-sept autres : le
      // planning resterait sans aucun contrôle, et rien ne le signalerait.
      // L'échec est collecté et remonté explicitement.
      failures.push({
        ruleCode,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    violations,
    blocking: violations.filter((entry) => entry.severity === 'BLOCKING'),
    warnings: violations.filter((entry) => entry.severity === 'WARNING'),
    failures,
  };
}

/** Évalue plusieurs salariés et agrège, en conservant leur rattachement. */
export function evaluateAll(
  contexts: ComplianceContext[],
): Map<string, EvaluationResult> {
  return new Map(
    contexts.map((context) => [context.membershipId, evaluate(context)]),
  );
}

const SEVERITY_ORDER: Record<Severity, number> = {
  BLOCKING: 0,
  WARNING: 1,
  INFO: 2,
};

/** Trie du plus grave au plus anodin, puis par date. */
export function sortViolations(violations: Violation[]): Violation[] {
  return [...violations].sort((a, b) => {
    const bySeverity =
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return (a.localDate ?? '').localeCompare(b.localDate ?? '');
  });
}
