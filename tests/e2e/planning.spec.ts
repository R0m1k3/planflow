import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Parcours du planning : poser un créneau, publier, dépublier.
 *
 * Le test travaille sur une semaine **lointaine** plutôt que la semaine
 * courante : celle du seed change à chaque exécution, et un test qui dépend de
 * la date du jour finit par échouer un lundi de janvier sans que personne ne
 * sache pourquoi.
 *
 * La base de test n'est pas remise à zéro entre deux passages : la semaine est
 * donc vidée au début, sans quoi le second passage partirait d'un état publié
 * ou déjà rempli.
 */

const WEEK = '2027-W20';

function venteSection(page: Page): Locator {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Vente' }) });
}

async function resetWeek(page: Page): Promise<void> {
  await page.goto(`/planning/semaine?semaine=${WEEK}`);
  const section = venteSection(page);
  await expect(section).toBeVisible();

  const unpublish = section.getByRole('button', { name: 'Dépublier' });
  if (await unpublish.isVisible()) {
    await unpublish.click();
    await expect(section.getByText('Brouillon')).toBeVisible();
  }

  const remove = section.getByRole('button', { name: 'Supprimer le créneau' });
  for (let guard = 0; guard < 30; guard += 1) {
    const before = await remove.count();
    if (before === 0) break;
    await remove.first().click();
    // Compter plutôt que regarder un libellé : c'est la disparition du
    // créneau qui est attendue, et elle est observable sans ambiguïté.
    await expect(remove).toHaveCount(before - 1);
  }
  await expect(remove).toHaveCount(0);
}

async function addShift(
  page: Page,
  section: Locator,
  times: { start: string; end: string; pause?: string },
): Promise<Locator> {
  const row = section
    .locator('div')
    .filter({ hasText: /Camille Ferrand/ })
    .first();
  await row.getByRole('button', { name: /\+ Créneau/ }).first().click();

  const composer = page.locator('form').filter({ hasText: 'Poste' }).first();
  await composer.getByLabel('Début').fill(times.start);
  await composer.getByLabel('Fin').fill(times.end);
  await composer.getByLabel('Pause (min)').fill(times.pause ?? '0');
  await composer.getByRole('button', { name: 'Ajouter' }).click();
  return composer;
}

test('un manager pose un créneau, publie, puis dépublie', async ({ page }) => {
  await resetWeek(page);
  const section = venteSection(page);

  // Publier une semaine vide n'a pas de sens : rien à annoncer aux salariés.
  await section.getByRole('button', { name: 'Publier' }).click();
  await expect(section.getByText(/ne contient aucun créneau/)).toBeVisible();

  await addShift(page, section, {
    start: '08:30',
    end: '16:30',
    pause: '45',
  });

  await expect(section.getByText('08:30–16:30').first()).toBeVisible();
  // 8 h d'amplitude moins 45 min de pause : le compteur doit dire 7 h 15,
  // pas 8 h. C'est la déduction de la pause qui est vérifiée ici.
  await expect(section.getByText('7 h 15').first()).toBeVisible();

  // Un créneau qui recouvre le premier compterait deux fois en heures. Le
  // refus vient du serveur, en transaction, pas du formulaire.
  const composer = await addShift(page, section, {
    start: '12:00',
    end: '20:00',
  });
  await expect(composer.getByText(/recouvre cette plage/)).toBeVisible();
  await composer.getByRole('button', { name: 'Annuler' }).click();

  await section.getByRole('button', { name: 'Publier' }).click();
  await expect(section.getByText('Publiée')).toBeVisible();

  await section.getByRole('button', { name: 'Dépublier' }).click();
  await expect(section.getByText('Brouillon')).toBeVisible();
});

test('la navigation de semaine change la grille', async ({ page }) => {
  await page.goto(`/planning/semaine?semaine=${WEEK}`);
  await expect(
    page.getByRole('heading', { name: 'Planning · semaine 20' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Semaine suivante →' }).click();
  await expect(
    page.getByRole('heading', { name: 'Planning · semaine 21' }),
  ).toBeVisible();

  await page.getByRole('link', { name: '← Semaine précédente' }).click();
  await expect(
    page.getByRole('heading', { name: 'Planning · semaine 20' }),
  ).toBeVisible();
});
