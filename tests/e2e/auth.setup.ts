import { test as setup, expect } from '@playwright/test';

import { rememberSecret } from './mfa';
import { STORAGE_STATE } from './storage';
import { resetMfa } from './support/db';
import { totpCode, totpStep } from '../../src/domain/access/totp';

/**
 * Ouvre une session une fois et enregistre le cookie pour les autres tests.
 *
 * Chaque test se connecterait sinon, ce qui coûterait un argon2 par test —
 * volontairement lent — et ferait grimper le compteur d'échecs partagé.
 *
 * Le rôle de la direction exige un second facteur (matrice n° 15) : la mise en
 * place l'enrôle donc réellement. Le retrait préalable rend l'opération
 * rejouable — sans lui, un deuxième passage se heurterait au facteur posé par
 * le premier, dont le secret a disparu avec lui.
 */
const EMAIL = 'direction@example.test';
const PASSWORD = 'planflow-demo-2026';

setup('authentifie la direction', async ({ page }) => {
  await resetMfa(EMAIL);

  await page.goto('/connexion');
  await page.getByLabel('Adresse électronique').fill(EMAIL);
  await page.getByLabel('Mot de passe').fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // Le rôle exige le second facteur : l'application substitue l'enrôlement au
  // contenu tant qu'il n'est pas posé.
  await page.getByRole('button', { name: 'Activer le second facteur' }).click();

  const shown = await page.locator('p.font-mono').first().textContent();
  const secret = (shown ?? '').replace(/\s/g, '');
  expect(secret.length).toBeGreaterThan(16);

  const usedStep = totpStep(Date.now());
  await page
    .getByRole('textbox', { name: 'Recopiez le code affiché' })
    .fill(totpCode(secret, Date.now()));
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByTestId('recovery-codes')).toBeVisible();

  rememberSecret(secret, usedStep);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aperçu RH' })).toBeVisible();
  await page.context().storageState({ path: STORAGE_STATE });
});
