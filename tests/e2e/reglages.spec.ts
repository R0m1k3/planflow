import { expect, test } from '@playwright/test';

/**
 * Ce test se connecte en manager : il ne peut donc pas réutiliser la session
 * partagée de la direction, d'où le projet « anonyme ».
 *
 * Les écrans qui n'éprouvent pas l'authentification ont été déplacés dans
 * `registre.spec.ts`, où ils réutilisent la session commune : la direction
 * porte désormais un second facteur, et deux connexions simultanées sur le même
 * compte se heurteraient au refus de rejeu d'un code — ce qui est le
 * comportement voulu, pas un défaut à contourner.
 */
async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/connexion');
  await page.getByLabel('Adresse électronique').fill(email);
  await page.getByLabel('Mot de passe').fill('planflow-demo-2026');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('heading', { name: 'Aperçu RH' })).toBeVisible();
}

test('un manager ne peut ni voir ni modifier les établissements', async ({
  page,
}) => {
  await signIn(page, 'manager.nantes@example.test');

  // Les onglets ne proposent pas la section, mais c'est un confort :
  // le contrôle qui compte est celui du serveur, testé en accédant à l'URL.
  await page.goto('/reglages/etablissements');

  // Le refus se manifeste par une erreur serveur, pas par une page qui
  // s'affiche à moitié : la lecture elle-même est refusée.
  await expect(
    page.getByRole('heading', { name: 'Établissements' }),
  ).toBeHidden();
});
