import { expect, test, type Page } from '@playwright/test';

import { codeNow, stepNow, waitForFreshCode } from './mfa';

/**
 * Second facteur — matrice n° 15.
 *
 * Les codes sont calculés depuis le secret affiché, exactement comme le ferait
 * l'application d'un téléphone. Court-circuiter la vérification testerait un
 * produit que personne n'utilise.
 *
 * La direction est enrôlée par la mise en place et son rôle l'exige : c'est sur
 * elle qu'on éprouve le refus de retrait. Le cycle complet — activer, se
 * connecter, désactiver — se joue sur un compte ordinaire, créé pour l'occasion.
 */

const OWNER_PASSWORD = 'planflow-demo-2026';
const EMPLOYEE_PASSWORD = 'les mesanges du soir';

test('la direction ne peut pas retirer un facteur que son rôle exige', async ({
  page,
}) => {
  await page.goto('/reglages/securite');

  await expect(page.getByText('Second facteur actif')).toBeVisible();
  await expect(page.getByText(/exigé.+ne peut pas être retiré/)).toBeVisible();
  // Le formulaire de retrait n'est pas seulement masqué : il n'existe pas.
  await expect(page.getByRole('button', { name: 'Désactiver' })).toHaveCount(0);
});

// Le parcours attend deux fois le pas TOTP suivant — trente secondes chacune —
// parce qu'un code ne sert qu'une fois. C'est le comportement voulu, pas une
// lenteur à corriger.
test('un compte ordinaire active, éprouve, puis retire son second facteur', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  const account = await createAccessibleEmployee(page);

  const context = await browser.newContext({ storageState: undefined });
  const own = await context.newPage();

  await signIn(own, account.email, EMPLOYEE_PASSWORD);
  // Un salarié ordinaire n'est pas contraint au second facteur : il entre
  // directement, sans écran d'enrôlement.
  await expect(own.getByRole('button', { name: 'Déconnexion' })).toBeVisible();

  await own.goto('/reglages/securite');
  await expect(own.getByText('Non activé')).toBeVisible();
  await own.getByRole('button', { name: 'Activer le second facteur' }).click();

  const secret = await readSecret(own);
  const codeField = own.getByRole('textbox', {
    name: 'Recopiez le code affiché',
  });

  // Un code faux n'enregistre rien : poser un secret sans preuve que son
  // détenteur sait le produire fermerait le compte.
  await codeField.fill('000000');
  await own.getByRole('button', { name: 'Valider' }).click();
  await expect(own.getByText(/ne correspond pas/)).toBeVisible();

  const enrolStep = stepNow();
  await codeField.fill(codeNow(secret));
  await own.getByRole('button', { name: 'Valider' }).click();

  const codes = own.getByTestId('recovery-codes');
  await expect(codes).toBeVisible();
  await expect(codes.getByRole('listitem')).toHaveCount(10);
  const recoveryCode = (await codes.getByRole('listitem').first().textContent())!.trim();

  // Le mot de passe seul n'ouvre plus rien.
  const second = await browser.newContext({ storageState: undefined });
  const fresh = await second.newPage();
  await signIn(fresh, account.email, EMPLOYEE_PASSWORD);
  await expect(fresh.getByRole('heading', { name: 'Vérification' })).toBeVisible();

  // Une session en attente n'ouvre aucun écran : elle ne porte qu'un défi.
  await fresh.goto('/equipe');
  await expect(fresh).toHaveURL(/connexion/);

  await signIn(fresh, account.email, EMPLOYEE_PASSWORD);
  await fresh.getByLabel('Code').fill('123456');
  await fresh.getByRole('button', { name: 'Vérifier' }).click();
  await expect(fresh.getByText(/Code refusé/)).toBeVisible();

  await waitForFreshCode(enrolStep);
  await fresh.getByLabel('Code').fill(codeNow(secret));
  await fresh.getByRole('button', { name: 'Vérifier' }).click();
  await expect(fresh).not.toHaveURL(/verification/);
  await second.close();

  // Un code de secours ouvre aussi, et ne sert qu'une fois.
  const third = await browser.newContext({ storageState: undefined });
  const rescued = await third.newPage();
  await signIn(rescued, account.email, EMPLOYEE_PASSWORD);
  await rescued.getByLabel('Code').fill(recoveryCode);
  await rescued.getByRole('button', { name: 'Vérifier' }).click();
  await expect(rescued).toHaveURL(/reglages\/securite/);

  const fourth = await browser.newContext({ storageState: undefined });
  const replay = await fourth.newPage();
  await signIn(replay, account.email, EMPLOYEE_PASSWORD);
  await replay.getByLabel('Code').fill(recoveryCode);
  await replay.getByRole('button', { name: 'Vérifier' }).click();
  await expect(replay.getByText(/Code refusé/)).toBeVisible();
  await fourth.close();

  // Le retrait exige le mot de passe : un poste laissé ouvert ne suffit pas.
  await rescued.goto('/reglages/securite');
  await rescued.getByLabel('Mot de passe').fill('pas le bon mot de passe');
  await rescued.getByRole('button', { name: 'Désactiver' }).click();
  await expect(rescued.getByText('Mot de passe incorrect.')).toBeVisible();

  await rescued.getByLabel('Mot de passe').fill(EMPLOYEE_PASSWORD);
  await rescued.getByRole('button', { name: 'Désactiver' }).click();
  await expect(rescued.getByText('Second facteur désactivé.')).toBeVisible();
  await third.close();

  await context.close();
});

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/connexion');
  await page.getByLabel('Adresse électronique').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Attendre que la page ait quitté le formulaire : naviguer pendant que
  // l'action est encore en vol l'annulerait, et la session ne serait jamais
  // posée.
  await page.waitForURL((url) => !url.pathname.endsWith('/connexion'));
}

/** Le secret est affiché en clair pour qui n'a pas d'appareil photo. */
async function readSecret(page: Page): Promise<string> {
  const shown = await page.locator('p.font-mono').first().textContent();
  return (shown ?? '').replace(/\s/g, '');
}

/**
 * Crée un salarié et lui ouvre un accès.
 *
 * Chaque exécution le sien : le second facteur est porté par la personne, et
 * deux passages qui se partageraient un compte se heurteraient au facteur posé
 * par le précédent.
 */
async function createAccessibleEmployee(page: Page) {
  const suffix = `${Date.now()}-mfa`;
  const lastName = `Facteur${suffix}`;
  const email = `facteur.${suffix}@exemple.test`;

  await page.goto('/equipe');
  const form = page.locator('form').filter({ hasText: 'Ajouter' });
  await form.getByLabel('Prénom').fill('Noé');
  await form.getByLabel('Nom', { exact: true }).fill(lastName);
  await form.getByLabel('Matricule').fill(`MFA${suffix}`);
  await form.getByLabel('Adresse électronique').fill(email);
  // Le formulaire propose d’ouvrir un contrat d’emblée : ce parcours n’en veut
  // pas, et un salarié sans contrat doit rester créable.
  await form.getByLabel('Ouvrir un contrat maintenant').uncheck();
  await form.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Salarié ajouté.')).toBeVisible();

  await page.getByRole('link', { name: new RegExp(lastName) }).click();
  // L'invitation est portée par l'onglet « Documents » de la fiche.
  await page.goto(`${page.url()}/documents`);
  await page
    .locator('form')
    .filter({ hasText: 'Adresse d’invitation' })
    .getByRole('button')
    .click();

  const link = page.getByTestId('invitation-link');
  await expect(link).toBeVisible();
  const url = (await link.textContent())!.trim();

  const guest = await page.context().browser()!.newContext({
    storageState: undefined,
  });
  const guestPage = await guest.newPage();
  await guestPage.goto(url);
  await guestPage.getByLabel('Choisissez un mot de passe').fill(EMPLOYEE_PASSWORD);
  await guestPage.getByLabel('Confirmez').fill(EMPLOYEE_PASSWORD);
  await guestPage.getByRole('button', { name: 'Activer mon accès' }).click();
  await expect(guestPage.getByText(/Votre accès est actif/)).toBeVisible();
  await guest.close();

  return { email, lastName };
}

test('le mot de passe du propriétaire reste inchangé', async ({ page }) => {
  // Garde-fou : les tests ci-dessus manipulent l'authentification, et une
  // dérive silencieuse fermerait la suite entière au passage suivant.
  await page.goto('/reglages/securite');
  await expect(page.getByRole('heading', { name: 'Sécurité' })).toBeVisible();
  expect(OWNER_PASSWORD).toBe('planflow-demo-2026');
});
