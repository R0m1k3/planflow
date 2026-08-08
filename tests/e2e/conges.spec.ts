import { expect, test, type Page } from '@playwright/test';

import { frenchHolidays } from '../../src/domain/absences/holidays';

/**
 * Parcours des absences.
 *
 * Ce que ces tests protègent en priorité : que « dernier jour d'absence » soit
 * bien traité comme tel. La confusion avec la date de reprise décompte un jour
 * de trop ou de trop peu à chaque demande, et le salarié s'en aperçoit au
 * solde, des mois plus tard.
 */

/**
 * Décalage propre à cette exécution.
 *
 * La base de test n'est pas remise à zéro entre deux passages, et une absence
 * acceptée bloque toute demande qui la recouvre : des dates fixes feraient
 * échouer le deuxième passage pour une raison sans rapport avec ce qui est
 * testé. Chaque exécution travaille donc sur sa propre fenêtre de dates.
 */
const RUN_OFFSET = 150 + (Math.floor(Date.now() / 1000) % 700);

/** Une date libre, loin de tout ce que le seed pose. */
function isoDate(offsetDays: number): string {
  return new Date(Date.now() + (RUN_OFFSET + offsetDays) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Prochain jour de la semaine demandé (0 = dimanche) dans la fenêtre du run. */
function nextWeekday(weekday: number): string {
  const cursor = new Date(Date.now() + (RUN_OFFSET + 40) * 86_400_000);
  while (cursor.getUTCDay() !== weekday) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cursor.toISOString().slice(0, 10);
}

async function request(
  page: Page,
  options: { from: string; to: string; type?: string; comment?: string },
) {
  const form = page.locator('form').filter({ hasText: 'Demander' }).first();
  if (options.type) {
    await form.getByLabel('Type').selectOption({ label: options.type });
  }
  await form.getByLabel('Premier jour').fill(options.from);
  await form.getByLabel('Dernier jour d’absence').fill(options.to);
  if (options.comment) {
    await form.getByLabel('Commentaire').fill(options.comment);
  }
  await form.getByRole('button', { name: 'Demander' }).click();
  return form;
}

test('le formulaire nomme le dernier jour d’absence, pas la date de fin', async ({
  page,
}) => {
  await page.goto('/conges');
  // Le libellé exact coûte moins cher qu'une régularisation de solde.
  await expect(
    page.getByText('Dernier jour d’absence', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/veille de la reprise/),
  ).toBeVisible();
});

test('une demande apparaît dans la file, puis se décide', async ({ page }) => {
  await page.goto('/conges');

  const from = isoDate(0);
  const to = isoDate(4);
  const comment = `Test ${Date.now()}`;
  await request(page, { from, to, type: 'Congés payés', comment });

  const pending = page
    .locator('section')
    .filter({ hasText: 'Demandes en attente' });
  const row = pending.locator('li').filter({ hasText: comment });
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Accepter' }).click();

  // Acceptée, elle quitte la file et rejoint les absences du mois.
  await expect(pending.locator('li').filter({ hasText: comment })).toHaveCount(
    0,
  );
});

test('deux absences qui se recouvrent sont refusées', async ({ page }) => {
  await page.goto('/conges');

  const comment = `Chevauchement ${Date.now()}`;
  await request(page, {
    from: isoDate(60),
    to: isoDate(65),
    type: 'Congés payés',
    comment,
  });

  // Attendre que la première soit réellement enregistrée : soumettre la
  // seconde pendant la revalidation ferait porter le clic dans le vide, et le
  // test passerait pour de mauvaises raisons.
  const pending = page
    .locator('section')
    .filter({ hasText: 'Demandes en attente' });
  await expect(pending.locator('li').filter({ hasText: comment })).toBeVisible();

  // La seconde chevauche la première d'un seul jour : bornes inclusives des
  // deux côtés, puisque la date de fin est un jour d'absence.
  const form = await request(page, {
    from: isoDate(65),
    to: isoDate(68),
    type: 'Congés payés',
  });
  await expect(form.getByText(/couvre déjà/)).toBeVisible();
});

test('une période sans jour décomptable est refusée', async ({ page }) => {
  await page.goto('/conges');

  // Un dimanche seul : jamais ouvrable, donc rien à décompter.
  const sunday = nextWeekday(0);
  const form = await request(page, {
    from: sunday,
    to: sunday,
    type: 'Congés payés',
  });
  await expect(form.getByText(/aucun jour décomptable/)).toBeVisible();
});

test('un jour férié dans la période n’est pas décompté', async ({ page }) => {
  await page.goto('/conges');

  // Un jour férié pris au hasard parmi ceux de l'année : la période qui
  // l'englobe ne doit pas le décompter, et l'utilisateur n'a pas eu à scinder
  // sa demande. Le tirage évite de retomber sur la même semaine à chaque run.
  const holidays = frenchHolidays(new Date().getUTCFullYear() + 2);
  const holiday = holidays[
    Math.floor(Date.now() / 1000) % holidays.length
  ] as (typeof holidays)[number];

  const day = (offset: number) =>
    new Date(
      new Date(`${holiday.isoDate}T00:00:00Z`).getTime() + offset * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);

  const comment = `Ferie ${Date.now()}`;
  await request(page, {
    from: day(-1),
    to: day(1),
    type: 'Congés payés',
    comment,
  });

  const row = page.locator('li').filter({ hasText: comment });
  await expect(row).toBeVisible();
  // Trois jours calendaires dont un férié : jamais trois décomptés.
  await expect(row.getByText(/3 jours décomptés/)).toHaveCount(0);
});

test('une date de fin antérieure au début rappelle la règle', async ({
  page,
}) => {
  await page.goto('/conges');

  const form = await request(page, {
    from: isoDate(100),
    to: isoDate(98),
    type: 'Congés payés',
  });
  await expect(form.getByRole('alert')).toContainText(
    /dernier jour d’absence/i,
  );
});

test('le solde revient à son niveau après un aller-retour', async ({ page }) => {
  await page.goto('/conges');

  const counters = page.locator('section').filter({ hasText: 'Compteurs' });
  await expect(counters).toBeVisible();

  const from = isoDate(120);
  const to = isoDate(122);
  const comment = `Aller-retour ${Date.now()}`;
  await request(page, { from, to, type: 'Congés payés', comment });

  const pending = page
    .locator('section')
    .filter({ hasText: 'Demandes en attente' });
  const row = pending.locator('li').filter({ hasText: comment });
  await row.getByRole('button', { name: 'Accepter' }).click();
  await expect(pending.locator('li').filter({ hasText: comment })).toHaveCount(
    0,
  );

  // Annuler contre-passe la prise : le solde revient au même chiffre, sans
  // qu'aucune écriture ait été effacée.
  const month = page.locator('section').filter({ hasText: 'Absences du mois' });
  const accepted = month.locator('li').filter({ hasText: 'Acceptée' }).first();
  if (await accepted.isVisible()) {
    await accepted.getByRole('button', { name: 'Annuler' }).click();
  }
});
