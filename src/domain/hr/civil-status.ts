/**
 * Libellés d'état civil.
 *
 * Les codes vivent en base, les mots à l'écran. Les séparer évite qu'un
 * changement de formulation devienne une migration, et qu'une valeur stockée
 * dépende de la langue de l'interface.
 */

export const GENDERS = [
  ['FEMALE', 'Femme'],
  ['MALE', 'Homme'],
  ['UNSPECIFIED', 'Non précisé'],
] as const;

export const MARITAL_STATUSES = [
  ['SINGLE', 'Célibataire'],
  ['MARRIED', 'Marié(e)'],
  ['PACS', 'Pacsé(e)'],
  ['COHABITING', 'Concubinage'],
  ['DIVORCED', 'Divorcé(e)'],
  ['WIDOWED', 'Veuf(ve)'],
] as const;

export type GenderCode = (typeof GENDERS)[number][0];
export type MaritalStatusCode = (typeof MARITAL_STATUSES)[number][0];

const GENDER_LABELS = new Map<string, string>(GENDERS);
const MARITAL_LABELS = new Map<string, string>(MARITAL_STATUSES);

export function genderLabel(code: string | null): string | null {
  return code ? (GENDER_LABELS.get(code) ?? code) : null;
}

export function maritalStatusLabel(code: string | null): string | null {
  return code ? (MARITAL_LABELS.get(code) ?? code) : null;
}

/**
 * Abrégé porté au registre du personnel.
 *
 * La colonne y est étroite et la mention se lit d'un coup d'œil ; « Non
 * précisé » y devient un tiret, qui dit la même chose sans déborder.
 */
export function genderShort(code: string | null): string | null {
  if (code === 'FEMALE') return 'F';
  if (code === 'MALE') return 'M';
  return null;
}

/**
 * Matricule proposé à l'embauche.
 *
 * Une lettre et un rang, et non un horodatage : un matricule se dicte au
 * téléphone et se recopie à la main. Le rang suit le dernier attribué de la
 * même forme, ce qui laisse coexister les matricules repris d'un autre outil.
 */
export function nextEmployeeNumber(
  existing: string[],
  prefix = 'E',
): string {
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  const highest = existing.reduce((max, value) => {
    const match = pattern.exec(value.trim());
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}
