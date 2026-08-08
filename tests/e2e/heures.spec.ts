import { expect, test } from '@playwright/test';

import { formatMonthParam, monthOf, previousMonth } from '../../src/domain/planning/month';

/**
 * Heures et périodes de paie.
 *
 * Ce que ces tests protègent : qu'un mois transmis au cabinet ne se modifie
 * plus par inadvertance, et que rouvrir ce mois soit une décision justifiée
 * plutôt qu'un bouton.
 */

const MONTH = formatMonthParam(previousMonth(monthOf(new Date())));

/**
 * Mois propre à cette exécution.
 *
 * Une période est unique par (établissement, bornes) et la base n'est pas
 * remise à zéro entre deux passages : un mois calculé sur une plage étroite
 * finit par retomber sur une période déjà créée, et le test échoue pour une
 * raison sans rapport avec ce qu'il vérifie.
 */
const SALT = Math.floor(Date.now() / 1000);

function uniqueMonth(bucket: number): string {
  const year = 2100 + ((SALT + bucket * 997) % 400);
  const month = ((Math.floor(SALT / 400) + bucket) % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

test('le rapport d’heures affiche les trois grandeurs', async ({ page }) => {
  await page.goto(`/rapports/heures?mois=${MONTH}`);

  await expect(
    page.getByRole('heading', { name: /^Heures travaillées · / }),
  ).toBeVisible();

  // Sans saisie, le prévu fait foi — et l'écran le dit plutôt que d'afficher
  // un réalisé vide qu'on prendrait pour zéro heure.
  await expect(page.getByText(/le prévu fait foi/)).toBeVisible();
  await expect(page.getByText('prévu retenu').first()).toBeVisible();
});

test('l’écran dit que la validation ne conditionne pas le paiement', async ({
  page,
}) => {
  await page.goto(`/rapports/heures?mois=${MONTH}`);
  // Bloquer le paiement d'heures accomplies faute de validation est ce que la
  // matrice de conformité interdit : l'écran l'énonce pour qu'aucun manager ne
  // croie l'inverse.
  await expect(
    page.getByText(/elle ne les autorise pas à être payées/),
  ).toBeVisible();
});

test('verrouiller une période ferme le mois aux modifications', async ({
  page,
}) => {
  await page.goto('/paie/periodes');
  await expect(
    page.getByRole('heading', { name: 'Périodes de paie' }),
  ).toBeVisible();

  const month = uniqueMonth(0);
  const label = `Test ${Date.now()}`;

  const create = page.locator('form').filter({ hasText: 'Créer la période' });
  await create.getByLabel('Mois').fill(month);
  await create.getByLabel('Libellé').fill(label);
  await create.getByRole('button', { name: 'Créer la période' }).click();

  const card = page.locator('section').filter({ hasText: label }).first();
  await expect(card).toBeVisible();
  await expect(card.getByText('Ouverte')).toBeVisible();

  await card.getByRole('button', { name: 'Verrouiller la période' }).click();
  await expect(card.getByText('Verrouillée')).toBeVisible();

  // Déverrouiller sans motif est refusé : rouvrir périme les fichiers déjà
  // transmis, et six mois plus tard personne ne saurait pourquoi.
  const unlock = card.locator('form').filter({ hasText: 'Déverrouiller' });
  await expect(unlock.getByPlaceholder('Motif du déverrouillage')).toBeVisible();

  await unlock
    .getByPlaceholder('Motif du déverrouillage')
    .fill('Correction demandée par le cabinet');
  await unlock.getByRole('button', { name: 'Déverrouiller' }).click();
  await expect(card.getByText('Ouverte')).toBeVisible();
});

test('supprimer une période exige de retaper son libellé', async ({ page }) => {
  await page.goto('/paie/periodes');

  const month = uniqueMonth(1);
  const label = `Suppr ${Date.now()}`;

  const create = page.locator('form').filter({ hasText: 'Créer la période' });
  await create.getByLabel('Mois').fill(month);
  await create.getByLabel('Libellé').fill(label);
  await create.getByRole('button', { name: 'Créer la période' }).click();

  const card = page.locator('section').filter({ hasText: label }).first();
  await expect(card).toBeVisible();

  // Un simple « êtes-vous sûr » se clique sans lire : la confirmation demande
  // le libellé exact.
  const remove = card.locator('form').filter({ hasText: 'Supprimer' });
  await remove.getByRole('button', { name: 'Supprimer' }).click();
  await expect(remove.getByText(/saisissez le libellé exact/i)).toBeVisible();

  await remove.getByPlaceholder(`Saisir « ${label} »`).fill(label);
  await remove.getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.locator('section').filter({ hasText: label })).toHaveCount(
    0,
  );
});
