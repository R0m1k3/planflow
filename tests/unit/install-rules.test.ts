import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TIMEZONE,
  installationProblem,
  isKnownTimezone,
  normaliseInstallation,
  type InstallationForm,
} from '@/domain/install/rules';

/**
 * Règles de la première installation — PLAN.md §5.
 *
 * Cet écran est le seul à s'ouvrir sans session, et il ne se rouvre pas : un
 * refus mal placé enferme l'exploitant dehors sans recours, un refus manquant
 * pose un propriétaire avec un mot de passe faible. Les deux se vérifient ici,
 * sans base ni navigateur.
 */

function form(overrides: Partial<InstallationForm> = {}): InstallationForm {
  return {
    companyName: 'Maison Rivage',
    locationName: 'Nantes Atlantis',
    timezone: DEFAULT_TIMEZONE,
    firstName: 'Camille',
    lastName: 'Ferrand',
    email: 'camille@exemple.test',
    password: 'quatre chevaux blancs',
    passwordConfirmation: 'quatre chevaux blancs',
    ...overrides,
  };
}

describe('installationProblem', () => {
  it('accepte un formulaire complet', () => {
    expect(installationProblem(form())).toBeNull();
  });

  it.each([
    ['companyName', 'Le nom de l’entreprise'],
    ['locationName', 'Le nom de l’établissement'],
    ['firstName', 'Le prénom'],
    ['lastName', 'Le nom'],
  ] as const)('exige %s', (field, expected) => {
    const problem = installationProblem(form({ [field]: '   ' }));
    expect(problem).toContain(expected);
  });

  it('refuse un fuseau inconnu', () => {
    // Un fuseau faux ne se voit qu'au premier calcul d'horaire, c'est-à-dire
    // sur une paie.
    expect(installationProblem(form({ timezone: 'Europe/Atlantide' }))).toMatch(
      /fuseau horaire .* est inconnu/,
    );
  });

  it('accepte un fuseau hors de France', () => {
    // L'application est française, son fuseau par défaut aussi ; elle n'a pas
    // à interdire un établissement à Fort-de-France.
    expect(
      installationProblem(form({ timezone: 'America/Martinique' })),
    ).toBeNull();
  });

  it('refuse une adresse sans arobase', () => {
    expect(installationProblem(form({ email: 'camille.exemple.test' }))).toMatch(
      /forme valide/,
    );
  });

  it('accepte une adresse à sous-adressage', () => {
    // `+` et points sont légitimes ; les refuser fermerait la porte à des
    // adresses réelles sur un écran qui ne se rouvre pas.
    expect(
      installationProblem(form({ email: 'camille+planflow@exemple.test' })),
    ).toBeNull();
  });

  it('refuse un mot de passe trop court', () => {
    expect(
      installationProblem(
        form({ password: 'court', passwordConfirmation: 'court' }),
      ),
    ).toMatch(/12 caractères/);
  });

  it('refuse un mot de passe contenant le nom, accent compris', () => {
    expect(
      installationProblem(
        form({
          lastName: 'Rivière',
          password: 'riviere2026!!',
          passwordConfirmation: 'riviere2026!!',
        }),
      ),
    ).toMatch(/ne doit pas contenir votre nom/);
  });

  it('refuse une confirmation divergente', () => {
    expect(
      installationProblem(form({ passwordConfirmation: 'quatre chevaux noirs' })),
    ).toMatch(/ne correspondent pas/);
  });

  it('juge le mot de passe après les champs qui le contextualisent', () => {
    // Sans cet ordre, un nom vide ferait passer « martin2026 » : la règle
    // « ne contient pas votre nom » n'aurait rien à comparer.
    const problem = installationProblem(
      form({ lastName: '', password: 'court', passwordConfirmation: 'court' }),
    );
    expect(problem).toContain('Le nom');
  });
});

describe('normaliseInstallation', () => {
  it('replie la casse de l’adresse et rogne les espaces', () => {
    // L'adresse sert d'identifiant de connexion : la casse ne doit pas décider
    // si quelqu'un entre ou non.
    const data = normaliseInstallation(
      form({ email: '  Camille@Exemple.Test ', companyName: ' Maison Rivage ' }),
    );
    expect(data.email).toBe('camille@exemple.test');
    expect(data.companyName).toBe('Maison Rivage');
  });

  it('ne touche pas au mot de passe', () => {
    // Rogner un mot de passe changerait celui que l'utilisateur croit avoir
    // choisi, et le refus suivant serait incompréhensible.
    const data = normaliseInstallation(
      form({ password: '  quatre chevaux  ', passwordConfirmation: '  quatre chevaux  ' }),
    );
    expect(data.password).toBe('  quatre chevaux  ');
  });
});

describe('isKnownTimezone', () => {
  it('reconnaît un fuseau IANA et rejette une invention', () => {
    expect(isKnownTimezone('Europe/Paris')).toBe(true);
    expect(isKnownTimezone('Pacific/Auckland')).toBe(true);
    expect(isKnownTimezone('Europe/Atlantide')).toBe(false);
    expect(isKnownTimezone('')).toBe(false);
  });
});
