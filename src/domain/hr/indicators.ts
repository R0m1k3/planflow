/**
 * Indicateurs RH — PLAN.md §WP-09.
 *
 * Une règle gouverne ce module : **un indicateur doit être explicable**. Chaque
 * fonction rend donc non seulement un chiffre mais les identifiants qui le
 * composent, pour que l'écran puisse mener aux lignes sources. Un taux de
 * turnover que personne ne peut ouvrir ne se corrige pas — il se conteste.
 *
 * Deuxième règle, moins visible mais plus coûteuse quand elle manque : les
 * échéances se calculent en **fenêtres**, pas en dates dépassées. Un titre de
 * séjour qui expire dans trois semaines doit remonter avant l'expiration, pas
 * après.
 */

export interface HeadcountInput {
  membershipId: string;
  /** Début du contrat, date civile. */
  startDate: string;
  /** Fin du contrat, `null` si en cours. */
  endDate: string | null;
}

export interface HeadcountResult {
  /** Effectif présent en fin de période. */
  closing: number;
  entries: string[];
  exits: string[];
  /** Effectif moyen : (début + fin) / 2. */
  average: number;
}

/**
 * Effectif, entrées et sorties sur une période.
 *
 * Un contrat compte comme présent dès lors qu'il **recouvre** la période : un
 * salarié entré le 3 et sorti le 28 a été présent, même s'il n'était là ni au
 * premier ni au dernier jour.
 */
export function headcount(
  contracts: HeadcountInput[],
  from: string,
  to: string,
): HeadcountResult {
  const present = (isoDate: string) =>
    contracts.filter(
      (contract) =>
        contract.startDate <= isoDate &&
        (contract.endDate === null || contract.endDate >= isoDate),
    ).length;

  return {
    closing: present(to),
    entries: contracts
      .filter((contract) => contract.startDate >= from && contract.startDate <= to)
      .map((contract) => contract.membershipId),
    exits: contracts
      .filter(
        (contract) =>
          contract.endDate !== null &&
          contract.endDate >= from &&
          contract.endDate <= to,
      )
      .map((contract) => contract.membershipId),
    average: (present(from) + present(to)) / 2,
  };
}

/**
 * Taux de rotation, en pourcentage.
 *
 * `(entrées + sorties) / 2 / effectif moyen`. La moyenne des deux mouvements
 * est la définition usuelle en France ; compter seulement les départs
 * sous-estime la rotation d'une équipe qui recrute autant qu'elle perd.
 *
 * Rend `null` plutôt que zéro sur un effectif nul : « 0 % de rotation » sur un
 * établissement vide est une affirmation fausse, pas une absence de mouvement.
 */
export function turnoverRate(result: HeadcountResult): number | null {
  if (result.average === 0) return null;
  const movements = (result.entries.length + result.exits.length) / 2;
  return Math.round((movements / result.average) * 1000) / 10;
}

export interface AbsenceInput {
  membershipId: string;
  /** Jours décomptés, tels que figés à la décision. */
  days: number;
  /** Vrai pour un arrêt relevant de la sécurité sociale. */
  isSocialSecurity: boolean;
  timeOffId: string;
}

export interface AbsenteeismResult {
  /** Jours d'absence, toutes natures. */
  totalDays: number;
  /** Jours d'arrêt maladie et assimilés. */
  sickDays: number;
  /** Taux d'absentéisme en pourcentage des jours théoriques. */
  rate: number | null;
  sourceIds: string[];
}

/**
 * Absentéisme sur une période.
 *
 * Le taux se rapporte aux **jours théoriquement travaillés**, pas aux jours
 * calendaires : rapporter à 30 jours donnerait un taux artificiellement bas et
 * ferait passer un problème réel pour du bruit.
 */
export function absenteeism(
  absences: AbsenceInput[],
  theoreticalWorkedDays: number,
): AbsenteeismResult {
  const totalDays = absences.reduce((sum, entry) => sum + entry.days, 0);
  const sickDays = absences
    .filter((entry) => entry.isSocialSecurity)
    .reduce((sum, entry) => sum + entry.days, 0);

  return {
    totalDays: round(totalDays),
    sickDays: round(sickDays),
    rate:
      theoreticalWorkedDays > 0
        ? Math.round((totalDays / theoreticalWorkedDays) * 1000) / 10
        : null,
    sourceIds: absences.map((entry) => entry.timeOffId),
  };
}

export interface DeadlineInput {
  id: string;
  membershipId: string;
  name: string;
  /** Date d'échéance, civile. */
  dueDate: string;
  label: string;
}

export interface Deadline extends DeadlineInput {
  /** Jours restants ; négatif si l'échéance est passée. */
  daysLeft: number;
  severity: 'PASSED' | 'URGENT' | 'SOON';
}

const DAY_MS = 86_400_000;

/**
 * Échéances à venir dans une fenêtre.
 *
 * Les échéances **dépassées** sont conservées et remontées en tête : une
 * période d'essai qu'on a laissé filer est une information plus urgente qu'une
 * échéance à venir, et la masquer parce qu'elle est passée est précisément ce
 * qui la rend coûteuse.
 */
export function upcomingDeadlines(
  entries: DeadlineInput[],
  today: string,
  windowDays: number,
  urgentDays = 15,
): Deadline[] {
  const now = new Date(`${today}T00:00:00Z`).getTime();

  return entries
    .map((entry) => {
      const daysLeft = Math.round(
        (new Date(`${entry.dueDate}T00:00:00Z`).getTime() - now) / DAY_MS,
      );
      return {
        ...entry,
        daysLeft,
        severity:
          daysLeft < 0
            ? ('PASSED' as const)
            : daysLeft <= urgentDays
              ? ('URGENT' as const)
              : ('SOON' as const),
      };
    })
    .filter((entry) => entry.daysLeft <= windowDays)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export interface ProfileCompleteness {
  membershipId: string;
  name: string;
  /** Champs manquants, nommés pour l'écran. */
  missing: string[];
}

export interface ProfileInput {
  membershipId: string;
  name: string;
  birthDate: unknown;
  address: unknown;
  city: unknown;
  phone: unknown;
  socialSecurityNumber: unknown;
  iban: unknown;
  hasContract: boolean;
}

/**
 * Champs manquants d'un dossier.
 *
 * La liste est **nommée**, pas comptée : « 6 profils incomplets » n'aide
 * personne à agir, « il manque l'IBAN de trois salariés » se règle en un
 * message. Le NIR et l'IBAN sont vérifiés par leur présence chiffrée, jamais
 * déchiffrés pour ce contrôle — savoir qu'une valeur existe n'exige pas de la
 * lire.
 */
export function profileGaps(profile: ProfileInput): ProfileCompleteness {
  const missing: string[] = [];

  if (!profile.birthDate) missing.push('date de naissance');
  if (!profile.address) missing.push('adresse');
  if (!profile.city) missing.push('ville');
  if (!profile.phone) missing.push('téléphone');
  if (!profile.socialSecurityNumber) missing.push('numéro de sécurité sociale');
  if (!profile.iban) missing.push('IBAN');
  if (!profile.hasContract) missing.push('contrat');

  return {
    membershipId: profile.membershipId,
    name: profile.name,
    missing,
  };
}

/**
 * Coût de main-d'œuvre — PLAN.md §7.5.
 *
 * Heures × taux horaire × (1 + taux de cotisations). Le taux patronal est un
 * paramètre de l'établissement, jamais une constante : il varie d'un
 * établissement à l'autre et d'une année sur l'autre.
 */
export function labourCost(
  minutes: number,
  hourlyRate: number,
  employerContributionPercent: number,
): number {
  const hours = minutes / 60;
  const gross = hours * hourlyRate;
  return Math.round(gross * (1 + employerContributionPercent / 100) * 100) / 100;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
