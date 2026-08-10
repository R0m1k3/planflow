/**
 * Référentiels géographiques du dossier salarié.
 *
 * Les pays sont stockés par leur **code ISO 3166-1 alpha-2**, pas par leur nom.
 * Un nom dépend de la langue de l'interface et se retouche au fil des versions
 * d'ICU ; un code ne bouge pas. Les libellés sont produits à l'affichage par
 * `Intl.DisplayNames`, ce qui évite d'entretenir à la main deux cent cinquante
 * traductions et d'en rater les mises à jour.
 *
 * Les valeurs déjà en base d'avant ce référentiel — du texte libre, « France »
 * le plus souvent — sont rendues telles quelles : elles restent lisibles, et
 * rien ne se perd en attendant qu'un passage sur la fiche les normalise.
 */

/** ISO 3166-1 alpha-2, ordre alphabétique du code. */
export const COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS',
  'BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN',
  'CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE',
  'EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF',
  'GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM',
  'HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM',
  'JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC',
  'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK',
  'ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA',
  'NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG',
  'PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS',
  'ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO',
  'TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI',
  'VN','VU','WF','WS','YE','YT','ZA','ZM','ZW',
] as const;

/**
 * Indicatifs téléphoniques.
 *
 * Volontairement partiels : ceux des pays d'où l'on embauche couramment en
 * France. Le champ accepte de toute façon un numéro international saisi en
 * entier — proposer deux cent cinquante indicatifs allongerait la liste sans
 * rendre la saisie plus sûre.
 */
export const DIAL_CODES: Record<string, string> = {
  FR: '+33', BE: '+32', CH: '+41', LU: '+352', DE: '+49', ES: '+34', IT: '+39',
  PT: '+351', GB: '+44', IE: '+353', NL: '+31', PL: '+48', RO: '+40', BG: '+359',
  AT: '+43', DK: '+45', SE: '+46', NO: '+47', FI: '+358', GR: '+30', HU: '+36',
  CZ: '+420', SK: '+421', HR: '+385', LT: '+370', LV: '+371', EE: '+372',
  DZ: '+213', MA: '+212', TN: '+216', SN: '+221', CI: '+225', ML: '+223',
  CM: '+237', CD: '+243', MG: '+261', HT: '+509', TR: '+90', UA: '+380',
  US: '+1', CA: '+1', BR: '+55', CN: '+86', IN: '+91', JP: '+81',
  GP: '+590', MQ: '+596', GF: '+594', RE: '+262', YT: '+262', NC: '+687',
  PF: '+689',
};

/** Indicatif le plus courant ici : la saisie part de là. */
export const DEFAULT_DIAL_COUNTRY = 'FR';

const displayNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['fr'], { type: 'region' })
    : null;

/**
 * Libellé d'un pays.
 *
 * Rend la valeur telle quelle quand elle n'est pas un code connu : c'est le cas
 * des dossiers saisis avant ce référentiel, et les blanchir serait pire que de
 * les laisser en texte libre.
 */
export function countryLabel(value: string | null): string | null {
  if (!value) return null;
  if (!/^[A-Z]{2}$/.test(value)) return value;
  return displayNames?.of(value) ?? value;
}

/** Liste triée pour les menus déroulants, dans l'ordre alphabétique français. */
export function countryOptions(): Array<readonly [string, string]> {
  return COUNTRY_CODES.map(
    (code) => [code, countryLabel(code) ?? code] as const,
  ).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
}

/**
 * Départements français, Corse et outre-mer compris.
 *
 * Stockés par leur code : « 2A » et « 2B » ne sont pas des nombres, et le
 * département de naissance sert à la déclaration sociale, qui attend le code.
 */
export const DEPARTMENTS: Array<readonly [string, string]> = [
  ['01', 'Ain'], ['02', 'Aisne'], ['03', 'Allier'],
  ['04', 'Alpes-de-Haute-Provence'], ['05', 'Hautes-Alpes'],
  ['06', 'Alpes-Maritimes'], ['07', 'Ardèche'], ['08', 'Ardennes'],
  ['09', 'Ariège'], ['10', 'Aube'], ['11', 'Aude'], ['12', 'Aveyron'],
  ['13', 'Bouches-du-Rhône'], ['14', 'Calvados'], ['15', 'Cantal'],
  ['16', 'Charente'], ['17', 'Charente-Maritime'], ['18', 'Cher'],
  ['19', 'Corrèze'], ['2A', 'Corse-du-Sud'], ['2B', 'Haute-Corse'],
  ['21', "Côte-d'Or"], ['22', "Côtes-d'Armor"], ['23', 'Creuse'],
  ['24', 'Dordogne'], ['25', 'Doubs'], ['26', 'Drôme'], ['27', 'Eure'],
  ['28', 'Eure-et-Loir'], ['29', 'Finistère'], ['30', 'Gard'],
  ['31', 'Haute-Garonne'], ['32', 'Gers'], ['33', 'Gironde'],
  ['34', 'Hérault'], ['35', 'Ille-et-Vilaine'], ['36', 'Indre'],
  ['37', 'Indre-et-Loire'], ['38', 'Isère'], ['39', 'Jura'],
  ['40', 'Landes'], ['41', 'Loir-et-Cher'], ['42', 'Loire'],
  ['43', 'Haute-Loire'], ['44', 'Loire-Atlantique'], ['45', 'Loiret'],
  ['46', 'Lot'], ['47', 'Lot-et-Garonne'], ['48', 'Lozère'],
  ['49', 'Maine-et-Loire'], ['50', 'Manche'], ['51', 'Marne'],
  ['52', 'Haute-Marne'], ['53', 'Mayenne'], ['54', 'Meurthe-et-Moselle'],
  ['55', 'Meuse'], ['56', 'Morbihan'], ['57', 'Moselle'], ['58', 'Nièvre'],
  ['59', 'Nord'], ['60', 'Oise'], ['61', 'Orne'], ['62', 'Pas-de-Calais'],
  ['63', 'Puy-de-Dôme'], ['64', 'Pyrénées-Atlantiques'],
  ['65', 'Hautes-Pyrénées'], ['66', 'Pyrénées-Orientales'],
  ['67', 'Bas-Rhin'], ['68', 'Haut-Rhin'], ['69', 'Rhône'],
  ['70', 'Haute-Saône'], ['71', 'Saône-et-Loire'], ['72', 'Sarthe'],
  ['73', 'Savoie'], ['74', 'Haute-Savoie'], ['75', 'Paris'],
  ['76', 'Seine-Maritime'], ['77', 'Seine-et-Marne'], ['78', 'Yvelines'],
  ['79', 'Deux-Sèvres'], ['80', 'Somme'], ['81', 'Tarn'],
  ['82', 'Tarn-et-Garonne'], ['83', 'Var'], ['84', 'Vaucluse'],
  ['85', 'Vendée'], ['86', 'Vienne'], ['87', 'Haute-Vienne'],
  ['88', 'Vosges'], ['89', 'Yonne'], ['90', 'Territoire de Belfort'],
  ['91', 'Essonne'], ['92', 'Hauts-de-Seine'], ['93', 'Seine-Saint-Denis'],
  ['94', 'Val-de-Marne'], ['95', "Val-d'Oise"],
  ['971', 'Guadeloupe'], ['972', 'Martinique'], ['973', 'Guyane'],
  ['974', 'La Réunion'], ['976', 'Mayotte'],
  ['975', 'Saint-Pierre-et-Miquelon'], ['977', 'Saint-Barthélemy'],
  ['978', 'Saint-Martin'], ['984', 'Terres australes et antarctiques'],
  ['986', 'Wallis-et-Futuna'], ['987', 'Polynésie française'],
  ['988', 'Nouvelle-Calédonie'], ['989', 'Clipperton'],
];

const DEPARTMENT_NAMES = new Map(DEPARTMENTS);

export function departmentLabel(value: string | null): string | null {
  if (!value) return null;
  const name = DEPARTMENT_NAMES.get(value);
  return name ? `${value} - ${name}` : value;
}

/** Options du menu, au format « 54 - Meurthe-et-Moselle ». */
export function departmentOptions(): Array<readonly [string, string]> {
  return DEPARTMENTS.map(([code, name]) => [code, `${code} - ${name}`] as const);
}

export function isKnownCountry(value: string): boolean {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}

/**
 * Ramène une valeur héritée à son code.
 *
 * Les dossiers saisis avant ce référentiel portent « France » en toutes
 * lettres. Sans cette reconnaissance, le menu déroulant ne trouverait pas la
 * valeur, retomberait sur « Non renseigné », et le premier enregistrement
 * effacerait une information exacte.
 */
export function toCountryCode(value: string | null): string {
  if (!value) return '';
  if (isKnownCountry(value)) return value;
  const needle = value.trim().toLocaleLowerCase('fr');
  const match = COUNTRY_CODES.find(
    (code) => countryLabel(code)?.toLocaleLowerCase('fr') === needle,
  );
  return match ?? '';
}

export function isKnownDepartment(value: string): boolean {
  return DEPARTMENT_NAMES.has(value);
}

/**
 * Découpe un numéro enregistré en indicatif et reste.
 *
 * L'indicatif le plus long l'emporte : « +1 » préfixe « +1 » mais aussi
 * « +1242 », et tester dans l'ordre de la table donnerait le mauvais pays.
 */
export function splitDial(value: string): { dial: string; rest: string } {
  const trimmed = value.trim();
  const dials = [...new Set(Object.values(DIAL_CODES))].sort(
    (a, b) => b.length - a.length,
  );
  const found = dials.find((dial) => trimmed.startsWith(dial));
  if (!found) return { dial: DIAL_CODES[DEFAULT_DIAL_COUNTRY] as string, rest: trimmed };
  return { dial: found, rest: trimmed.slice(found.length).trim() };
}
