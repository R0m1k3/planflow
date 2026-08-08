/**
 * Qui doit porter un second facteur — matrice n° 15.
 *
 * La matrice dit « administrateurs et RH ». Ces deux mots ne désignent pas des
 * rôles nommés — un client renomme ses rôles librement — mais ce que le rôle
 * permet de faire. La règle est donc adossée aux capacités :
 *
 * - `settings.roles.manage` — qui distribue les droits peut se les donner ;
 * - `members.salary.view` — qui lit les rémunérations lit la donnée RH la plus
 *   sensible après la santé.
 *
 * Une liste plutôt qu'une condition dispersée : ce qui déclenche l'obligation
 * doit se lire d'un seul endroit.
 */
export const MFA_REQUIRED_CAPABILITIES = [
  'settings.roles.manage',
  'members.salary.view',
] as const;

export function mfaRequired(permissions: ReadonlySet<string>): boolean {
  return MFA_REQUIRED_CAPABILITIES.some((code) => permissions.has(code));
}
