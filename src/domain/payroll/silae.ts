/**
 * Format d'export Silae — PLAN.md §8.
 *
 * Ce module ne décide de rien : il **sérialise**. Le format décrit ici est
 * relevé sur un export réel du dossier (juillet 2026), pas déduit d'une
 * documentation. Chaque règle de mise en forme ci-dessous a été vérifiée octet
 * par octet sur ce fichier, parce qu'un import de paie refusé pour une virgule
 * ou un accent coûte une demi-journée au gestionnaire, et qu'un import
 * *accepté* avec des valeurs mal arrondies coûte bien davantage.
 *
 * Ce qui a été constaté :
 *
 * - Encodage **ASCII pur** : ni accent ni caractère composé, y compris dans
 *   les libellés (« Heures travaillees », « Date debut »). Émettre de l'UTF-8
 *   accentué serait s'écarter de ce que le dossier reçoit aujourd'hui.
 * - Fins de ligne **CRLF**, y compris après la dernière ligne.
 * - Séparateur `;`, aucun guillemet, aucun point-virgule final.
 * - Décimale **point**, jamais virgule.
 * - Dates **JJ/MM/AAAA**.
 */

export const SILAE_HEADER = 'Matricule;Code;Valeur;Date debut;Date fin';

const CRLF = '\r\n';

/**
 * Nature d'une valeur, qui décide de sa mise en forme.
 *
 * Les jours sortent en entier nu (`14`), les heures avec au moins une décimale
 * (`96.0`, `69.67`). Ce n'est pas cosmétique : c'est ce que produit l'export
 * de référence, et l'import est le seul juge.
 */
export type SilaeValueKind = 'HOURS' | 'DAYS';

export interface SilaeLine {
  matricule: string;
  code: string;
  /** En minutes pour `HOURS`, en jours entiers pour `DAYS`. */
  value: number;
  kind: SilaeValueKind;
  /** Date civile ISO `AAAA-MM-JJ`. */
  startDate: string;
  endDate: string;
}

/**
 * Codes de service, sans préfixe.
 *
 * Ils décrivent le décompte lui-même plutôt qu'une rubrique de paie, d'où
 * l'absence de préfixe `HS-` / `AB-` / `EV-`.
 */
export const SILAE_SERVICE_CODES = {
  workedDays: 'Nombre total de jours travailles',
  workedHours: 'Heures travaillees',
  missingHours: 'Heures manquantes au contrat',
  entryExit: 'Entree / Sortie',
} as const;

/**
 * Vocabulaire relevé dans l'export de référence.
 *
 * **Ce sont les codes, pas leur signification.** Savoir que `AB-300` existe ne
 * dit pas quel type d'absence il désigne : cette correspondance appartient au
 * dossier Silae du client et se lit dans « Saisie des éléments variables ».
 * Elle est saisie dans l'écran de correspondance, jamais devinée ici.
 */
export const SILAE_OBSERVED_CODES = [
  'AB-100',
  'AB-200',
  'AB-300',
  'AB-630',
  'EV-HDimanche',
  'EV-HFerie',
  'HS-HS25',
] as const;

/** `2026-07-01` → `01/07/2026`. */
export function formatSilaeDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) {
    throw new Error(`Date invalide pour l'export Silae : ${isoDate}`);
  }
  return `${day}/${month}/${year}`;
}

/**
 * Minutes → heures décimales, arrondies au centième.
 *
 * 4 h 50 donne `4.83`, 69 h 40 donne `69.67`. L'arrondi se fait **par ligne**,
 * comme dans l'export de référence : recomposer un total à partir des lignes
 * peut donc s'écarter de quelques centièmes du total réel. C'est le
 * comportement attendu, pas un défaut à corriger — corriger ferait diverger du
 * fichier que le gestionnaire de paie sait relire.
 */
export function minutesToDecimalHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Met en forme une valeur.
 *
 * Les heures gardent **au moins une décimale et au plus deux**, zéros
 * superflus retirés : `96.0`, `52.5`, `69.67`. Les jours sortent en entier.
 */
export function formatSilaeValue(value: number, kind: SilaeValueKind): string {
  if (kind === 'DAYS') return String(Math.round(value));

  const hours = minutesToDecimalHours(value);
  const withTwo = hours.toFixed(2);
  // `96.00` → `96.0` ; `52.50` → `52.5` ; `69.67` inchangé.
  return withTwo.endsWith('0') ? withTwo.slice(0, -1) : withTwo;
}

/**
 * Retire les accents et tout caractère hors ASCII imprimable.
 *
 * L'export de référence ne contient aucun caractère composé. Un salarié nommé
 * « Rémi » ou un libellé « Absence rémunérée » ne doit pas introduire le
 * premier octet non-ASCII du fichier.
 */
export function toAscii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

export interface SilaeExportIssue {
  matricule: string | null;
  code: string | null;
  message: string;
}

export interface SilaeExportResult {
  csv: string;
  lineCount: number;
}

/**
 * Contrôles préalables — PLAN.md §8.3.
 *
 * Un export partiel est pire qu'un export refusé : il se charge sans erreur et
 * la paie est fausse pour les salariés absents du fichier. D'où un refus
 * explicite qui **liste** les manques.
 */
export function checkSilaeLines(lines: SilaeLine[]): SilaeExportIssue[] {
  const issues: SilaeExportIssue[] = [];

  for (const line of lines) {
    if (!line.matricule.trim()) {
      issues.push({
        matricule: null,
        code: line.code,
        message: 'Matricule Silae manquant : ce salarié ne peut pas être exporté.',
      });
    }
    if (!line.code.trim()) {
      issues.push({
        matricule: line.matricule,
        code: null,
        message: 'Code de paie non renseigné pour cet élément.',
      });
    }
    if (!Number.isFinite(line.value)) {
      issues.push({
        matricule: line.matricule,
        code: line.code,
        message: 'Valeur non numérique.',
      });
    }
    if (line.value < 0) {
      issues.push({
        matricule: line.matricule,
        code: line.code,
        message: 'Valeur négative : Silae attend des décomptes positifs.',
      });
    }
    if (line.endDate < line.startDate) {
      issues.push({
        matricule: line.matricule,
        code: line.code,
        message: 'Date de fin antérieure à la date de début.',
      });
    }
  }

  return issues;
}

/**
 * Sérialise les lignes en CSV Silae.
 *
 * L'ordre est **déterministe** — matricule, puis code — pour que deux exports
 * de la même période produisent le même fichier au bit près. L'import Silae
 * écrase la période pour les salariés concernés : un export doit pouvoir être
 * rejoué sans effet de bord, et son empreinte doit le prouver.
 */
export function formatSilaeCsv(lines: SilaeLine[]): SilaeExportResult {
  const issues = checkSilaeLines(lines);
  if (issues.length > 0) {
    throw new SilaeExportError(issues);
  }

  const sorted = [...lines].sort(
    (a, b) =>
      a.matricule.localeCompare(b.matricule) ||
      a.code.localeCompare(b.code) ||
      a.startDate.localeCompare(b.startDate),
  );

  const rows = sorted.map((line) =>
    [
      toAscii(line.matricule),
      toAscii(line.code),
      formatSilaeValue(line.value, line.kind),
      formatSilaeDate(line.startDate),
      formatSilaeDate(line.endDate),
    ].join(';'),
  );

  // CRLF final compris : c'est ce que produit l'export de référence.
  return {
    csv: [SILAE_HEADER, ...rows].join(CRLF) + CRLF,
    lineCount: rows.length,
  };
}

export class SilaeExportError extends Error {
  readonly issues: SilaeExportIssue[];

  constructor(issues: SilaeExportIssue[]) {
    super(
      `Export Silae refusé : ${issues.length} anomalie${issues.length > 1 ? 's' : ''}.`,
    );
    this.name = 'SilaeExportError';
    this.issues = issues;
  }
}

/** Empreinte du contenu, pour prouver qu'un réexport est identique. */
export async function checksum(csv: string): Promise<string> {
  const bytes = new TextEncoder().encode(csv);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
