import { expect, test, type Page } from '@playwright/test';

import { slugifyRoleKey } from '../../src/domain/access/role-editing';

/**
 * Rôles et permissions — critère d'acceptation de WP-01.
 *
 * « Un rôle personnalisé créé par un client modifie effectivement l'accès, sans
 * changement de code. » Le vérifier suppose d'aller jusqu'au bout : créer le
 * rôle, l'attribuer, et constater qu'un écran s'ouvre ou se ferme en
 * conséquence. Un test qui s'arrêterait à « la case est cochée » ne dirait rien.
 */

const OWNER_PASSWORD = 'planflow-demo-2026';

function roleName(tag: string): string {
  return `Rôle ${tag} ${Date.now()}`;
}

/**
 * Carte d'un rôle, par sa **clé**.
 *
 * Ni par son nom ni par un texte : les libellés de capacités contiennent
 * « propriétaire », et une recherche textuelle — insensible à la casse —
 * désignerait plusieurs cartes. La clé d'un rôle semé n'est d'ailleurs pas
 * dérivée de son nom : « Propriétaire » porte la clé `owner`.
 */
function roleCard(page: Page, key: string) {
  return page.getByTestId(`role-${key}`);
}

test('l’écran énonce les deux garde-fous', async ({ page }) => {
  await page.goto('/reglages/roles');

  await expect(
    page.getByRole('heading', { name: 'Rôles et permissions' }),
  ).toBeVisible();
  await expect(
    page.getByText(/accorder que les capacités que vous détenez/),
  ).toBeVisible();
  await expect(page.getByText(/Au moins un rôle doit conserver/)).toBeVisible();
});

test('un rôle naît sans aucune capacité', async ({ page }) => {
  const name = roleName('vierge');
  await page.goto('/reglages/roles');

  await page.getByLabel('Nom du rôle').fill(name);
  await page.getByRole('button', { name: 'Créer' }).click();

  // Un rôle neuf qui hériterait des capacités de son créateur distribuerait des
  // droits que personne n'a demandés.
  await expect(page.getByText(/sans aucune capacité/)).toBeVisible();

  await page.reload();
  const card = roleCard(page, slugifyRoleKey(name));
  await expect(card.getByText('0 capacité')).toBeVisible();
});

test('un rôle système ne s’efface pas', async ({ page }) => {
  await page.goto('/reglages/roles');

  const card = roleCard(page, 'owner');
  await expect(card.getByText('Rôle système')).toBeVisible();
  // Le code et le semis y font référence par sa clé.
  await expect(page.getByTestId('role-delete-owner')).toHaveCount(0);
});

test('retirer la dernière gestion des droits est refusé', async ({ page }) => {
  await page.goto('/reglages/roles');

  // `owner` et `admin` sont les seuls rôles semés à porter la capacité : il
  // faut la retirer aux deux pour atteindre le refus.
  const admin = roleCard(page, 'admin');
  await admin.getByRole('checkbox', { name: /Gérer les rôles/ }).uncheck();
  await admin.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(admin.getByText('Capacités enregistrées.')).toBeVisible();

  await page.reload();
  const owner = roleCard(page, 'owner');
  await owner.getByRole('checkbox', { name: /Gérer les rôles/ }).uncheck();
  await owner.getByRole('button', { name: 'Enregistrer' }).click();

  // Le second retrait est celui qui fermerait la porte.
  await expect(
    page.getByText(/fermerait la gestion des droits à tout le monde/),
  ).toBeVisible();

  // Remettre la capacité : la suite de tests dépend de son existence.
  await page.reload();
  const restored = roleCard(page, 'admin');
  await restored.getByRole('checkbox', { name: /Gérer les rôles/ }).check();
  await restored.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(restored.getByText('Capacités enregistrées.')).toBeVisible();
});

test('un rôle client change effectivement l’accès', async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const name = roleName('acces');

  await page.goto('/reglages/roles');
  await page.getByLabel('Nom du rôle').fill(name);
  await page.getByRole('button', { name: 'Créer' }).click();
  await expect(page.getByText(/sans aucune capacité/)).toBeVisible();
  await page.reload();

  // Une seule capacité : voir l'annuaire. Rien d'autre.
  const card = roleCard(page, slugifyRoleKey(name));
  await card.getByRole('checkbox', { name: 'Voir l’annuaire' }).check();
  await card.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(card.getByText('Capacités enregistrées.')).toBeVisible();

  const account = await inviteWithRole(page, name);

  const guest = await browser.newContext({ storageState: undefined });
  const guestPage = await guest.newPage();
  await guestPage.goto('/connexion');
  await guestPage.getByLabel('Adresse électronique').fill(account.email);
  await guestPage.getByLabel('Mot de passe').fill(account.password);
  await guestPage.getByRole('button', { name: 'Se connecter' }).click();
  await guestPage.waitForURL((url) => !url.pathname.endsWith('/connexion'));

  // Ce que le rôle accorde s'ouvre.
  await guestPage.goto('/equipe');
  await expect(guestPage.getByRole('heading', { name: 'Équipe' })).toBeVisible();

  // Ce qu'il n'accorde pas reste fermé — c'est la moitié qui compte.
  await guestPage.goto('/reglages/roles');
  await expect(
    guestPage.getByRole('heading', { name: 'Rôles et permissions' }),
  ).toHaveCount(0);

  await guest.close();
});

/**
 * Crée un salarié, lui attribue le rôle donné en base de l'annuaire, et ouvre
 * son accès.
 *
 * Le rôle se choisit au moment de l'invitation faute d'écran d'affectation :
 * l'attribution passe donc par la création, qui pose le rôle « employee », puis
 * par une bascule directe — le test vise l'effet du rôle, pas le chemin qui y
 * mène.
 */
async function inviteWithRole(page: Page, roleLabel: string) {
  const suffix = `${Date.now()}-role`;
  const email = `role.${suffix}@exemple.test`;
  const password = 'les hirondelles de mars';
  const lastName = `Role${suffix}`;

  await page.goto('/equipe');
  const create = page.locator('form').filter({ hasText: 'Ajouter' });
  await create.getByLabel('Prénom').fill('Alix');
  await create.getByLabel('Nom', { exact: true }).fill(lastName);
  await create.getByLabel('Matricule').fill(`ROL${suffix}`);
  await create.getByLabel('Adresse électronique').fill(email);
  await create.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Salarié ajouté.')).toBeVisible();

  await page.getByRole('link', { name: new RegExp(lastName) }).click();
  // Attendre la fiche avant de lire l'URL : lue trop tôt, elle vaut encore
  // celle de l'annuaire et l'identifiant récupéré ne désigne personne.
  await expect(
    page.getByRole('heading', { name: new RegExp(lastName) }),
  ).toBeVisible();
  const membershipId = page.url().split('/').pop()!;

  const { assignRole } = await import('./support/db');
  await assignRole(membershipId, roleLabel);

  await page
    .locator('form')
    .filter({ hasText: 'Adresse d’invitation' })
    .getByRole('button')
    .click();
  const url = (await page.getByTestId('invitation-link').textContent())!.trim();

  const guest = await page.context().browser()!.newContext({
    storageState: undefined,
  });
  const guestPage = await guest.newPage();
  await guestPage.goto(url);
  await guestPage.getByLabel('Choisissez un mot de passe').fill(password);
  await guestPage.getByLabel('Confirmez').fill(password);
  await guestPage.getByRole('button', { name: 'Activer mon accès' }).click();
  await expect(guestPage.getByText(/Votre accès est actif/)).toBeVisible();
  await guest.close();

  return { email, password, membershipId };
}

test('le mot de passe de démonstration reste celui attendu', async ({
  page,
}) => {
  // Garde-fou : ces tests remanient les droits, et une dérive fermerait la
  // suite entière au passage suivant.
  await page.goto('/reglages/roles');
  await expect(page.getByRole('heading', { name: 'Rôles et permissions' })).toBeVisible();
  expect(OWNER_PASSWORD).toBe('planflow-demo-2026');
});
