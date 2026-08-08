import { expect, test } from '@playwright/test';

import { formatMonthParam, monthOf, previousMonth } from '../../src/domain/planning/month';

/**
 * Préparation de paie et export Silae.
 *
 * Ce que ces tests protègent : le refus de produire un fichier partiel. Un CSV
 * incomplet se charge sans erreur dans Silae et rend la paie fausse pour les
 * salariés qui en sont absents — l'échec est silencieux jusqu'au bulletin.
 */

// Le seed plante deux semaines autour d'aujourd'hui ; le mois précédent en
// contient donc une partie, quel que soit le jour d'exécution.
const MONTH = formatMonthParam(monthOf(new Date()));
const PREVIOUS = formatMonthParam(previousMonth(monthOf(new Date())));

test('le rapport de paie liste les éléments calculés', async ({ page }) => {
  await page.goto(`/paie?mois=${MONTH}`);

  await expect(page.getByRole('heading', { name: /^Paie · / })).toBeVisible();
  await expect(page.getByText('Heures travaillées').first()).toBeVisible();
  await expect(page.getByText('Jours travaillés').first()).toBeVisible();
});

test('l’export refuse de produire un fichier tant qu’un code n’est pas confirmé', async ({
  page,
}) => {
  await page.goto(`/paie?mois=${MONTH}`);

  // Le seed propose les codes lisibles mais n'en confirme aucun.
  await expect(
    page.getByText(/correspondance non confirmée/i).first(),
  ).toBeVisible();

  const exportButton = page.getByRole('button', { name: 'Exporter vers Silae' });
  await expect(exportButton).toBeDisabled();
});

test('l’écran des codes distingue proposer et confirmer', async ({ page }) => {
  await page.goto('/paie/silae');

  await expect(
    page.getByRole('heading', { name: 'Codes de paie Silae' }),
  ).toBeVisible();

  // Les codes relevés sur l'export réel sont proposés à la saisie…
  await expect(page.getByText('EV-HDimanche').first()).toBeVisible();
  await expect(page.getByText('AB-300').first()).toBeVisible();

  // …mais l'écran dit explicitement qu'il ne devine pas leur sens.
  await expect(page.getByText(/ne devine jamais leur signification/)).toBeVisible();

  // Un code sans confirmation ne suffit pas : la case est un acte distinct.
  const row = page
    .locator('form')
    .filter({ hasText: 'Heures du dimanche' })
    .first();
  await expect(row.getByRole('checkbox')).not.toBeChecked();
});

test('une correspondance ne peut pas être confirmée sans code', async ({
  page,
}) => {
  await page.goto('/paie/silae');

  const row = page
    .locator('form')
    .filter({ hasText: 'Jours de forfait' })
    .first();
  await row.getByRole('checkbox').check();
  await row.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(row.getByText(/sans code/)).toBeVisible();
});

test('le mois précédent reste consultable', async ({ page }) => {
  await page.goto(`/paie?mois=${PREVIOUS}`);
  await expect(page.getByRole('heading', { name: /^Paie · / })).toBeVisible();
});
