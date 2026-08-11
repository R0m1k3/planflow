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
      { id: 'entrees', label: 'Entrées et sorties', href: '/?liste=entrees' },
      { id: 'profils', label: 'Profils incomplets', href: '/?liste=profils' },
      { id: 'titres', label: 'Titres de séjour', href: '/?liste=titres' },
      // Ancre plutôt que route : le calendrier appartient à la section Congés,
      // et deux entrées allumées pour un même écran rendent la navigation
      // muette.
      {
        id: 'soldes-cp',
        label: 'Compteurs de congés payés',
        href: '/absences/calendrier#compteurs',
      },
    ],
  },
  {
    id: 'plannings',
    label: 'Plannings',
    items: [
      { id: 'semaine', label: 'Vue semaine', href: '/planning/semaine' },
      { id: 'jour', label: 'Vue jour', href: '/planning/jour' },
      { id: 'etiquettes', label: 'Vue par poste', href: '/planning/etiquettes' },
      { id: 'mois', label: 'Vue mois', href: '/planning/mois' },
      { id: 'besoins', label: 'Besoins non couverts' },
      { id: 'modeles', label: "Modèles d'ouverture" },
    ],
  },
  {
    id: 'equipe',
    label: 'Équipe',
    items: [
      { id: 'membres', label: 'Membres', href: '/equipe' },
      { id: 'contrats', label: 'Modifications de contrat' },
    ],
  },
  {
    id: 'conges',
    label: 'Congés',
    items: [
      {
        id: 'calendrier',
        label: 'Calendrier des absences',
        href: '/absences/calendrier',
      },
      { id: 'attente', label: 'Demandes à traiter', href: '/absences/a-traiter' },
      { id: 'traitees', label: 'Traitées', href: '/absences/traitees' },
      { id: 'expirees', label: 'Expirées', href: '/absences/expirees' },
      { id: 'politiques', label: 'Politiques de congés' },
    ],
  },
  {
    id: 'rapports',
    label: 'Rapports',
    items: [
      { id: 'heures', label: 'Heures travaillées', href: '/rapports/heures' },
      { id: 'paie', label: 'Préparation de paie', href: '/paie' },
      { id: 'periodes', label: 'Périodes de paie', href: '/paie/periodes' },
      { id: 'silae', label: 'Codes Silae', href: '/paie/silae' },
      { id: 'activite', label: "Journal d'activité" },
    ],
  },
  {
    id: 'reglages',
    label: 'Réglages',
    items: [
      { id: 'sites', label: 'Établissements', href: '/reglages/etablissements' },
      { id: 'registre', label: 'Registre de paramétrage', href: '/reglages/registre' },
      { id: 'email', label: 'Envoi de courrier', href: '/reglages/email' },
      { id: 'securite', label: 'Sécurité', href: '/reglages/securite' },
      {
        id: 'conservation',
        label: 'Durées de conservation',
        href: '/reglages/conservation',
      },
      {
        id: 'convention',
        label: 'Convention collective',
        href: '/reglages/convention',
      },
      { id: 'emplois', label: 'Emplois', href: '/reglages/emplois' },
      { id: 'etiquettes', label: 'Étiquettes', href: '/reglages/etiquettes' },
      {
        id: 'types-absence',
        label: 'Types d’absence',
        href: '/reglages/types-absence',
      },
      { id: 'roles', label: 'Rôles et permissions', href: '/reglages/roles' },
    ],
  },
];

/** Section contenant la route donnée, ou la première par défaut. */
export function sectionForPath(pathname: string): NavSection {
  const active = activeItem(pathname);
  const match = active
    ? NAVIGATION.find((section) =>
        section.items.some((item) => item.id === active.id),
      )
    : undefined;
  return match ?? (NAVIGATION[0] as NavSection);
}

/** Chemin vers l'écran d'attente d'une entrée non encore construite. */
export function placeholderHref(label: string): string {
  return `/bientot?ecran=${encodeURIComponent(label)}`;
}

/**
 * Destination d'un onglet de section.
 *
 * Une section dont aucun écran n'est construit ne doit pas renvoyer à
 * l'accueil : le clic donnerait l'impression que l'onglet est cassé. Elle mène
 * à l'écran d'attente de sa première entrée, qui dit ce qui viendra là.
 */
export function sectionHref(section: NavSection): string {
  const built = section.items.find((item) => item.href);
  if (built?.href) return built.href;
  const first = section.items[0];
  return first ? placeholderHref(first.label) : '/';
}

export function matches(href: string, pathname: string): boolean {
  // Un lien d'ancre pointe à l'intérieur d'une page déjà représentée par une
  // autre entrée : il ne concourt pas.
  if (href.includes('#')) return false;

  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Entrée à mettre en évidence pour une route donnée.
 *
 * `/equipe` et `/equipe/camille-ferrand` correspondent tous deux quand on est
 * sur une fiche. On retient la **plus spécifique** : deux entrées allumées à la
 * fois, et le repère de position ne repère plus rien.
 */
export function activeItem(pathname: string): NavItem | undefined {
  return NAVIGATION.flatMap((section) => section.items)
    .filter((item) => item.href && matches(item.href, pathname))
    .sort((a, b) => (b.href as string).length - (a.href as string).length)[0];
}

export function isActive(href: string, pathname: string): boolean {
  const active = activeItem(pathname);
  return active?.href === href;
}
