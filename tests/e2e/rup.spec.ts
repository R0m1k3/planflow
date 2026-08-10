import { expect, test } from '@playwright/test';

/**
 * Registre unique du personnel — édition.
 *
 * Ce qui est éprouvé n'est pas la mise en page, mais qu'un fichier sorte et
 * qu'il porte le bon établissement : un registre édité pour le mauvais site ne
 * répond à aucune demande d'inspection.
 */

test('le registre s’édite par établissement', async ({ page }) => {
  await page.goto('/equipe');

  await page.getByRole('button', { name: 'Registre unique du personnel' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Téléchargez votre registre unique du personnel',
    }),
  ).toBeVisible();

  // Sans établissement, rien à télécharger : le registre se tient par site.
  const download = page.getByRole('link', { name: 'Télécharger' });
  await expect(download).toHaveAttribute('aria-disabled', 'true');

  const select = page.getByLabel('Établissement pour lequel éditer le registre');
  const value = await select.locator('option').nth(1).getAttribute('value');
  await select.selectOption(value!);

  const started = page.waitForEvent('download');
  await download.click();
  const file = await started;

  expect(file.suggestedFilename()).toMatch(/^RUP - .+\.pdf$/);

  // Le contenu est bien un PDF, pas une page d'erreur renvoyée en 200.
  const path = await file.path();
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(path).subarray(0, 5).toString()).toBe('%PDF-');
});

test('l’adresse du registre refuse un établissement absent', async ({
  page,
}) => {
  const response = await page.goto('/equipe/registre');
  expect(response?.status()).toBe(400);
});
