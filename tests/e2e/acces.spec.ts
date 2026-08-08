import { expect, test, type Page } from '@playwright/test';

import {
  formatWeekParam,
  isoWeekOf,
  previousIsoWeek,
} from '../../src/domain/planning/week';

/**
 * Ce que chaque rôle voit du planning.
 *
 * Ces tests se connectent eux-mêmes : ils ne peuvent pas réutiliser la session
 * partagée de la direction, d'où le projet « anonyme ».
 */

async function signIn(page: Page, email: string) {
  await page.goto('/connexion');
  await page.getByLabel('Adresse électronique').fill(email);
  await page.getByLabel('Mot de passe').fill('planflow-demo-2026');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Attendre la sortie de l'écran de connexion : naviguer tout de suite
  // annulerait la redirection en cours, et le test repartirait déconnecté.
  await expect(page).not.toHaveURL(/\/connexion/);
}

const current = isoWeekOf(new Date());
const CURRENT_WEEK = formatWeekParam(current);
const PUBLISHED_WEEK = formatWeekParam(previousIsoWeek(current));

test('un salarié ne voit pas une semaine non publiée', async ({ page }) => {
  await signIn(page, 'salarie@example.test');

  // Le seed laisse la semaine courante en brouillon et publie la précédente.
  await page.goto(`/planning/semaine?semaine=${CURRENT_WEEK}`);
  await expect(page.getByText(/n’est pas encore publié/).first()).toBeVisible();

  // Le masquage n'est pas cosmétique : les créneaux ne sont pas chargés, donc
  // absents du HTML. Un simple `display: none` les y laisserait.
  expect(await page.content()).not.toContain('09:00–17:00');

  // Ni bouton de publication ni ajout de créneau : les capacités manquent.
  await expect(page.getByRole('button', { name: 'Publier' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /\+ Créneau/ })).toHaveCount(0);
});

test('un salarié voit la semaine publiée', async ({ page }) => {
  await signIn(page, 'salarie@example.test');
  await page.goto(`/planning/semaine?semaine=${PUBLISHED_WEEK}`);

  await expect(page.getByText('Publiée').first()).toBeVisible();
  await expect(page.getByText('09:00–17:00').first()).toBeVisible();
});

test('un manager voit le brouillon et peut le publier', async ({ page }) => {
  await signIn(page, 'manager.nantes@example.test');
  await page.goto(`/planning/semaine?semaine=${CURRENT_WEEK}`);

  await expect(page.getByText('Brouillon').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publier' }).first()).toBeVisible();
});
