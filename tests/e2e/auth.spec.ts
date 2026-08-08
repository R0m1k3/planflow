import { expect, test } from '@playwright/test';

import { answerChallenge, rememberedSecret, waitForFreshCode } from './mfa';

const EMAIL = 'direction@example.test';
const PASSWORD = 'planflow-demo-2026';

test('une route applicative redirige vers la connexion', async ({ page }) => {
  await page.goto('/planning/semaine');
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
});

test('un mot de passe faux ne dit pas si le compte existe', async ({ page }) => {
  async function attempt(email: string): Promise<string> {
    // Une page neuve par tentative : le message précédent resterait sinon à
    // l'écran et le test comparerait deux fois le même.
    await page.goto('/connexion');
    await page.getByLabel('Adresse électronique').fill(email);
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    // Restreint au formulaire : Next pose un annonceur de route qui porte lui
    // aussi role="alert" et qui est vide.
    const alert = page.locator('form').getByRole('alert');
    await expect(alert).toBeVisible();
    return (await alert.textContent()) ?? '';
  }

  const knownAccount = await attempt(EMAIL);
  const unknownAccount = await attempt('inconnu@example.test');

  // Un message différent laisserait énumérer les adresses du personnel.
  expect(unknownAccount).toBe(knownAccount);
  expect(knownAccount).toContain('Identifiants incorrects');
});

test('connexion, navigation, puis déconnexion', async ({ page }) => {
  const remembered = rememberedSecret();
  // Un code ne sert qu'une fois : attendre le pas suivant celui qu'a employé la
  // mise en place, plutôt que de se heurter au refus de rejeu. L'attente est
  // nulle dès que trente secondes se sont écoulées entre-temps.
  await waitForFreshCode(remembered.usedStep);

  await page.goto('/connexion');
  await page.getByLabel('Adresse électronique').fill(EMAIL);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // Le rôle de la direction exige un second facteur : le mot de passe seul
  // n'ouvre rien.
  await expect(page.getByRole('heading', { name: 'Vérification' })).toBeVisible();
  await answerChallenge(page, remembered.secret);

  await expect(page.getByRole('heading', { name: 'Aperçu RH' })).toBeVisible();
  // L'identité affichée vient de la base, pas d'un libellé en dur.
  await expect(page.getByTitle(/Camille Ferrand/)).toBeVisible();

  await page.getByRole('link', { name: 'Plannings' }).click();
  await expect(
    page.getByRole('heading', { name: /Planning · semaine \d+/ }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Déconnexion' }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  // La session est révoquée en base : revenir en arrière ne doit pas rouvrir
  // l'application.
  await page.goto('/equipe');
  await expect(page).toHaveURL(/\/connexion$/);
});
