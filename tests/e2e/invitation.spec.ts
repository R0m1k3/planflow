import { expect, test, type Page } from '@playwright/test';

/**
 * Entrée d'un salarié dans l'application.
 *
 * C'est le seul chemin d'accès : sans lui, personne ne peut se connecter à un
 * déploiement neuf. Le parcours complet est éprouvé — invitation, choix du mot
 * de passe, puis connexion réelle avec ce mot de passe.
 *
 * Chaque test crée **son** salarié : l'état d'une invitation est porté par la
 * personne, et deux tests qui se partageraient un salarié se marcheraient
 * dessus au deuxième passage.
 */

const password = 'les mesanges du matin';

async function createEmployee(page: Page, tag: string) {
  const suffix = `${Date.now()}-${tag}`;
  const firstName = 'Sacha';
  const lastName = `Test${suffix}`;
  const email = `sacha.${suffix}@exemple.test`;

  await page.goto('/equipe');
  // Le formulaire d’embauche n’est plus posé au bas de la liste : il s’ouvre
  // en modale, à la demande.
  await page.getByRole('button', { name: 'Ajouter un collaborateur' }).click();
  const form = page.locator('form').filter({ hasText: 'Ajouter' });
  await form.getByLabel('Prénom').fill(firstName);
  await form.getByLabel('Nom', { exact: true }).fill(lastName);
  await form.getByLabel('Matricule').fill(`E2E${suffix}`);
  await form.getByLabel('Adresse électronique').fill(email);
  // Le formulaire propose d’ouvrir un contrat d’emblée : ce parcours n’en veut
  // pas, et un salarié sans contrat doit rester créable.
  await form.getByLabel('Ouvrir un contrat maintenant').uncheck();
  await form.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Salarié ajouté.')).toBeVisible();

  const row = page.getByRole('link', { name: new RegExp(lastName) });
  await expect(row).toBeVisible();
  await row.click();

  await expect(
    page.getByRole('heading', { name: `${firstName} ${lastName}` }),
  ).toBeVisible();

  // L'accès applicatif est porté par l'onglet « Documents », avec les pièces du
  // dossier : la fiche s'ouvre ailleurs.
  await page.goto(`${page.url()}/documents`);

  return { firstName, lastName, email, url: page.url() };
}

function panel(page: Page) {
  return page.locator('form').filter({ hasText: 'Adresse d’invitation' });
}

/** Le libellé bascule de « Inviter » à « Renvoyer » : viser le rôle, pas le mot. */
function inviteButton(page: Page) {
  return panel(page).getByRole('button');
}

/** Le lien n'est rendu qu'une fois, après l'émission. */
function shownLink(page: Page) {
  return page.getByTestId('invitation-link');
}

test('un salarié invité choisit son mot de passe et se connecte', async ({
  page,
  browser,
}) => {
  const employee = await createEmployee(page, 'complet');

  await inviteButton(page).click();

  // Le lien est rendu une fois à l'émetteur : sans serveur d'envoi configuré,
  // c'est le seul moyen d'amorcer un déploiement neuf.
  await expect(shownLink(page)).toBeVisible();
  const url = (await shownLink(page).textContent())!.trim();

  // Navigateur vierge. `storageState: undefined` est indispensable : sans lui
  // le contexte hérite de la session du projet, et le test se déroulerait
  // sous l'identité du responsable au lieu de celle du destinataire.
  const guest = await browser.newContext({ storageState: undefined });
  const guestPage = await guest.newPage();
  await guestPage.goto(url);

  await expect(guestPage.getByText(employee.email)).toBeVisible();
  await guestPage.getByLabel('Choisissez un mot de passe').fill(password);
  await guestPage.getByLabel('Confirmez').fill(password);
  await guestPage.getByRole('button', { name: 'Activer mon accès' }).click();

  await expect(guestPage.getByText(/Votre accès est actif/)).toBeVisible();

  // La preuve que l'accès existe n'est pas le message de confirmation, c'est
  // une connexion réussie avec le mot de passe qui vient d'être choisi.
  await guestPage.goto('/connexion');
  await guestPage.getByLabel('Adresse électronique').fill(employee.email);
  await guestPage.getByLabel('Mot de passe').fill(password);
  await guestPage.getByRole('button', { name: 'Se connecter' }).click();
  await expect(guestPage.getByRole('heading').first()).toBeVisible();

  await guest.close();
});

test('un lien d’invitation ne sert qu’une fois', async ({ page, browser }) => {
  const employee = await createEmployee(page, 'unique');
  await inviteButton(page).click();
  await expect(shownLink(page)).toBeVisible();
  const url = (await shownLink(page).textContent())!.trim();

  const first = await browser.newContext({ storageState: undefined });
  const firstPage = await first.newPage();
  await firstPage.goto(url);
  await firstPage.getByLabel('Choisissez un mot de passe').fill(password);
  await firstPage.getByLabel('Confirmez').fill(password);
  await firstPage.getByRole('button', { name: 'Activer mon accès' }).click();
  await expect(firstPage.getByText(/Votre accès est actif/)).toBeVisible();
  await first.close();

  // Rejouer le lien ne doit rien rouvrir : un message transféré ou une boîte
  // compromise ne donnerait sinon un second accès au même compte.
  const second = await browser.newContext({ storageState: undefined });
  const secondPage = await second.newPage();
  await secondPage.goto(url);
  await expect(secondPage.getByText('Invitation acceptée')).toBeVisible();
  await expect(
    secondPage.getByLabel('Choisissez un mot de passe'),
  ).toHaveCount(0);
  await second.close();

  expect(employee.email).toContain('@');
});

test('renvoyer une invitation invalide la précédente', async ({
  page,
  browser,
}) => {
  await createEmployee(page, 'renvoi');
  await inviteButton(page).click();
  await expect(shownLink(page)).toBeVisible();
  const first = (await shownLink(page).textContent())!.trim();

  await inviteButton(page).click();
  // Le second lien remplace le premier à l'écran : attendre qu'il ait changé
  // plutôt que de lire trop tôt.
  await expect(shownLink(page)).not.toHaveText(first);
  const second = (await shownLink(page).textContent())!.trim();

  expect(second).not.toBe(first);

  // Deux liens vivants pour un même accès, c'est deux portes dont une seule
  // est tracée comme ayant servi.
  const guest = await browser.newContext({ storageState: undefined });
  const guestPage = await guest.newPage();
  await guestPage.goto(first);
  await expect(guestPage.getByText('Invitation révoquée')).toBeVisible();
  await guest.close();
});

test('une invitation révoquée refuse le lien', async ({ page, browser }) => {
  await createEmployee(page, 'revoc');
  await inviteButton(page).click();
  await expect(shownLink(page)).toBeVisible();
  const url = (await shownLink(page).textContent())!.trim();

  await page.getByRole('button', { name: 'Révoquer l’invitation' }).click();
  await expect(page.getByText(/Le lien ne fonctionne plus/)).toBeVisible();

  const guest = await browser.newContext({ storageState: undefined });
  const guestPage = await guest.newPage();
  await guestPage.goto(url);
  await expect(guestPage.getByText('Invitation révoquée')).toBeVisible();
  await guest.close();
});

test('un lien fabriqué est refusé sans rien révéler', async ({ browser }) => {
  const guest = await browser.newContext({ storageState: undefined });
  const guestPage = await guest.newPage();

  // L'identifiant de compte est porté par le lien ; un identifiant inventé ne
  // doit pas produire d'erreur serveur, seulement un refus.
  await guestPage.goto('/invitation/cmxxxxxxxxxxxxxxxxxxxxxx.jeton-invente');
  await expect(guestPage.getByText(/n’est pas valide/)).toBeVisible();

  await guestPage.goto('/invitation/sans-separateur');
  await expect(guestPage.getByText(/n’est pas valide/)).toBeVisible();

  await guest.close();
});

test('un mot de passe contenant le nom du salarié est refusé', async ({
  page,
  browser,
}) => {
  const employee = await createEmployee(page, 'motdepasse');
  await inviteButton(page).click();
  await expect(shownLink(page)).toBeVisible();
  const url = (await shownLink(page).textContent())!.trim();

  const guest = await browser.newContext({ storageState: undefined });
  const guestPage = await guest.newPage();
  await guestPage.goto(url);

  const weak = `${employee.lastName}-2026-abcdef`;
  await guestPage.getByLabel('Choisissez un mot de passe').fill(weak);
  await guestPage.getByLabel('Confirmez').fill(weak);
  await guestPage.getByRole('button', { name: 'Activer mon accès' }).click();

  await expect(guestPage.getByText(/ne doit pas contenir votre nom/)).toBeVisible();
  // Le refus ne consomme pas l'invitation : le formulaire reste utilisable.
  await expect(guestPage.getByLabel('Choisissez un mot de passe')).toBeVisible();

  await guest.close();
});
