/**
 * Modèle de navigation, repris de l'export Claude Design.
 *
 * Deux niveaux : une section dans l'en-tête, ses entrées dans la barre
 * latérale. Les badges portent un décompte à traiter.
 *
 * Les entrées sans `href` correspondent à des écrans du périmètre qui n'ont pas
 * encore d'implémentation : elles restent visibles pour que la navigation
 * reflète le produit réel, et mènent à un écran d'attente explicite plutôt qu'à
 * une page blanche.
 */

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  badge?: string;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    id: 'apercu',
    label: 'Aperçu',
    items: [
      { id: 'taches', label: 'Tâches RH', href: '/' },
      { id: 'entrees', label: 'Entrées et sorties' },
      { id: 'profils', label: 'Profils incomplets', badge: '6' },
      { id: 'soldes-cp', label: 'Compteurs de congés payés' },
    ],
  },
  {
    id: 'plannings',
    label: 'Plannings',
    items: [
      { id: 'semaine', label: 'Vue semaine', href: '/planning/semaine' },
      { id: 'jour', label: 'Vue jour', href: '/planning/jour' },
      { id: 'besoins', label: 'Besoins non couverts', badge: '5' },
      { id: 'modeles', label: "Modèles d'ouverture" },
    ],
  },
  {
    id: 'equipe',
    label: 'Équipe',
    items: [
      { id: 'membres', label: 'Membres', href: '/equipe' },
      { id: 'fiche', label: 'Fiche salarié', href: '/equipe/camille-ferrand' },
      { id: 'contrats', label: 'Modifications de contrat' },
    ],
  },
  {
    id: 'conges',
    label: 'Congés',
    items: [
      { id: 'calendrier', label: 'Calendrier des absences', href: '/conges' },
      { id: 'attente', label: 'Demandes en attente', href: '/conges#attente', badge: '3' },
      { id: 'politiques', label: 'Politiques de congés' },
    ],
  },
  {
    id: 'rapports',
    label: 'Rapports',
    items: [
      { id: 'heures', label: 'Heures travaillées' },
      { id: 'paie', label: 'Préparation de paie' },
      { id: 'activite', label: "Journal d'activité" },
    ],
  },
  {
    id: 'reglages',
    label: 'Réglages',
    items: [
      { id: 'convention', label: 'Convention collective' },
      { id: 'postes', label: 'Postes et étiquettes' },
      { id: 'sites', label: 'Établissements' },
      { id: 'roles', label: 'Rôles et permissions' },
    ],
  },
];

/** Section contenant la route donnée, ou la première par défaut. */
export function sectionForPath(pathname: string): NavSection {
  const match = NAVIGATION.find((section) =>
    section.items.some((item) => item.href && isActive(item.href, pathname)),
  );
  return match ?? (NAVIGATION[0] as NavSection);
}

export function isActive(href: string, pathname: string): boolean {
  const base = href.split('#')[0] ?? href;
  if (base === '/') return pathname === '/';
  return pathname === base || pathname.startsWith(`${base}/`);
}
