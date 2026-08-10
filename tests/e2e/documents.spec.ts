import { expect, test, type Page } from '@playwright/test';

/**
 * Pièces du dossier salarié — PLAN.md §3.6 et WP-10.
 *
 * Trois garanties à protéger : le contenu revient tel qu'il a été déposé, le
 * lien expire, et il ne suffit pas à lui seul — un navigateur sans session
 * n'obtient rien.
 *
 * Chaque test dépose sur **son** salarié : les pièces s'accumulent, et deux
 * tests qui se partageraient un dossier compteraient les pièces de l'autre.
 *
 * Les liens sont suivis par **navigation** et non par le client HTTP de
 * Playwright : le cookie de session est marqué `Secure`, et ce client ne
 * l'émet pas sur http, ce qui ferait passer les refus pour de bonnes raisons
 * sans rien prouver.
 */

/** Un PDF minimal mais authentique : le type est contrôlé au dépôt. */
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'ascii',
);

async function createEmployee(page: Page, tag: string) {
  const suffix = `${Date.now()}-${tag}`;
  const lastName = `Dossier${suffix}`;

  await page.goto('/equipe');
  // Le formulaire d’embauche n’est plus posé au bas de la liste : il s’ouvre
  // en modale, à la demande.
  await page.getByRole('button', { name: 'Ajouter un collaborateur' }).click();
  const form = page.locator('form').filter({ hasText: 'Informations salarié' });
  await form.getByLabel('Prénom').fill('Inès');
  await form.getByLabel('Nom de famille').fill(lastName);
  await form.getByRole('button', { name: 'Saisir un matricule' }).click();
  await form.getByLabel('Matricule').fill(`DOC${suffix}`);
  // Le formulaire propose d’ouvrir un contrat d’emblée : ce parcours n’en veut
  // pas, et un salarié sans contrat doit rester créable.
  await form.getByLabel('Ouvrir un contrat maintenant').uncheck();
  await form.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Salarié ajouté.')).toBeVisible();

  await page.getByRole('link', { name: new RegExp(lastName) }).click();
  await expect(page.getByRole('heading', { name: new RegExp(lastName) })).toBeVisible();

  // La fiche s'ouvre sur les informations personnelles : les pièces sont un
  // onglet, et une route à part entière.
  await page.goto(`${page.url()}/documents`);
  return { lastName, url: page.url() };
}

/**
 * Récupère une pièce depuis la page elle-même.
 *
 * `page.goto` sur un PDF passe par la visionneuse intégrée de Chromium, qui ne
 * restitue pas le corps ; une requête émise depuis la page contourne cela et
 * emporte les mêmes cookies que la navigation.
 */
async function fetchDocument(page: Page, href: string) {
  return page.evaluate(async (target) => {
    const response = await fetch(target);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      base64: btoa(binary),
    };
  }, href);
}

function uploadForm(page: Page) {
  return page.locator('form').filter({ hasText: 'Déposer' });
}

async function upload(page: Page, category: string, name: string) {
  await uploadForm(page).getByLabel('Catégorie').selectOption(category);
  await uploadForm(page)
    .getByLabel('Fichier')
    .setInputFiles({ name, mimeType: 'application/pdf', buffer: PDF });
  await uploadForm(page).getByRole('button', { name: 'Déposer' }).click();
  await expect(page.getByText(`« ${name} » déposé.`)).toBeVisible();
}

test('une pièce déposée se relit à l’identique', async ({ page }) => {
  await createEmployee(page, 'depot');

  await expect(page.getByText(/Aucune pièce/)).toBeVisible();
  await upload(page, 'IDENTITY', 'carte-identite.pdf');

  const link = page.getByRole('link', { name: 'carte-identite.pdf' });
  await expect(link).toBeVisible();

  const href = (await link.getAttribute('href'))!;
  const response = await fetchDocument(page, href);
  expect(response.status).toBe(200);
  expect(response.contentType).toBe('application/pdf');
  // Le contenu traverse un chiffrement au repos : il doit revenir tel quel.
  expect(Buffer.from(response.base64, 'base64').equals(PDF)).toBe(true);
});

test('un arrêt de travail est signalé comme donnée de santé', async ({
  page,
}) => {
  await createEmployee(page, 'sante');
  await upload(page, 'SICK_NOTE', 'arret.pdf');

  // Celui qui ouvre la pièce doit savoir que sa consultation laisse une trace
  // nominative — c'est la contrepartie de la journalisation, pas un détail.
  await expect(page.getByText('Santé · lecture journalisée')).toBeVisible();

  const href = (await page
    .getByRole('link', { name: 'arret.pdf' })
    .getAttribute('href'))!;
  expect((await fetchDocument(page, href)).status).toBe(200);
});

test('un lien de téléchargement ne vaut rien sans session', async ({
  page,
  browser,
}) => {
  await createEmployee(page, 'anonyme');
  await upload(page, 'CONTRACT', 'contrat.pdf');

  const href = (await page
    .getByRole('link', { name: 'contrat.pdf' })
    .getAttribute('href'))!;

  // La signature seule ne suffit pas : un lien recopié dans un message ne doit
  // rien ouvrir à qui n'a pas le droit de lire le dossier.
  const guest = await browser.newContext({ storageState: undefined });
  const guestPage = await guest.newPage();
  await guestPage.goto(new URL(href, page.url()).toString());

  // Renvoyé vers la connexion, et sans une once du contenu.
  await expect(guestPage).toHaveURL(/connexion/);
  expect(await guestPage.content()).not.toContain('%PDF');
  await guest.close();
});

test('un lien altéré ou expiré est refusé', async ({ page }) => {
  await createEmployee(page, 'signature');
  await upload(page, 'BANK', 'rib.pdf');

  const href = (await page
    .getByRole('link', { name: 'rib.pdf' })
    .getAttribute('href'))!;
  const url = new URL(href, page.url());

  // Signature falsifiée.
  const forged = new URL(url);
  forged.searchParams.set('s', 'signature-inventee');
  expect((await fetchDocument(page, forged.toString())).status).toBe(400);

  // Échéance repoussée à la main : la signature ne couvre plus la valeur.
  const extended = new URL(url);
  extended.searchParams.set('e', String(Math.floor(Date.now() / 1000) + 86_400));
  expect((await fetchDocument(page, extended.toString())).status).toBe(400);

  // Échéance passée : refusée aussi, mais après contrôle de la signature —
  // répondre « expiré » à un lien fabriqué indiquerait qu'il aurait pu marcher.
  const stale = new URL(url);
  stale.searchParams.set('e', '1');
  expect((await fetchDocument(page, stale.toString())).status).toBe(400);
});

test('un format non accepté est refusé', async ({ page }) => {
  await createEmployee(page, 'format');

  await uploadForm(page)
    .getByLabel('Fichier')
    .setInputFiles({
      name: 'macro.xls',
      mimeType: 'application/vnd.ms-excel',
      buffer: Buffer.from('sans importance'),
    });
  await uploadForm(page).getByRole('button', { name: 'Déposer' }).click();

  await expect(page.getByText(/Format non accepté/)).toBeVisible();
  await expect(page.getByText(/Aucune pièce/)).toBeVisible();
});

test('une pièce retirée n’est plus servie', async ({ page }) => {
  await createEmployee(page, 'retrait');
  await upload(page, 'OTHER', 'note.pdf');

  const href = (await page
    .getByRole('link', { name: 'note.pdf' })
    .getAttribute('href'))!;

  await page
    .locator('li')
    .filter({ hasText: 'note.pdf' })
    .getByRole('button', { name: 'Retirer' })
    .click();
  await expect(page.getByText('Pièce retirée.')).toBeVisible();

  await expect(page.getByText(/Aucune pièce/)).toBeVisible();

  // Le lien signé reste valide dans sa fenêtre, mais le document ne l'est plus.
  expect((await fetchDocument(page, href)).status).toBe(404);
});
