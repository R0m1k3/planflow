import { expect, test } from '@playwright/test';

/**
 * Première installation — PLAN.md §5.
 *
 * La base de cette suite est semée, donc **installée**. Ce que ces tests
 * peuvent prouver est justement ce qui compte le plus : l'écran ne se rouvre
 * pas. Il crée un propriétaire sans demander de session ; laissé accessible
 * après coup, il donnerait à n'importe quel visiteur un compte disposant de
 * tous les droits sur l'instance.
 *
 * La création elle-même est éprouvée contre une base réelle dans
 * tests/integration/installation.test.ts, où la transaction est annulée — le
 * marqueur d'installation, lui, ne se supprime pas.
 */

test('l’écran d’installation est refermé sur une instance installée', async ({
  page,
}) => {
  await page.goto('/installation');

  // Redirigé vers la connexion, et non pas seulement privé de son formulaire.
  await expect(page).toHaveURL(/\/connexion/);
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

  // Le formulaire ne doit pas non plus subsister dans le HTML : un champ caché
  // reste soumettable.
  expect(await page.content()).not.toContain('Première installation');
});

test('la connexion reste la porte d’entrée', async ({ page }) => {
  // Le pendant du test précédent : sur une instance installée, la racine ne
  // doit pas dériver vers l'installation. Les deux redirections se répondent,
  // et une erreur de sens les ferait boucler l'une sur l'autre.
  await page.goto('/');
  await expect(page).toHaveURL(/\/connexion/);
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
});
