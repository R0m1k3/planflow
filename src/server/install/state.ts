import { unscoped } from '@/server/tenant';

/**
 * Cette instance a-t-elle déjà été installée ? — PLAN.md §5.
 *
 * La question se pose à chaque affichage de la connexion et de l'application,
 * c'est-à-dire à chaque requête. Elle ne peut pas être posée à `Account` : la
 * politique RLS n'y laisse voir que le compte courant, si bien qu'une instance
 * installée paraîtrait vierge à qui n'a pas de session — et l'écran
 * d'installation, qui crée un propriétaire, se rouvrirait à tout venant. D'où
 * la table `Installation`, délibérément hors RLS.
 */

/**
 * Mémorisation **du seul résultat « installée »**.
 *
 * L'asymétrie est le point : une instance installée ne redevient pas vierge —
 * le trigger `installation_append_only` l'interdit — donc ce résultat ne se
 * périme jamais et la requête peut être évitée. L'inverse ne tient pas : une
 * instance vierge le devient d'un instant à l'autre, et mémoriser cela ferait
 * boucler l'écran d'installation après son propre succès.
 */
let known = false;

export async function isInstalled(): Promise<boolean> {
  if (known) return true;

  const row = await unscoped().installation.findFirst({
    select: { accountId: true },
  });
  known = row !== null;
  return known;
}

/**
 * À appeler après une installation réussie.
 *
 * Sans cela, le premier affichage suivant repasserait par la base pour
 * apprendre ce que le processus vient lui-même d'écrire.
 */
export function markInstalled(): void {
  known = true;
}

/**
 * Remet la mémorisation à zéro. Réservé aux tests, qui installent et
 * désinstallent dans une transaction annulée.
 */
export function forgetInstallationState(): void {
  known = false;
}
