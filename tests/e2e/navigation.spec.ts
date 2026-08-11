import { expect, test } from '@playwright/test';

test('les six écrans se chargent et affichent leur contenu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aperçu RH' })).toBeVisible();

  await page.getByRole('link', { name: 'Plannings' }).click();
  await expect(
    page.getByRole('heading', { name: /Planning · semaine \d+/ }),
  ).toBeVisible();
  // La grille doit porter des créneaux venus de la base, pas seulement son
  // ossature : le seed plante deux semaines sur trois équipes.
  await expect(page.getByRole('heading', { name: 'Vente' })).toBeVisible();
  await expect(page.getByText('09:00–17:00').first()).toBeVisible();

  await page.getByRole('link', { name: 'Vue jour' }).click();
  await expect(
    page.getByRole('heading', { name: /^Planning · / }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Équipe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Équipe' })).toBeVisible();

  // La fiche est atteinte depuis l'annuaire réel, plus depuis un lien codé
  // en dur : l'identifiant est celui de la base.
  await page.getByRole('link', { name: /Camille Ferrand/ }).first().click();
  await expect(
    page.getByRole('heading', { name: /Camille Ferrand/ }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Congés' }).click();
  await expect(
    page.getByRole('heading', { name: 'Calendrier des absences' }),
  ).toBeVisible();
});

test('le thème bascule et survit à un rechargement', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: /^Thème/ }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // Le script inline doit reposer le thème avant le premier rendu : sans lui,
  // la page reviendrait en clair puis basculerait — un flash blanc.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('une entrée de navigation non construite mène à un écran explicite', async ({
  page,
}) => {
  // La barre latérale n'affiche que la section courante : on l'ouvre d'abord.
  await page.goto('/absences/calendrier');
  // « Politiques de congés » fait partie du périmètre visé mais n'est pas
  // encore construit : l'entrée reste, et mène à un écran qui le dit.
  await page.getByRole('link', { name: 'Politiques de congés' }).click();
  await expect(
    page.getByRole('heading', { name: 'Politiques de congés' }),
  ).toBeVisible();
  // `exact` évite de heurter l'annonceur de route de Next, qui répète le titre
  // du document — « Écran à venir · PlanFlow ».
  await expect(
    page.getByText('Écran à venir', { exact: true }),
  ).toBeVisible();
});
