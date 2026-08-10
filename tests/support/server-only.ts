/**
 * Doublure de `server-only`.
 *
 * Le paquet est fourni par Next au moment du bundling : il n'existe pas dans
 * `node_modules`, et son seul rôle est de faire échouer la compilation d'un
 * module serveur importé depuis un composant client. Hors de Next, il n'a rien
 * à garantir — mais son absence empêcherait de tester les modules qui le
 * déclarent.
 */
export {};
