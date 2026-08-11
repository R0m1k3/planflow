/**
 * Dictionnaire des données — matrice de conformité n° 14.
 *
 * « Donnée → finalité → base légale → destinataire → durée », livré comme
 * artefact. Il décrit ce que **cette** application collecte, catégorie par
 * catégorie ; il ne décrit pas le traitement RH de l'entreprise en général.
 *
 * Il vit dans le code et non en base : le contenu suit le schéma, et un
 * dictionnaire tenu à la main dans une table divergerait au premier champ
 * ajouté sans que rien ne le signale. La **durée**, elle, vient de
 * `RetentionPolicy` : elle se paramètre, se justifie et s'audite.
 *
 * `À VALIDER` — l'affectation d'une base légale est une qualification
 * juridique. Les lignes ci-dessous portent la lecture usuelle du traitement de
 * paie et de planning ; elles doivent être confirmées par le responsable de
 * traitement avant d'être opposées à qui que ce soit.
 */

export type LegalBasis =
  | 'contract'
  | 'legal_obligation'
  | 'legitimate_interest'
  | 'consent';

export const LEGAL_BASIS_LABELS: Record<LegalBasis, string> = {
  contract: 'Exécution du contrat de travail',
  legal_obligation: 'Obligation légale',
  legitimate_interest: 'Intérêt légitime',
  consent: 'Consentement',
};

export interface DictionaryEntry {
  /** Catégorie de données, telle qu'un salarié la reconnaîtrait. */
  category: string;
  /** Objets du schéma qui la portent — le lien avec la politique de purge. */
  objectTypes: string[];
  purpose: string;
  basis: LegalBasis;
  recipients: string[];
  /** Vrai pour une catégorie particulière au sens de l'article 9. */
  sensitive: boolean;
  notes?: string;
}

export const DATA_DICTIONARY: DictionaryEntry[] = [
  {
    category: 'État civil et coordonnées',
    objectTypes: ['EmployeeProfile'],
    purpose:
      'Tenue du registre unique du personnel, déclaration préalable à l’embauche, édition des contrats.',
    basis: 'legal_obligation',
    recipients: ['Service RH', 'Cabinet de paie'],
    sensitive: false,
  },
  {
    category: 'Numéro de sécurité sociale',
    objectTypes: ['EmployeeProfile'],
    purpose: 'Déclarations sociales et transmission au logiciel de paie.',
    basis: 'legal_obligation',
    recipients: ['Cabinet de paie'],
    sensitive: false,
    notes:
      'Chiffré au repos. Sa lecture n’est ouverte qu’aux capacités de paie.',
  },
  {
    category: 'Coordonnées bancaires',
    objectTypes: ['EmployeeProfile'],
    purpose: 'Versement du salaire.',
    basis: 'contract',
    recipients: ['Cabinet de paie'],
    sensitive: false,
    notes: 'Chiffrées au repos.',
  },
  {
    category: 'Contrat, rémunération et avenants',
    objectTypes: ['UserContract', 'Amendment'],
    purpose:
      'Exécution et suivi du contrat, calcul des seuils de convention, préparation de la paie.',
    basis: 'contract',
    recipients: ['Service RH', 'Encadrement', 'Cabinet de paie'],
    sensitive: false,
    notes:
      'La rémunération n’est visible qu’avec la capacité `members.salary.view`.',
  },
  {
    category: 'Planning, heures prévues et réalisées',
    objectTypes: ['Shift', 'WeeklySchedule', 'Rest', 'ForfaitDayEntry'],
    purpose:
      'Organisation du travail, contrôle des durées maximales et des repos, variables de paie.',
    basis: 'legal_obligation',
    recipients: ['Encadrement', 'Service RH', 'Cabinet de paie'],
    sensitive: false,
  },
  {
    category: 'Absences et compteurs',
    objectTypes: ['TimeOff', 'Counter', 'LedgerOperation'],
    purpose: 'Gestion des congés, décompte des droits, variables de paie.',
    basis: 'contract',
    recipients: ['Encadrement', 'Service RH', 'Cabinet de paie'],
    sensitive: false,
  },
  {
    category: 'Arrêts de travail et pièces de santé',
    objectTypes: ['Document:SICK_NOTE'],
    purpose:
      'Justification de l’absence et déclaration à la sécurité sociale. Le motif médical n’est pas exploité.',
    basis: 'legal_obligation',
    recipients: ['Service RH'],
    sensitive: true,
    notes:
      'Catégorie particulière (art. 9). Lecture journalisée ; le motif est masqué en vue encadrement.',
  },
  {
    category: 'Titre de séjour et autorisation de travail',
    objectTypes: ['WorkPermit'],
    purpose:
      'Vérification de l’autorisation de travail et suivi des échéances.',
    basis: 'legal_obligation',
    recipients: ['Service RH'],
    sensitive: false,
    notes:
      'Le statut migratoire n’est ni affiché ni exploité au-delà de l’échéance.',
  },
  {
    category: 'Comptes, sessions et second facteur',
    objectTypes: ['User', 'Session', 'MfaRecoveryCode'],
    purpose: 'Authentification, révocation d’accès, sécurité du compte.',
    basis: 'legitimate_interest',
    recipients: ['Administrateurs de l’instance'],
    sensitive: false,
  },
  {
    category: 'Journal d’audit',
    objectTypes: ['AuditLog'],
    purpose:
      'Traçabilité des décisions opposables : contrat, absence, publication, période de paie, permissions.',
    basis: 'legal_obligation',
    recipients: ['Administrateurs', 'Contrôleurs habilités'],
    sensitive: false,
    notes: 'Append-only, imposé par un trigger de base.',
  },
];

/** Catégories particulières, à traiter avec une vigilance distincte. */
export const SENSITIVE_ENTRIES = DATA_DICTIONARY.filter(
  (entry) => entry.sensitive,
);
