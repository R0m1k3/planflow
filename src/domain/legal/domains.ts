/**
 * Domaines du registre de paramétrage juridique — matrice, section
 * « Paramétrage juridique minimal à faire signer avant migration ».
 *
 * Dans son propre module car un fichier « use server » ne peut exporter que des
 * fonctions asynchrones, et ces constantes sont aussi lues côté client.
 */
export const LEGAL_DOMAINS = [
  { key: 'identite', label: 'Identité juridique' },
  { key: 'populations', label: 'Populations' },
  { key: 'temps', label: 'Temps' },
  { key: 'remuneration', label: 'Rémunération' },
  { key: 'absences', label: 'Absences' },
  { key: 'paie', label: 'Paie et déclarations' },
  { key: 'vie-privee', label: 'Vie privée' },
  { key: 'securite', label: 'Sécurité' },
] as const;

export type LegalDomainKey = (typeof LEGAL_DOMAINS)[number]['key'];

export const LEGAL_DOMAIN_KEYS: readonly string[] = LEGAL_DOMAINS.map(
  (domain) => domain.key,
);
