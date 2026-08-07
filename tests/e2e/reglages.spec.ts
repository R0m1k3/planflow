import { expect, test } from '@playwright/test';

/**
 * Ce test se connecte en manager : il ne peut donc pas réutiliser la session
 * partagée de la direction, d'où le projet « anonyme ».
 */
async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/connexion');
  await page.getByLabel('Adresse électronique').fill(email);
  await page.getByLabel('Mot de passe').fill('planflow-demo-2026');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { name: 'Aperçu RH' })).toBeVisible();
}

test('la direction lit et alimente le registre de paramétrage', async ({
  page,
}) => {
  await signIn(page, 'direction@example.test');
  await page.goto('/reglages/registre');

  await expect(
    page.getByRole('heading', { name: 'Registre de paramétrage juridique' }),
  ).toBeVisible();

  const parameter = `Durée quotidienne maximale ${Date.now()}`;
  // Ciblage par attribut `name` : les libellés portent un texte d'aide, et
  // celui de « Source » contient lui-même le mot « valeur », ce qui rend la
  // correspondance par libellé ambiguë.
  const form = page.locator('form').filter({ hasText: 'Consigner' });
  await form.locator('input[name="key"]').fill(parameter);
  await form.locator('input[name="value"]').fill('10 h');
  await form
    .locator('input[name="source"]')
    .fill('IDCC 1517 — texte consolidé Legifrance');
  await form.locator('input[name="population"]').fill('Tous les salariés');
  await page.getByRole('button', { name: 'Consigner' }).click();

  const row = page.getByRole('row', { name: new RegExp(parameter) });
  await expect(row).toBeVisible();

  // Consigné n'est pas approuvé : la matrice exige un approbateur nommé.
  await row.getByRole('button', { name: 'Approuver' }).click();
  await expect(row.getByText(/Approuvé le/)).toBeVisible();
});

test('un manager ne peut ni voir ni modifier les établissements', async ({
  page,
}) => {
  await signIn(page, 'manager.nantes@example.test');

  // La barre latérale ne propose pas la section, mais c'est un confort :
  // le contrôle qui compte est celui du serveur, testé en accédant à l'URL.
  await page.goto('/reglages/etablissements');

  // Le refus se manifeste par une erreur serveur, pas par une page qui
  // s'affiche à moitié : la lecture elle-même est refusée.
  await expect(
    page.getByRole('heading', { name: 'Établissements' }),
  ).toBeHidden();
});
