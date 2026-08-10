import { expect, test, type Page } from '@playwright/test';

/**
 * Fiche salarié — onglets et saisie du dossier.
 *
 * Le dossier personnel est la première chose qu'on remplit après une embauche,
 * et la dernière qu'on relit avant une déclaration. Ce parcours éprouve donc ce
 * que voit un gestionnaire : les onglets tiennent leur route, et ce qui est
 * saisi est encore là au rechargement.
 */

async function createEmployee(page: Page) {
  const suffix = `${Date.now()}-fiche`;
  const lastName = `Fiche${suffix}`;

  await page.goto('/equipe');
  // Le formulaire d’embauche n’est plus posé au bas de la liste : il s’ouvre
  // en modale, à la demande.
  await page.getByRole('button', { name: 'Ajouter un collaborateur' }).click();
  const form = page.locator('form').filter({ hasText: 'Ajouter' });
  await form.getByLabel('Prénom').fill('Awa');
  await form.getByLabel('Nom', { exact: true }).fill(lastName);
  await form.getByLabel('Matricule').fill(`FIC${suffix}`);
  // Le formulaire propose d’ouvrir un contrat d’emblée : ce parcours n’en veut
  // pas, et un salarié sans contrat doit rester créable.
  await form.getByLabel('Ouvrir un contrat maintenant').uncheck();
  await form.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Salarié ajouté.')).toBeVisible();

  await page.getByRole('link', { name: new RegExp(lastName) }).click();
  await expect(
    page.getByRole('heading', { name: new RegExp(lastName) }),
  ).toBeVisible();

  return { lastName, url: page.url() };
}

test('les onglets de la fiche sont des routes', async ({ page }) => {
  const employee = await createEmployee(page);

  // Le bandeau ne bouge pas d'un onglet à l'autre : c'est ce qui dit de qui on
  // parle pendant qu'on navigue.
  for (const [label, segment] of [
    ['Contrats', '/contrats'],
    ['Planification et accès', '/planification'],
    ['Congés et Absences', '/absences'],
    ['Documents', '/documents'],
  ] as const) {
    await page.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${segment}$`));
    await expect(
      page.getByRole('heading', { name: new RegExp(employee.lastName) }),
    ).toBeVisible();
  }

  // Rouvrir l'onglet directement par son adresse doit donner le même écran :
  // une fiche s'envoie par lien.
  await page.goto(`${employee.url}/contrats`);
  await expect(page.getByText('Tous les contrats et avenants')).toBeVisible();
});

test('le dossier personnel se saisit et se conserve', async ({ page }) => {
  const employee = await createEmployee(page);

  await expect(page.getByText('Non renseigné').first()).toBeVisible();
  await page
    .getByRole('button', { name: 'Modifier les informations personnelles' })
    .click();

  await page.getByLabel('Date de naissance').fill('1988-03-12');
  await page.getByLabel('Lieu de naissance').fill('Nancy');
  await page.getByLabel('Nationalité').fill('France');
  await page.getByLabel('Téléphone mobile').fill('+33 6 12 34 56 78');
  await page.getByLabel('Ville').fill('Frouard');
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();

  await expect(page.getByText('Nancy')).toBeVisible();

  // Le rechargement est la seule preuve qui vaille : un écran qui affiche ce
  // qu'on vient de taper ne dit rien de ce qui a été écrit.
  await page.goto(employee.url);
  await expect(page.getByText('Nancy')).toBeVisible();
  await expect(page.getByText('Frouard')).toBeVisible();
});

test('une date de naissance à venir est refusée', async ({ page }) => {
  await createEmployee(page);

  await page
    .getByRole('button', { name: 'Modifier les informations personnelles' })
    .click();
  await page.getByLabel('Date de naissance').fill('2999-01-01');
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();

  await expect(page.getByText('Date de naissance invalide.')).toBeVisible();
});

test('une embauche pose le contrat en même temps que le dossier', async ({
  page,
}) => {
  const suffix = `${Date.now()}-embauche`;
  const lastName = `Embauche${suffix}`;

  await page.goto('/equipe');
  // Le formulaire d’embauche n’est plus posé au bas de la liste : il s’ouvre
  // en modale, à la demande.
  await page.getByRole('button', { name: 'Ajouter un collaborateur' }).click();
  const form = page.locator('form').filter({ hasText: 'Ajouter' });
  await form.getByLabel('Prénom').fill('Sofia');
  await form.getByLabel('Nom', { exact: true }).fill(lastName);
  await form.getByLabel('Matricule').fill(`EMB${suffix}`);

  // Le contrat est proposé coché : un dossier créé sans lui n'apparaît sur
  // aucune grille et ne se déclare pas.
  await expect(
    form.getByLabel('Ouvrir un contrat maintenant'),
  ).toBeChecked();
  await form.getByLabel('Début du contrat').fill('2026-01-05');
  await form.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Salarié ajouté.')).toBeVisible();

  // Le rattachement paraît dans l'annuaire : un dossier sans contrat y porte
  // « Sans contrat », celui-ci porte son établissement.
  await expect(
    page.getByRole('row', { name: new RegExp(lastName) }),
  ).not.toContainText('Sans contrat');

  await page.getByRole('link', { name: new RegExp(lastName) }).click();
  // Le bandeau porte le contrat : c'est ce qui distingue un dossier embauché
  // d'un dossier ouvert.
  await expect(page.getByText('Type de contrat')).toBeVisible();
  await page.getByRole('link', { name: 'Contrats', exact: true }).click();
  await expect(page.getByText('35 heures hebdomadaires')).toBeVisible();
});
