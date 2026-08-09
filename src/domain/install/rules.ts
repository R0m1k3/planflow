import { passwordProblem } from '@/domain/access/invitation';

/**
 * Règles de la première installation — PLAN.md §5.
 *
 * L'écran qui s'appuie dessus est le seul de l'application à s'ouvrir sans
 * session : il crée le compte, le premier établissement et le propriétaire.
 * Ses refus sont donc énoncés ici, en fonctions pures, pour être éprouvés sans
 * base ni navigateur.
 */

export interface InstallationForm {
  companyName: string;
  locationName: string;
  timezone: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

/** Matricule du premier salarié. Le registre du personnel les veut ordonnés. */
export const FIRST_EMPLOYEE_NUMBER = 'E0001';

/**
 * Fuseau par défaut. La convention collective et les durées légales portées par
 * l'application sont françaises ; proposer autre chose par défaut serait un
 * piège plutôt qu'une ouverture.
 */
export const DEFAULT_TIMEZONE = 'Europe/Paris';

const MAX_NAME_LENGTH = 120;

/**
 * Un fuseau valide, jugé par la plateforme et non par une liste tenue à la
 * main : une liste se périme, et un fuseau inconnu ne se voit qu'au premier
 * calcul d'horaire — c'est-à-dire trop tard, sur une paie.
 */
export function isKnownTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function nameProblem(value: string, subject: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return `${subject} est requis.`;
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `${subject} ne peut pas dépasser ${MAX_NAME_LENGTH} caractères.`;
  }
  return null;
}

/**
 * Adresse électronique plausible.
 *
 * Volontairement permissif : la seule validation qui prouve qu'une adresse
 * existe est l'envoi d'un message. Refuser ici sur une grammaire trop stricte
 * écarterait des adresses valides — et enfermerait l'exploitant dehors, sans
 * recours, puisque cet écran ne se rouvre pas.
 */
function emailProblem(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'L’adresse électronique est requise.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'L’adresse électronique n’a pas une forme valide.';
  }
  return null;
}

/**
 * Motif de refus du formulaire, ou `null` s'il convient.
 *
 * L'ordre compte : le premier motif rencontré est celui qui s'affiche, et on
 * veut qu'il désigne le champ le plus haut dans l'écran.
 */
export function installationProblem(form: InstallationForm): string | null {
  const problems = [
    nameProblem(form.companyName, 'Le nom de l’entreprise'),
    nameProblem(form.locationName, 'Le nom de l’établissement'),
    isKnownTimezone(form.timezone)
      ? null
      : `Le fuseau horaire « ${form.timezone} » est inconnu.`,
    nameProblem(form.firstName, 'Le prénom'),
    nameProblem(form.lastName, 'Le nom'),
    emailProblem(form.email),
  ];

  const first = problems.find((problem) => problem !== null);
  if (first) return first;

  // Le mot de passe est jugé en dernier, avec le nom et l'adresse déjà validés
  // pour de bon : c'est ce contexte qui permet de refuser « martin2026 » à
  // quelqu'un qui s'appelle Martin.
  const password = passwordProblem(form.password, {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
  });
  if (password) return password;

  if (form.password !== form.passwordConfirmation) {
    return 'Les deux mots de passe ne correspondent pas.';
  }

  return null;
}

/** Forme normalisée, telle qu'elle doit être écrite en base. */
export function normaliseInstallation(form: InstallationForm) {
  return {
    companyName: form.companyName.trim(),
    locationName: form.locationName.trim(),
    timezone: form.timezone.trim(),
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    // L'adresse sert d'identifiant de connexion : la casse ne doit pas décider
    // si quelqu'un entre ou non.
    email: form.email.trim().toLowerCase(),
    password: form.password,
  };
}
