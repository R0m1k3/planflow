import { expect, test, type Page } from '@playwright/test';

import { backdateDocument } from './support/db';

/**
 * Durées de conservation — PLAN.md §12.5, matrice n° 21.
 *
 * Deux garanties opposées à tenir simultanément : ne rien purger faute de règle
 * déclarée, et purger effectivement dès qu'une règle échue s'applique. Les
 * traiter séparément laisserait passer une purge qui n'efface jamais rien.
 */

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n', 'ascii');

/** Objet propre à chaque exécution : les politiques s'accumulent en base. */
function objectType(tag: string): string {
  return `Test:${tag}:${Date.now()}`;
}

async function declarePolicy(
  page: Page,
  values: {
    objectType: string;
    durationMonths: string;
    justification: string;
    effectiveFrom: string;
  },
) {
  await page.goto('/reglages/conservation');
  const form = page.locator('form').filter({ hasText: 'Justification' });
  await form.getByLabel('Objet', { exact: true }).fill(values.objectType);
  await form.getByLabel('Durée en mois').fill(values.durationMonths);
  await form.getByLabel('En vigueur à partir du').fill(values.effectiveFrom);
  await form.getByLabel('Justification').fill(values.justification);
  await form.getByRole('button', { name: 'Enregistrer' }).click();
}

test('l’écran affirme qu’aucune durée n’est appliquée par défaut', async ({
  page,
}) => {
  await page.goto('/reglages/conservation');

  await expect(
    page.getByRole('heading', { name: 'Durées de conservation' }),
  ).toBeVisible();
  // La matrice interdit « cinq ans partout » : le dire à l'écran est ce qui
  // empêche de le rétablir par inadvertance.
  await expect(page.getByText(/aucune durée par défaut/i)).toBeVisible();
  // Le journal d'audit doit survivre aux données qu'il décrit.
  await expect(page.getByText(/journaux d’audit échappent à la purge/i)).toBeVisible();
});

test('une durée sans justification est refusée', async ({ page }) => {
  await page.goto('/reglages/conservation');

  const form = page.locator('form').filter({ hasText: 'Justification' });
  await form.getByLabel('Objet', { exact: true }).fill(objectType('sans-motif'));
  await form.getByLabel('Durée en mois').fill('12');
  await form.getByLabel('En vigueur à partir du').fill('2026-01-01');
  // Le `minLength` du navigateur bloquerait une saisie manifestement courte :
  // on éprouve ici le contrôle serveur, avec une forme qui passe le premier —
  // des espaces, que le serveur retire avant de mesurer.
  await form.getByLabel('Justification').fill('            ');
  await form.getByRole('button', { name: 'Enregistrer' }).click();

  // Une durée sans motif est une durée qu'on ne saura pas défendre.
  await expect(form.getByText(/Justifiez la durée/)).toBeVisible();
});

test('une durée déclarée apparaît avec sa justification', async ({ page }) => {
  const type = objectType('declare');
  await declarePolicy(page, {
    objectType: type,
    durationMonths: '36',
    justification: 'Décompte des jours de forfait : trois ans minimum.',
    effectiveFrom: '2026-01-01',
  });

  await expect(page.getByText('Durée enregistrée.')).toBeVisible();
  await page.reload();

  const row = page.getByRole('row', { name: new RegExp(type) });
  await expect(row).toBeVisible();
  await expect(row.getByText('36 mois')).toBeVisible();
  await expect(row.getByText(/trois ans minimum/)).toBeVisible();
});

test('un point de départ non calculable est signalé comme tel', async ({
  page,
}) => {
  const type = objectType('depart');
  await page.goto('/reglages/conservation');
  const form = page.locator('form').filter({ hasText: 'Justification' });
  await form.getByLabel('Objet', { exact: true }).fill(type);
  await form.getByLabel('Durée en mois').fill('60');
  await form.getByLabel('Point de départ').selectOption('employee_departure');
  await form.getByLabel('En vigueur à partir du').fill('2026-01-01');
  await form
    .getByLabel('Justification')
    .fill('Registre du personnel : cinq ans après le départ.');
  await form.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Durée enregistrée.')).toBeVisible();

  await page.reload();
  // PlanFlow ne modèle pas de date de départ : le dire plutôt que de laisser
  // croire que la politique s'applique.
  const row = page.getByRole('row', { name: new RegExp(type) });
  await expect(row.getByText('non calculable')).toBeVisible();
});

test('une pièce sans politique n’est jamais purgée', async ({ page }) => {
  // Le salarié et sa pièce sont propres à l'exécution : la purge est globale au
  // compte, et une pièce partagée verrait son sort décidé par un autre test.
  const suffix = `${Date.now()}-garde`;
  await page.goto('/equipe');
  // Le formulaire d’embauche n’est plus posé au bas de la liste : il s’ouvre
  // en modale, à la demande.
  await page.getByRole('button', { name: 'Ajouter un collaborateur' }).click();
  const create = page.locator('form').filter({ hasText: 'Ajouter' });
  await create.getByLabel('Prénom').fill('Garde');
  await create.getByLabel('Nom', { exact: true }).fill(`Garde${suffix}`);
  await create.getByLabel('Matricule').fill(`RET${suffix}`);
  // Le formulaire propose d’ouvrir un contrat d’emblée : ce parcours n’en veut
  // pas, et un salarié sans contrat doit rester créable.
  await create.getByLabel('Ouvrir un contrat maintenant').uncheck();
  await create.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Salarié ajouté.')).toBeVisible();

  await page.getByRole('link', { name: new RegExp(`Garde${suffix}`) }).click();
  await page.goto(`${page.url()}/documents`);
  const upload = page.locator('form').filter({ hasText: 'Déposer' });
  await upload.getByLabel('Catégorie').selectOption('OTHER');
  await upload
    .getByLabel('Fichier')
    .setInputFiles({
      name: `sans-politique-${suffix}.pdf`,
      mimeType: 'application/pdf',
      buffer: PDF,
    });
  await upload.getByRole('button', { name: 'Déposer' }).click();
  await expect(page.getByText(/déposé\./)).toBeVisible();

  // La catégorie « Autre » n'est visée par aucune politique semée.
  await expect(page.getByText(/échéance de conservation non fixée/)).toBeVisible();

  await page.goto('/reglages/conservation');
  await expect(
    page.getByText(new RegExp(`sans-politique-${suffix}`)),
  ).toBeVisible();
  await expect(
    page
      .locator('li')
      .filter({ hasText: `sans-politique-${suffix}` })
      .getByText('Aucune politique déclarée'),
  ).toBeVisible();
});

test('une pièce échue est effectivement effacée', async ({ page }) => {
  const suffix = `${Date.now()}-purge`;
  const fileName = `a-purger-${suffix}.pdf`;

  // Politique propre au test : viser une catégorie partagée ferait purger les
  // pièces des autres exécutions.
  await declarePolicy(page, {
    objectType: 'Document:REGISTER',
    durationMonths: '1',
    justification: 'Durée courte, déclarée pour éprouver la purge.',
    effectiveFrom: '2020-01-01',
  });
  await expect(page.getByText('Durée enregistrée.')).toBeVisible();

  await page.goto('/equipe');
  // Le formulaire d’embauche n’est plus posé au bas de la liste : il s’ouvre
  // en modale, à la demande.
  await page.getByRole('button', { name: 'Ajouter un collaborateur' }).click();
  const create = page.locator('form').filter({ hasText: 'Ajouter' });
  await create.getByLabel('Prénom').fill('Purge');
  await create.getByLabel('Nom', { exact: true }).fill(`Purge${suffix}`);
  await create.getByLabel('Matricule').fill(`PUR${suffix}`);
  // Le formulaire propose d’ouvrir un contrat d’emblée : ce parcours n’en veut
  // pas, et un salarié sans contrat doit rester créable.
  await create.getByLabel('Ouvrir un contrat maintenant').uncheck();
  await create.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByText('Salarié ajouté.')).toBeVisible();

  await page.getByRole('link', { name: new RegExp(`Purge${suffix}`) }).click();
  await page.goto(`${page.url()}/documents`);
  const dossier = page.url();
  const upload = page.locator('form').filter({ hasText: 'Déposer' });
  await upload.getByLabel('Catégorie').selectOption('REGISTER');
  await upload
    .getByLabel('Fichier')
    .setInputFiles({ name: fileName, mimeType: 'application/pdf', buffer: PDF });
  await upload.getByRole('button', { name: 'Déposer' }).click();
  await expect(page.getByText(`« ${fileName} » déposé.`)).toBeVisible();

  // Fraîchement déposée, elle n'est pas échue. Constaté sur le dossier, qui ne
  // liste que les pièces de ce salarié : l'écran de conservation tronque, et la
  // pièce d'un test neuf n'y figure pas tant qu'elle n'appelle aucune décision.
  await expect(page.getByText(/conservée jusqu’au/)).toBeVisible();

  // Seule l'échéance déclenche l'effacement, et elle se compte en mois.
  await backdateDocument(fileName, 3);
  await page.goto('/reglages/conservation');
  await expect(
    page.locator('li').filter({ hasText: fileName }).getByText('À purger'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Purger les pièces échues' }).click();
  await expect(page.getByText(/effacée/)).toBeVisible();

  // Effacée du dossier, et le contenu avec.
  await page.goto(dossier);
  await expect(page.getByRole('link', { name: fileName })).toHaveCount(0);
});
