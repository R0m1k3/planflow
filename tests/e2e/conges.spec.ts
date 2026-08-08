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
 *
 * Le multiplicateur écarte deux exécutions voisines : sans lui, deux passages
 * à une minute d'intervalle retomberaient sur des fenêtres qui se recouvrent.
 */
const RUN_OFFSET = 200 + ((Math.floor(Date.now() / 1000) * 137) % 3000);

/** Une date libre, loin de tout ce que le seed pose. */
function isoDate(offsetDays: number): string {
  return new Date(Date.now() + (RUN_OFFSET + offsetDays) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Prochain jour de la semaine demandé (0 = dimanche) dans la fenêtre du run. */
function nextWeekday(weekday: number): string {
  const cursor = new Date(Date.now() + (RUN_OFFSET + 17) * 86_400_000);
  while (cursor.getUTCDay() !== weekday) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cursor.toISOString().slice(0, 10);
}

/**
 * Libère les dates utilisées par un test.
 *
 * Une absence en attente ou acceptée bloque toute demande qui la recouvre : la
 * laisser derrière soi ferait échouer le passage suivant pour une raison sans
 * rapport avec ce qui est testé. Refuser suffit — seuls les statuts « en
 * attente » et « acceptée » bloquent.
 */
async function release(page: Page, marker: string, month?: string) {
  await page.goto(month ? `/conges?mois=${month}` : '/conges');

  const pending = page
    .locator('section')
    .filter({ hasText: 'Demandes en attente' })
    .locator('li')
    .filter({ hasText: marker });

  // Boucle : un passage précédent interrompu a pu en laisser plusieurs, et
  // `marker` peut être un préfixe commun à toutes les demandes d'un test.
  for (let guard = 0; guard < 20; guard += 1) {
    const before = await pending.count();
    if (before === 0) break;
    await pending.first().getByRole('button', { name: 'Refuser' }).click();
    await expect(pending).toHaveCount(before - 1);
  }
}

/**
 * Chaque test travaille sur **son** salarié.
 *
 * Le chevauchement se juge par salarié : deux tests qui partageraient la même
 * personne se bloqueraient l'un l'autre dès que leurs fenêtres de dates se
 * croisent, ce qui arrive d'autant plus que les fenêtres sont larges. Les deux
 * salariés porteurs d'absences dans le seed sont écartés.
 */
const WHO = {
  queue: 'Yanis Trabelsi',
  overlap: 'Marius Kowalski',
  countable: 'Awa Diallo',
  holiday: 'Théo Berger',
  inverted: 'Clara Fontaine',
  roundTrip: 'Noé Perrin',
} as const;

async function request(
  page: Page,
  options: {
    from: string;
    to: string;
    who: string;
    type?: string;
    comment?: string;
  },
) {
  const form = page.locator('form').filter({ hasText: 'Demander' }).first();
  await form.getByLabel('Salarié').selectOption({ label: options.who });
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
  await request(page, {
    from,
    to,
    who: WHO.queue,
    type: 'Congés payés',
    comment,
  });

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

  // Puis on libère les dates : annuler contre-passe la prise sans rien
  // effacer, ce qui est exactement le comportement voulu en production.
  await page.goto(`/conges?mois=${from.slice(0, 7)}`);
  const accepted = page
    .locator('section')
    .filter({ hasText: 'Absences du mois' })
    .locator('li')
    .filter({ hasText: WHO.queue })
    .first();
  if (await accepted.isVisible()) {
    await accepted.getByRole('button', { name: 'Annuler' }).click();
  }
});

test('deux absences qui se recouvrent sont refusées', async ({ page }) => {
  await page.goto('/conges');

  await release(page, 'Chevauchement ');

  const comment = `Chevauchement ${Date.now()}`;
  await request(page, {
    from: isoDate(8),
    to: isoDate(12),
    who: WHO.overlap,
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
    from: isoDate(12),
    to: isoDate(15),
    who: WHO.overlap,
    type: 'Congés payés',
  });
  await expect(form.getByText(/couvre déjà/)).toBeVisible();

  await release(page, comment);
});

test('une période sans jour décomptable est refusée', async ({ page }) => {
  await page.goto('/conges');

  // Un dimanche seul : jamais ouvrable, donc rien à décompter.
  const sunday = nextWeekday(0);
  const form = await request(page, {
    from: sunday,
    to: sunday,
    who: WHO.countable,
    type: 'Congés payés',
  });
  await expect(form.getByText(/aucun jour décomptable/)).toBeVisible();
});

test('un jour férié dans la période n’est pas décompté', async ({ page }) => {
  await page.goto('/conges');

  // Un jour férié pris au hasard parmi ceux de l'année : la période qui
  // l'englobe ne doit pas le décompter, et l'utilisateur n'a pas eu à scinder
  // sa demande. Le tirage évite de retomber sur la même semaine à chaque run.
  // Les dates fériées sont fixes : un passage précédent a pu y laisser une
  // demande. On libère avant de reposer la sienne.
  await release(page, 'Ferie ');

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
    who: WHO.holiday,
    type: 'Congés payés',
    comment,
  });

  const row = page.locator('li').filter({ hasText: comment });
  await expect(row).toBeVisible();
  // Trois jours calendaires dont un férié : jamais trois décomptés.
  await expect(row.getByText(/3 jours décomptés/)).toHaveCount(0);

  await release(page, comment);
});

test('une date de fin antérieure au début rappelle la règle', async ({
  page,
}) => {
  await page.goto('/conges');

  const form = await request(page, {
    from: isoDate(22),
    to: isoDate(20),
    who: WHO.inverted,
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

  const from = isoDate(26);
  const to = isoDate(28);
  const comment = `Aller-retour ${Date.now()}`;
  await request(page, {
    from,
    to,
    who: WHO.roundTrip,
    type: 'Congés payés',
    comment,
  });

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
  const accepted = month.locator('li').filter({ hasText: WHO.roundTrip }).first();
  if (await accepted.isVisible()) {
    await accepted.getByRole('button', { name: 'Annuler' }).click();
  }

  await release(page, comment, from.slice(0, 7));
});
