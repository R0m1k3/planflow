/**
 * Modèles de documents — PLAN.md §4.7 et §9.
 *
 * Un modèle est un corps de texte avec des variables `{{cle}}`. Le rendu se
 * fait ici, dans le domaine, pour trois raisons :
 *
 * 1. **Une variable inconnue n'est jamais silencieuse.** Un `{{salire}}` mal
 *    orthographié doit faire échouer le rendu, pas produire une attestation
 *    trouée. Une pièce remise à un salarié avec un blanc à la place de son
 *    salaire est un document faux, pas un document incomplet.
 * 2. **Les variables sont scopées par établissement.** La même attestation ne
 *    porte pas la même raison sociale ni le même SIRET d'un magasin à l'autre ;
 *    le contexte de résolution est celui de l'établissement du contrat.
 * 3. Le corps est de l'HTML rédigé par un administrateur du compte. Il est
 *    **échappé à l'insertion des valeurs**, jamais à l'écriture : c'est la
 *    valeur venue du dossier qui pourrait porter un chevron, pas le gabarit.
 */

export interface TemplateField {
  key: string;
  label: string;
  /** D'où vient la valeur : salarié, contrat ou établissement. */
  scope: 'employee' | 'contract' | 'location';
}

/**
 * Variables offertes à la rédaction.
 *
 * Liste fermée : un modèle ne peut référencer que ce que l'application sait
 * résoudre. Ouvrir la syntaxe à des expressions transformerait un écran de
 * réglage en langage de programmation, avec la surface d'attaque qui va avec.
 */
export const TEMPLATE_FIELDS: TemplateField[] = [
  { key: 'salarie.nom', label: 'Nom du salarié', scope: 'employee' },
  { key: 'salarie.prenom', label: 'Prénom du salarié', scope: 'employee' },
  { key: 'salarie.matricule', label: 'Matricule', scope: 'employee' },
  { key: 'contrat.type', label: 'Type de contrat', scope: 'contract' },
  { key: 'contrat.debut', label: 'Date de début', scope: 'contract' },
  { key: 'contrat.fin', label: 'Date de fin', scope: 'contract' },
  { key: 'contrat.emploi', label: 'Emploi', scope: 'contract' },
  {
    key: 'contrat.heures',
    label: 'Durée hebdomadaire',
    scope: 'contract',
  },
  { key: 'etablissement.nom', label: 'Établissement', scope: 'location' },
  { key: 'etablissement.siret', label: 'SIRET', scope: 'location' },
  { key: 'date.jour', label: 'Date du jour', scope: 'location' },
];

export const TEMPLATE_FIELD_KEYS: string[] = TEMPLATE_FIELDS.map(
  (field) => field.key,
);

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g;

/** Variables citées par un corps, dans l'ordre, sans doublon. */
export function referencedFields(bodyHtml: string): string[] {
  const found = new Set<string>();
  for (const match of bodyHtml.matchAll(PLACEHOLDER)) {
    const key = match[1];
    if (key) found.add(key);
  }
  return [...found];
}

/** Variables citées mais que l'application ne sait pas résoudre. */
export function unknownFields(bodyHtml: string): string[] {
  return referencedFields(bodyHtml).filter(
    (key) => !TEMPLATE_FIELD_KEYS.includes(key),
  );
}

/**
 * Échappement HTML des valeurs insérées.
 *
 * Un nom de famille contenant `&` ou une apostrophe typographique doit sortir
 * tel quel ; une valeur venue d'un import mal nettoyé ne doit pas pouvoir
 * ouvrir une balise.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export class MissingTemplateValue extends Error {
  constructor(public readonly keys: string[]) {
    super(
      `Le modèle cite des variables sans valeur : ${keys.join(', ')}. Complétez le dossier avant de générer la pièce.`,
    );
    this.name = 'MissingTemplateValue';
  }
}

/**
 * Rend un modèle avec les valeurs fournies.
 *
 * Lève dès qu'une variable citée n'a pas de valeur. Produire l'attestation avec
 * un blanc serait pire que de refuser : le blanc se remarque à la relecture une
 * fois sur deux, et la pièce part signée.
 */
export function renderTemplate(
  bodyHtml: string,
  values: Record<string, string | null | undefined>,
): string {
  const missing = referencedFields(bodyHtml).filter(
    (key) => values[key] === null || values[key] === undefined || values[key] === '',
  );
  if (missing.length > 0) throw new MissingTemplateValue(missing);

  return bodyHtml.replace(PLACEHOLDER, (_match, key: string) =>
    escapeHtml(String(values[key])),
  );
}
