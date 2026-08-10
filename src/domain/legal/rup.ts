/**
 * Registre unique du personnel — articles L1221-13 et D1221-23 du code du
 * travail.
 *
 * Tenu par établissement et non par entreprise : c'est l'inspection d'un
 * établissement donné qui le réclame, et un registre global ne répondrait pas
 * à la demande.
 *
 * Les mentions sont fixées par le texte. Elles sont énumérées ici plutôt que
 * dispersées dans le rendu, pour qu'une relecture juridique porte sur un seul
 * endroit.
 */

export interface RupPerson {
  lastName: string;
  firstName: string;
  /** Mention exigée. Non collectée par PlanFlow à ce jour. */
  sex: string | null;
  nationality: string | null;
  birthDate: Date | null;
  /** Emploi tenu, tel que porté par le contrat. */
  jobTitle: string | null;
  qualification: string | null;
  contractLabel: string | null;
  entryDate: Date | null;
  exitDate: Date | null;
}

export interface RupColumn {
  key: keyof RupPerson;
  label: string;
  /** Part de la largeur utile. La somme vaut 1. */
  width: number;
}

/**
 * L'ordre suit celui du texte réglementaire : identité, puis situation, puis
 * dates. Un registre réordonné se relit mal en regard de l'article.
 */
export const RUP_COLUMNS: RupColumn[] = [
  { key: 'lastName', label: 'Nom', width: 0.13 },
  { key: 'firstName', label: 'Prénom', width: 0.11 },
  { key: 'sex', label: 'Sexe', width: 0.05 },
  { key: 'nationality', label: 'Nationalité', width: 0.1 },
  { key: 'birthDate', label: 'Date de naissance', width: 0.1 },
  { key: 'jobTitle', label: 'Emploi', width: 0.14 },
  { key: 'qualification', label: 'Qualification', width: 0.11 },
  { key: 'contractLabel', label: 'Contrat', width: 0.08 },
  { key: 'entryDate', label: 'Entrée', width: 0.09 },
  { key: 'exitDate', label: 'Sortie', width: 0.09 },
];

/**
 * Mentions obligatoires manquantes pour une personne.
 *
 * La date de sortie est exclue : son absence signifie que le salarié est
 * toujours présent, ce qui est une information et non un oubli.
 */
export function missingMentions(person: RupPerson): string[] {
  return RUP_COLUMNS.filter((column) => {
    if (column.key === 'exitDate') return false;
    const value = person[column.key];
    return value === null || value === '';
  }).map((column) => column.label);
}

/**
 * Une contravention par salarié concerné, et non une par registre : c'est ce
 * qui justifie de compter les personnes plutôt que les champs.
 */
export function peopleWithGaps(people: RupPerson[]): number {
  return people.filter((person) => missingMentions(person).length > 0).length;
}
