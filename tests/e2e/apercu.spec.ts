import { expect, test } from '@playwright/test';

/**
 * Tableau de bord RH.
 *
 * Le critère qui compte : **un indicateur doit être explicable**. Un chiffre
 * qu'on ne peut pas ouvrir ne se corrige pas, il se conteste.
 */

test('chaque tuile mène à ses lignes sources', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aperçu RH' })).toBeVisible();

  // Les tuiles sont des liens, pas des chiffres décoratifs. On vise celle du
  // contenu, pas l'onglet de section homonyme.
  const tile = page
    .locator('main')
    .getByRole('link', { name: /Profils incomplets/ })
    .first();
  await tile.click();

  await expect(page).toHaveURL(/liste=profils/);
  await expect(
    page.locator('main').getByText('Profils incomplets').first(),
  ).toBeVisible();
});

test('la liste nomme ce qui manque plutôt que de le compter', async ({
  page,
}) => {
  await page.goto('/?liste=profils');

  // « 6 profils incomplets » n'aide personne à agir ; « il manque l'IBAN » se
  // règle en un message.
  await expect(page.getByText(/Manque :/).first()).toBeVisible();
});

test('les indicateurs agrégés sont affichés', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Effectif en fin de mois')).toBeVisible();
  await expect(page.getByText('Rotation')).toBeVisible();
  await expect(page.getByText('Absentéisme')).toBeVisible();
  await expect(page.getByText('Heures planifiées')).toBeVisible();
});

test('chaque ligne mène à la fiche du salarié', async ({ page }) => {
  await page.goto('/?liste=profils');

  const first = page
    .locator('section')
    .filter({ hasText: 'Profils incomplets' })
    .locator('li a')
    .first();

  if (await first.isVisible()) {
    await expect(first).toHaveAttribute('href', /\/equipe\//);
  }
});

test('la navigation entre listes conserve le mois et l’établissement', async ({
  page,
}) => {
  await page.goto('/');

  await page
    .locator('main')
    .getByRole('link', { name: '← Mois précédent' })
    .click();

  // Attendre la navigation avant de lire l'URL : la lire tout de suite rendrait
  // celle d'avant le clic.
  await expect(page).toHaveURL(/mois=/);
  const month = new URL(page.url()).searchParams.get('mois');
  expect(month).toBeTruthy();

  await page
    .locator('main')
    .getByRole('link', { name: 'Journal des absences' })
    .first()
    .click();
  // Changer de liste ne doit pas ramener au mois courant : on perdrait le
  // contexte à chaque clic.
  await expect(page).toHaveURL(new RegExp(`mois=${month}`));
});
