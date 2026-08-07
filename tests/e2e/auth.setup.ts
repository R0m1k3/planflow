import { test as setup, expect } from '@playwright/test';

import { STORAGE_STATE } from './storage';

/**
 * Ouvre une session une fois et enregistre le cookie pour les autres tests.
 *
 * Chaque test se connecterait sinon, ce qui coûterait un argon2 par test —
 * volontairement lent — et ferait grimper le compteur d'échecs partagé.
 */
setup('authentifie la direction', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel('Adresse électronique').fill('direction@example.test');
  await page.getByLabel('Mot de passe').fill('planflow-demo-2026');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.getByRole('heading', { name: 'Aperçu RH' })).toBeVisible();
  await page.context().storageState({ path: STORAGE_STATE });
});
