/**
 * Contrôles au démarrage.
 *
 * Next.js appelle `register()` une fois, au lancement du serveur.
 */
export async function register(): Promise<void> {
  // `instrumentation` est aussi chargée par le runtime edge, où ni Prisma ni
  // les sockets PostgreSQL n'existent.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { checkTenantIsolation } = await import('@/server/db-guard');
  const { unscoped } = await import('@/server/tenant');

  const isolation = await checkTenantIsolation().catch((error: unknown) => {
    console.error('Contrôle d’isolation impossible :', error);
    return null;
  });

  if (!isolation || isolation.ok) return;

  /*
   * Le compte de connexion contourne la row-level security.
   *
   * Refuser de démarrer se justifie **dès qu'il y a plus d'un compte** : c'est
   * alors une fuite entre clients qui devient possible, et aucune donnée ne
   * vaut de tourner ainsi. Avec un compte unique — le cas d'une installation
   * auto-hébergée ordinaire — il n'y a rien à faire fuir vers un voisin qui
   * n'existe pas, et bloquer le démarrage fermerait l'accès de l'entreprise à
   * ses propres données pour un risque théorique.
   *
   * Dans les deux cas l'avertissement est écrit à chaque démarrage, et
   * `/api/sante` rapporte `tenantIsolation: weakened`.
   */
  const accounts = await unscoped()
    .account.count()
    .catch(() => 0);

  const message = `Isolation multi-tenant affaiblie — ${isolation.message}`;

  if (accounts > 1) {
    throw new Error(
      `${message} La base porte ${accounts} comptes : démarrer ainsi exposerait les données de l'un à l'autre.`,
    );
  }

  console.warn(
    `\n⚠  ${message}\n   Un seul compte en base : le démarrage se poursuit, mais corrigez la configuration.\n   Voir README, « Configuration de la base — à ne pas rater ».\n`,
  );
}
