import { expect, test } from '@playwright/test';

/**
 * Registre de paramétrage et création d'un salarié sans accès applicatif.
 *
 * Ces parcours n'éprouvent pas l'authentification : ils réutilisent la session
 * commune plutôt que d'ouvrir la leur. La direction porte un second facteur, et
 * un code TOTP ne sert qu'une fois — deux connexions parallèles sur ce compte
 * échoueraient, à raison.
 */

test('la direction lit et alimente le registre de paramétrage', async ({
  page,
}) => {
  await page.goto('/reglages/registre');

  await expect(
    page.getByRole('heading', { name: 'Registre de paramétrage juridique' }),
  ).toBeVisible();

  const parameter = `Durée quotidienne maximale ${Date.now()}`;
  // Ciblage par attribut `name` : les libellés portent un texte d'aide, et
  // celui de « Source » contient lui-même le mot « valeur », ce qui rend la
  // correspondance par libellé ambiguë.
  const form = page.locator('form').filter({ hasText: 'Consigner' });
  await form.locator('input[name="key"]').fill(parameter);
  await form.locator('input[name="value"]').fill('10 h');
  await form
    .locator('input[name="source"]')
    .fill('IDCC 1517 — texte consolidé Legifrance');
  await form.locator('input[name="population"]').fill('Tous les salariés');
  await page.getByRole('button', { name: 'Consigner' }).click();

  const row = page.getByRole('row', { name: new RegExp(parameter) });
  await expect(row).toBeVisible();

  // Consigné n'est pas approuvé : la matrice exige un approbateur nommé.
  await row.getByRole('button', { name: 'Approuver' }).click();
  await expect(row.getByText(/Approuvé le/)).toBeVisible();
});

test('un salarié sans compte applicatif est créable', async ({ page }) => {
  await page.goto('/equipe');

  await expect(page.getByRole('heading', { name: 'Équipe' })).toBeVisible();
  // L'effectif vient de la base, pas du module de démonstration : un annuaire
  // fabriqué à l'écran ne se filtrerait pas par matricule.
  await page
    .getByPlaceholder('Rechercher par prénom, nom ou matricule.')
    .fill('E0001');
  await expect(page.getByText(/^1 sur \d+ salariés$/)).toBeVisible();
  await page.goto('/equipe');

  // Nom unique par exécution : la base de test n'est pas remise à zéro entre
  // deux passages, et un nom fixe finirait par désigner plusieurs salariés.
  const matricule = `E9${Date.now() % 100000}`;
  const nom = `Sanscompte${matricule}`;
  // Le formulaire d’embauche n’est plus posé au bas de la liste : il s’ouvre
  // en modale, à la demande.
  await page.getByRole('button', { name: 'Ajouter un collaborateur' }).click();
  const form = page.locator('form').filter({ hasText: 'Ajouter' });
  await form.locator('input[name="firstName"]').fill('Sans');
  await form.locator('input[name="lastName"]').fill(nom);
  await form.locator('input[name="employeeNumber"]').fill(matricule);
  // Le formulaire propose d’ouvrir un contrat d’emblée : ce parcours n’en veut
  // pas, et un salarié sans contrat doit rester créable.
  await form.getByLabel('Ouvrir un contrat maintenant').uncheck();
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Salarié ajouté.')).toBeVisible();

  // Rechargement explicite : ce qui est vérifié ici est la persistance et la
  // présence dans l'annuaire, pas le moment exact où la revalidation atteint
  // le rendu courant.
  await page.reload();

  // Un salarié sans adresse doit exister : la plupart des équipes de vente ne
  // se connectent jamais à l'outil.
  // Sans compte applicatif, l'annuaire affiche le matricule sous le nom : c'est
  // la seule adresse à laquelle on désigne ce salarié.
  await expect(page.getByText(`Matricule ${matricule}`)).toBeVisible();
  // Le nom vit sur le dossier, pas sur le compte : un salarié sans accès
  // applicatif doit tout de même figurer nommément au registre du personnel.
  await expect(
    page.getByRole('link', { name: new RegExp(`Sans ${nom}`) }),
  ).toBeVisible();
});
