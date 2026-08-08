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

/**
 * Chaque test possède **sa** semaine : la suite tourne en parallèle, et deux
 * tests qui videraient puis rempliraient la même grille se marcheraient dessus.
 */
const WEEK = '2027-W20';
const CROSS_VIEW_WEEK = '2027-W22';

function venteSection(page: Page): Locator {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Vente' }) });
}

async function resetWeek(page: Page, week = WEEK): Promise<void> {
  await page.goto(`/planning/semaine?semaine=${week}`);
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
  // Viser la ligne par son rôle ARIA : `locator('div')` remonterait au
  // conteneur de la grille, et le premier bouton trouvé serait celui d'un
  // autre salarié — une erreur qui ne se voit pas à l'écran.
  const row = section
    .getByRole('row')
    .filter({ hasText: 'Camille Ferrand' })
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

  // Une semaine d'un seul créneau s'écarte forcément de la durée
  // contractuelle : le moteur le signale, et publier suppose de l'assumer.
  await section
    .getByPlaceholder(/^Motif —/)
    .fill('Semaine partielle, reprise progressive');
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

/**
 * Les vues lisent le même modèle.
 *
 * C'est le critère d'acceptation de WP-04 : un créneau posé dans la grille
 * hebdomadaire doit apparaître **identique** dans les vues jour, poste et
 * mois. Chacune interroge `Shift` directement ; ce test est ce qui empêche
 * l'une d'elles de dériver vers son propre calcul.
 */
test('un créneau posé se retrouve dans les quatre vues', async ({ page }) => {
  await resetWeek(page, CROSS_VIEW_WEEK);
  const section = venteSection(page);

  await addShift(page, section, { start: '08:30', end: '16:30', pause: '45' });
  await expect(section.getByText('08:30–16:30').first()).toBeVisible();

  // Lundi de la semaine 22 de 2027.
  const monday = '2027-05-31';

  await page.goto(`/planning/jour?jour=${monday}`);
  // Chercher le nom dans la chronologie, pas dans l'en-tête de l'application,
  // qui affiche déjà « Camille Ferrand, Propriétaire ».
  await expect(page.getByTitle(/^ENC · 08:30–16:30$|08:30–16:30/).first()).toBeVisible();
  await expect(
    page.locator('main').getByText('Camille Ferrand').first(),
  ).toBeVisible();

  await page.goto(`/planning/etiquettes?semaine=${CROSS_VIEW_WEEK}`);
  await expect(page.getByText('08:30–16:30').first()).toBeVisible();

  await page.goto('/planning/mois?mois=2027-05');
  const row = page.getByRole('row').filter({ hasText: 'Camille Ferrand' });
  // 8 h d'amplitude moins 45 min de pause : 7,3 h dans la case du jour. Les
  // deux vues doivent dire la même durée. `first()` parce que l'autre test de
  // ce fichier planifie le même salarié ailleurs dans le mois.
  await expect(row.getByText('7,3').first()).toBeVisible();
});

/**
 * Publier malgré une alerte de convention.
 *
 * Le critère d'acceptation de WP-05 : un avertissement ne bloque pas, mais il
 * exige une justification, qui reste attachée au constat. C'est ce qui
 * distingue une dérogation assumée d'une alerte ignorée.
 */
test('une alerte de convention exige une justification pour publier', async ({
  page,
}) => {
  const week = '2027-W24';
  await resetWeek(page, week);
  const section = venteSection(page);

  // 12 h de travail dans la journée : au-delà du maximum conventionnel de
  // 10 h, et sans les 20 min de pause dues au-delà de 6 h.
  await addShift(page, section, { start: '07:00', end: '19:00', pause: '0' });

  await expect(
    section.getByText(/au-delà du maximum de 10 h/).first(),
  ).toBeVisible();

  await section.getByRole('button', { name: 'Publier' }).click();
  await expect(section.getByText(/non justifiée/).first()).toBeVisible();
  await expect(section.getByText('Brouillon')).toBeVisible();

  await section
    .getByPlaceholder(/^Motif —/)
    .fill('Inventaire annuel, accord du salarié');
  await section.getByRole('button', { name: 'Publier' }).click();

  await expect(section.getByText('Publiée')).toBeVisible();
  // Le motif reste attaché au constat : l'alerte ne disparaît pas, elle est
  // assumée.
  await expect(
    section.getByText(/Inventaire annuel, accord du salarié/).first(),
  ).toBeVisible();
});

test('un créneau qui recouvre un autre est refusé, pas seulement signalé', async ({
  page,
}) => {
  const week = '2027-W26';
  await resetWeek(page, week);
  const section = venteSection(page);

  await addShift(page, section, { start: '09:00', end: '13:00' });
  await expect(section.getByText('09:00–13:00').first()).toBeVisible();

  const composer = await addShift(page, section, {
    start: '12:00',
    end: '17:00',
  });
  // Le chevauchement est une incohérence de données : la saisie est refusée,
  // pas enregistrée avec un badge.
  await expect(composer.getByText(/recouvre cette plage/)).toBeVisible();
  await expect(section.getByText('12:00–17:00')).toHaveCount(0);
});
