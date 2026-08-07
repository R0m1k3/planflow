/**
 * Emplacement de l'état de session partagé entre les tests.
 *
 * Dans son propre module : le fichier de configuration Playwright ne peut pas
 * importer un fichier qui appelle `test()`.
 */
export const STORAGE_STATE = 'test-results/.auth/direction.json';
