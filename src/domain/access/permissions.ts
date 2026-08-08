/**
 * Catalogue des capacités — PLAN.md §5.
 *
 * Les codes sont **stables** : le produit les référence, les écrans les
 * testent, et un client peut renommer ses rôles sans rien casser. Ajouter une
 * capacité est une migration de données ; en renommer une est une rupture.
 *
 * Forme : `ressource.action.qualificatif`.
 */

export interface PermissionDefinition {
  code: string;
  category: string;
  label: string;
}

export const PERMISSIONS = [
  // --- Planning ------------------------------------------------------------
  ['planning.view', 'Planning', 'Voir les plannings publiés'],
  ['planning.view_unpublished', 'Planning', 'Voir les semaines non publiées'],
  ['planning.create', 'Planning', 'Créer un créneau'],
  ['planning.create_on_published', 'Planning', 'Créer sur une semaine publiée'],
  ['planning.edit', 'Planning', 'Modifier un créneau'],
  ['planning.edit_published', 'Planning', 'Modifier une semaine publiée'],
  ['planning.delete', 'Planning', 'Supprimer un créneau'],
  ['planning.duplicate', 'Planning', 'Dupliquer une semaine'],
  ['planning.publish', 'Planning', 'Publier une semaine'],
  ['planning.unpublish', 'Planning', 'Dépublier une semaine'],
  ['planning.validate', 'Planning', 'Valider une semaine'],
  ['planning.invalidate', 'Planning', 'Invalider une semaine'],
  ['planning.bulk_actions', 'Planning', 'Actions de masse'],
  ['planning.unassigned.view', 'Planning', 'Voir les besoins non couverts'],
  ['planning.alerts.view', 'Planning', 'Voir les alertes de convention'],
  ['planning.alerts.acknowledge', 'Planning', 'Acquitter une alerte'],
  ['planning.counters.view', 'Planning', 'Voir les compteurs et le coût'],
  ['planning.labels.manage', 'Planning', 'Gérer les étiquettes'],
  ['planning.notes.manage', 'Planning', 'Gérer les notes de journée'],
  ['planning.print', 'Planning', 'Imprimer un planning'],

  // --- Personnel -----------------------------------------------------------
  ['members.view', 'Personnel', 'Voir l’annuaire'],
  ['members.create', 'Personnel', 'Créer un salarié'],
  ['members.edit', 'Personnel', 'Modifier un dossier'],
  ['members.archive', 'Personnel', 'Archiver un salarié'],
  ['members.delete', 'Personnel', 'Supprimer un salarié'],
  ['members.salary.view', 'Personnel', 'Voir les rémunérations'],
  ['members.contract.create', 'Personnel', 'Créer un contrat'],
  ['members.contract.edit', 'Personnel', 'Modifier un contrat'],
  ['members.contract.delete_past', 'Personnel', 'Supprimer un contrat passé'],
  ['members.documents.view', 'Personnel', 'Consulter les documents'],
  ['members.documents.manage', 'Personnel', 'Gérer les documents'],
  ['members.register.export', 'Personnel', 'Exporter le registre du personnel'],
  ['members.dpae.check', 'Personnel', 'Contrôler l’éligibilité DPAE'],
  // Distincte de `members.edit` : ouvrir un accès à l'application n'est pas
  // modifier un dossier, et tel client voudra confier l'un sans l'autre.
  ['members.invite', 'Personnel', 'Inviter un salarié à se connecter'],

  // --- Heures --------------------------------------------------------------
  ['hours.view', 'Heures', 'Voir les heures'],
  ['hours.edit_actual', 'Heures', 'Saisir les heures réelles'],
  ['hours.validate', 'Heures', 'Valider les heures'],

  // --- Absences et compteurs ----------------------------------------------
  ['timeoff.view_own', 'Absences', 'Voir ses absences'],
  ['timeoff.view_others', 'Absences', 'Voir les absences des autres'],
  ['timeoff.request', 'Absences', 'Demander une absence'],
  ['timeoff.decide', 'Absences', 'Accepter ou refuser une demande'],
  ['timeoff.delete', 'Absences', 'Supprimer une absence'],
  ['timeoff.bypass_notice', 'Absences', 'Contourner le délai de prévenance'],
  ['timeoff.forecast.view', 'Absences', 'Voir la prévision de solde'],
  ['counters.view_own', 'Absences', 'Voir ses compteurs'],
  ['counters.view_others', 'Absences', 'Voir les compteurs des autres'],
  ['counters.adjust', 'Absences', 'Ajuster un compteur'],

  // --- Paie ----------------------------------------------------------------
  ['payroll.access', 'Paie', 'Accéder à la paie'],
  ['payroll.period.create', 'Paie', 'Créer une période'],
  ['payroll.period.update', 'Paie', 'Modifier une période'],
  ['payroll.period.delete', 'Paie', 'Supprimer une période'],
  ['payroll.period.alternative', 'Paie', 'Créer une période alternative'],
  ['payroll.period.lock', 'Paie', 'Verrouiller une période'],
  ['payroll.period.unlock', 'Paie', 'Déverrouiller une période'],
  ['payroll.export', 'Paie', 'Exporter les variables'],
  ['payroll.export.silae', 'Paie', 'Exporter au format Silae'],
  ['payroll.export.raw', 'Paie', 'Exporter au format brut'],

  // --- Administration ------------------------------------------------------
  ['settings.access', 'Administration', 'Accéder aux réglages'],
  ['settings.locations.manage', 'Administration', 'Gérer les établissements'],
  ['settings.teams.manage', 'Administration', 'Gérer les équipes'],
  ['settings.agreement.manage', 'Administration', 'Gérer la convention'],
  ['settings.jobtitles.manage', 'Administration', 'Gérer les emplois'],
  ['settings.templates.manage', 'Administration', 'Gérer les modèles'],
  ['settings.integrations.manage', 'Administration', 'Gérer les intégrations'],
  ['settings.notifications.manage', 'Administration', 'Gérer les notifications'],
  ['settings.roles.manage', 'Administration', 'Gérer les rôles'],
  ['role_config.assign_owner_level', 'Administration', 'Déléguer le niveau propriétaire'],
  ['audit.view', 'Administration', 'Consulter le journal d’audit'],

  // --- Communication -------------------------------------------------------
  ['articles.view', 'Communication', 'Lire les articles'],
  ['articles.manage', 'Communication', 'Publier des articles'],
  ['conversations.access', 'Communication', 'Accéder à la messagerie'],
] as const satisfies ReadonlyArray<readonly [string, string, string]>;

export type PermissionCode = (typeof PERMISSIONS)[number][0];

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = PERMISSIONS.map(
  ([code, category, label]) => ({ code, category, label }),
);

export const PERMISSION_CODES: string[] = PERMISSION_DEFINITIONS.map(
  (permission) => permission.code,
);

/**
 * Rôles fournis — liste exhaustive relevée à l'audit des menus (PLAN.md §5).
 *
 * Point de départ modifiable par le client : un rôle est une donnée, pas une
 * constante du code. Aucun écran ne doit tester ces clés.
 */
export const SYSTEM_ROLES = [
  { key: 'owner', name: 'Propriétaire' },
  { key: 'admin', name: 'Admin' },
  { key: 'director', name: 'Directeur' },
  { key: 'manager', name: 'Manager' },
  { key: 'employee', name: 'Employé' },
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLES)[number]['key'];

const EMPLOYEE_PERMISSIONS: string[] = [
  'planning.view',
  'timeoff.view_own',
  'timeoff.request',
  'counters.view_own',
  'articles.view',
  'conversations.access',
];

const MANAGER_PERMISSIONS: string[] = [
  ...EMPLOYEE_PERMISSIONS,
  'planning.view_unpublished',
  'planning.create',
  'planning.edit',
  'planning.delete',
  'planning.duplicate',
  'planning.publish',
  'planning.unpublish',
  'planning.validate',
  'planning.invalidate',
  'planning.bulk_actions',
  'planning.unassigned.view',
  'planning.alerts.view',
  'planning.alerts.acknowledge',
  'planning.counters.view',
  'planning.notes.manage',
  'planning.print',
  'members.view',
  'hours.view',
  'hours.edit_actual',
  'hours.validate',
  'timeoff.view_others',
  'timeoff.decide',
  'timeoff.forecast.view',
  'counters.view_others',
];

const DIRECTOR_PERMISSIONS: string[] = [
  ...MANAGER_PERMISSIONS,
  'planning.create_on_published',
  'planning.edit_published',
  'planning.labels.manage',
  'members.create',
  'members.edit',
  'members.archive',
  'members.salary.view',
  'members.contract.create',
  'members.contract.edit',
  'members.documents.view',
  'members.documents.manage',
  'members.register.export',
  'members.dpae.check',
  'members.invite',
  'timeoff.delete',
  'timeoff.bypass_notice',
  'counters.adjust',
  'payroll.access',
  'payroll.period.create',
  'payroll.period.update',
  'payroll.period.lock',
  'payroll.export',
  'payroll.export.silae',
  'settings.access',
  'articles.manage',
];

const ADMIN_PERMISSIONS: string[] = PERMISSION_CODES.filter(
  (code) => code !== 'role_config.assign_owner_level',
);

/** Attribution par défaut. Le client la modifie ensuite depuis les réglages. */
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleKey, string[]> = {
  employee: EMPLOYEE_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  director: DIRECTOR_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  // Seul le propriétaire peut déléguer le niveau propriétaire.
  owner: [...PERMISSION_CODES],
};
