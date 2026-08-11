/**
 * Pays et nationalités — pour le dossier salarié et le registre du personnel.
 *
 * Liste fermée plutôt que champ libre. « France », « FRANCE », « Française »,
 * « FR » et « france » désignaient la même chose et se retrouvaient toutes en
 * base ; le registre unique du personnel les imprime telles quelles, et un
 * contrôle y lit cinq pays.
 *
 * Le **code ISO 3166-1 alpha-2** est stocké, jamais le libellé : il ne change
 * pas d'orthographe, tient dans deux caractères, et c'est lui que reprennent
 * les déclarations sociales. Le libellé reste un affichage.
 *
 * La liste couvre les nationalités rencontrées dans un commerce de détail
 * français : l'Europe, le pourtour méditerranéen, l'Afrique francophone, et les
 * principaux pays d'origine relevés par l'INSEE. Elle n'est pas universelle et
 * ne prétend pas l'être — un pays absent s'ajoute ici, en une ligne, plutôt que
 * de rouvrir la saisie libre pour tout le monde.
 */

export interface Country {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** Gentilé au féminin singulier, forme retenue au registre. */
  nationality: string;
}

export const COUNTRIES: readonly Country[] = [
  { code: 'FR', name: 'France', nationality: 'Française' },
  { code: 'DE', name: 'Allemagne', nationality: 'Allemande' },
  { code: 'AD', name: 'Andorre', nationality: 'Andorrane' },
  { code: 'AO', name: 'Angola', nationality: 'Angolaise' },
  { code: 'DZ', name: 'Algérie', nationality: 'Algérienne' },
  { code: 'AR', name: 'Argentine', nationality: 'Argentine' },
  { code: 'AM', name: 'Arménie', nationality: 'Arménienne' },
  { code: 'AU', name: 'Australie', nationality: 'Australienne' },
  { code: 'AT', name: 'Autriche', nationality: 'Autrichienne' },
  { code: 'BE', name: 'Belgique', nationality: 'Belge' },
  { code: 'BJ', name: 'Bénin', nationality: 'Béninoise' },
  { code: 'BY', name: 'Biélorussie', nationality: 'Biélorusse' },
  { code: 'BO', name: 'Bolivie', nationality: 'Bolivienne' },
  { code: 'BA', name: 'Bosnie-Herzégovine', nationality: 'Bosnienne' },
  { code: 'BR', name: 'Brésil', nationality: 'Brésilienne' },
  { code: 'BG', name: 'Bulgarie', nationality: 'Bulgare' },
  { code: 'BF', name: 'Burkina Faso', nationality: 'Burkinabè' },
  { code: 'KH', name: 'Cambodge', nationality: 'Cambodgienne' },
  { code: 'CM', name: 'Cameroun', nationality: 'Camerounaise' },
  { code: 'CA', name: 'Canada', nationality: 'Canadienne' },
  { code: 'CV', name: 'Cap-Vert', nationality: 'Cap-verdienne' },
  { code: 'CL', name: 'Chili', nationality: 'Chilienne' },
  { code: 'CN', name: 'Chine', nationality: 'Chinoise' },
  { code: 'CY', name: 'Chypre', nationality: 'Chypriote' },
  { code: 'CO', name: 'Colombie', nationality: 'Colombienne' },
  { code: 'KM', name: 'Comores', nationality: 'Comorienne' },
  { code: 'CG', name: 'Congo', nationality: 'Congolaise' },
  { code: 'CD', name: 'Congo (RDC)', nationality: 'Congolaise (RDC)' },
  { code: 'KR', name: 'Corée du Sud', nationality: 'Sud-coréenne' },
  { code: 'CI', name: "Côte d'Ivoire", nationality: 'Ivoirienne' },
  { code: 'HR', name: 'Croatie', nationality: 'Croate' },
  { code: 'DK', name: 'Danemark', nationality: 'Danoise' },
  { code: 'DJ', name: 'Djibouti', nationality: 'Djiboutienne' },
  { code: 'EG', name: 'Égypte', nationality: 'Égyptienne' },
  { code: 'AE', name: 'Émirats arabes unis', nationality: 'Émirienne' },
  { code: 'EC', name: 'Équateur', nationality: 'Équatorienne' },
  { code: 'ES', name: 'Espagne', nationality: 'Espagnole' },
  { code: 'EE', name: 'Estonie', nationality: 'Estonienne' },
  { code: 'US', name: 'États-Unis', nationality: 'Américaine' },
  { code: 'ET', name: 'Éthiopie', nationality: 'Éthiopienne' },
  { code: 'FI', name: 'Finlande', nationality: 'Finlandaise' },
  { code: 'GA', name: 'Gabon', nationality: 'Gabonaise' },
  { code: 'GE', name: 'Géorgie', nationality: 'Géorgienne' },
  { code: 'GH', name: 'Ghana', nationality: 'Ghanéenne' },
  { code: 'GR', name: 'Grèce', nationality: 'Grecque' },
  { code: 'GN', name: 'Guinée', nationality: 'Guinéenne' },
  { code: 'HT', name: 'Haïti', nationality: 'Haïtienne' },
  { code: 'HU', name: 'Hongrie', nationality: 'Hongroise' },
  { code: 'IN', name: 'Inde', nationality: 'Indienne' },
  { code: 'ID', name: 'Indonésie', nationality: 'Indonésienne' },
  { code: 'IQ', name: 'Irak', nationality: 'Irakienne' },
  { code: 'IR', name: 'Iran', nationality: 'Iranienne' },
  { code: 'IE', name: 'Irlande', nationality: 'Irlandaise' },
  { code: 'IS', name: 'Islande', nationality: 'Islandaise' },
  { code: 'IL', name: 'Israël', nationality: 'Israélienne' },
  { code: 'IT', name: 'Italie', nationality: 'Italienne' },
  { code: 'JP', name: 'Japon', nationality: 'Japonaise' },
  { code: 'JO', name: 'Jordanie', nationality: 'Jordanienne' },
  { code: 'KZ', name: 'Kazakhstan', nationality: 'Kazakhe' },
  { code: 'KE', name: 'Kenya', nationality: 'Kényane' },
  { code: 'XK', name: 'Kosovo', nationality: 'Kosovare' },
  { code: 'LV', name: 'Lettonie', nationality: 'Lettone' },
  { code: 'LB', name: 'Liban', nationality: 'Libanaise' },
  { code: 'LY', name: 'Libye', nationality: 'Libyenne' },
  { code: 'LT', name: 'Lituanie', nationality: 'Lituanienne' },
  { code: 'LU', name: 'Luxembourg', nationality: 'Luxembourgeoise' },
  { code: 'MK', name: 'Macédoine du Nord', nationality: 'Macédonienne' },
  { code: 'MG', name: 'Madagascar', nationality: 'Malgache' },
  { code: 'MY', name: 'Malaisie', nationality: 'Malaisienne' },
  { code: 'ML', name: 'Mali', nationality: 'Malienne' },
  { code: 'MT', name: 'Malte', nationality: 'Maltaise' },
  { code: 'MA', name: 'Maroc', nationality: 'Marocaine' },
  { code: 'MU', name: 'Maurice', nationality: 'Mauricienne' },
  { code: 'MR', name: 'Mauritanie', nationality: 'Mauritanienne' },
  { code: 'MX', name: 'Mexique', nationality: 'Mexicaine' },
  { code: 'MD', name: 'Moldavie', nationality: 'Moldave' },
  { code: 'MC', name: 'Monaco', nationality: 'Monégasque' },
  { code: 'ME', name: 'Monténégro', nationality: 'Monténégrine' },
  { code: 'MZ', name: 'Mozambique', nationality: 'Mozambicaine' },
  { code: 'NE', name: 'Niger', nationality: 'Nigérienne' },
  { code: 'NG', name: 'Nigeria', nationality: 'Nigériane' },
  { code: 'NO', name: 'Norvège', nationality: 'Norvégienne' },
  { code: 'NZ', name: 'Nouvelle-Zélande', nationality: 'Néo-zélandaise' },
  { code: 'PK', name: 'Pakistan', nationality: 'Pakistanaise' },
  { code: 'NL', name: 'Pays-Bas', nationality: 'Néerlandaise' },
  { code: 'PE', name: 'Pérou', nationality: 'Péruvienne' },
  { code: 'PH', name: 'Philippines', nationality: 'Philippine' },
  { code: 'PL', name: 'Pologne', nationality: 'Polonaise' },
  { code: 'PT', name: 'Portugal', nationality: 'Portugaise' },
  { code: 'RO', name: 'Roumanie', nationality: 'Roumaine' },
  { code: 'GB', name: 'Royaume-Uni', nationality: 'Britannique' },
  { code: 'RU', name: 'Russie', nationality: 'Russe' },
  { code: 'RW', name: 'Rwanda', nationality: 'Rwandaise' },
  { code: 'SN', name: 'Sénégal', nationality: 'Sénégalaise' },
  { code: 'RS', name: 'Serbie', nationality: 'Serbe' },
  { code: 'SG', name: 'Singapour', nationality: 'Singapourienne' },
  { code: 'SK', name: 'Slovaquie', nationality: 'Slovaque' },
  { code: 'SI', name: 'Slovénie', nationality: 'Slovène' },
  { code: 'SD', name: 'Soudan', nationality: 'Soudanaise' },
  { code: 'LK', name: 'Sri Lanka', nationality: 'Sri-lankaise' },
  { code: 'SE', name: 'Suède', nationality: 'Suédoise' },
  { code: 'CH', name: 'Suisse', nationality: 'Suisse' },
  { code: 'SY', name: 'Syrie', nationality: 'Syrienne' },
  { code: 'TW', name: 'Taïwan', nationality: 'Taïwanaise' },
  { code: 'TD', name: 'Tchad', nationality: 'Tchadienne' },
  { code: 'CZ', name: 'Tchéquie', nationality: 'Tchèque' },
  { code: 'TH', name: 'Thaïlande', nationality: 'Thaïlandaise' },
  { code: 'TG', name: 'Togo', nationality: 'Togolaise' },
  { code: 'TN', name: 'Tunisie', nationality: 'Tunisienne' },
  { code: 'TR', name: 'Turquie', nationality: 'Turque' },
  { code: 'UA', name: 'Ukraine', nationality: 'Ukrainienne' },
  { code: 'UY', name: 'Uruguay', nationality: 'Uruguayenne' },
  { code: 'VE', name: 'Venezuela', nationality: 'Vénézuélienne' },
  { code: 'VN', name: 'Viêt Nam', nationality: 'Vietnamienne' },
];

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

/**
 * Options du sélecteur de pays : la France en tête, le reste par ordre
 * alphabétique.
 *
 * Placer le pays le plus fréquent en premier évite un défilement à chaque
 * saisie. L'ordre alphabétique ensuite, parce qu'un classement par fréquence
 * supposée serait deviné, et se lirait comme un jugement.
 */
export const COUNTRY_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['FR', 'France'],
  ...COUNTRIES.filter((country) => country.code !== 'FR')
    .map((country) => [country.code, country.name] as const)
    .sort((a, b) => a[1].localeCompare(b[1], 'fr')),
];

/** Mêmes pays, mais nommés par leur gentilé. */
export const NATIONALITY_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['FR', 'Française'],
  ...COUNTRIES.filter((country) => country.code !== 'FR')
    .map((country) => [country.code, country.nationality] as const)
    .sort((a, b) => a[1].localeCompare(b[1], 'fr')),
];

export function countryLabel(code: string | null): string | null {
  if (!code) return null;
  // Les dossiers saisis avant la liste portent un libellé en clair : le rendre
  // tel quel vaut mieux qu'afficher un vide sur une donnée qui existe.
  return BY_CODE.get(code)?.name ?? code;
}

export function nationalityLabel(code: string | null): string | null {
  if (!code) return null;
  return BY_CODE.get(code)?.nationality ?? code;
}

export function isCountryCode(value: string): boolean {
  return BY_CODE.has(value);
}
