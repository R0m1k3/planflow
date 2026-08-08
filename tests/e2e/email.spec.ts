import { expect, test } from '@playwright/test';

/**
 * Réglages d'envoi de courrier.
 *
 * Deux points à protéger : le mot de passe SMTP ne doit **jamais** revenir vers
 * l'écran, et un réglage non éprouvé ne doit pas se faire passer pour un
 * réglage qui marche.
 */

test('l’écran explique pourquoi ce réglage est nécessaire', async ({ page }) => {
  await page.goto('/reglages/email');

  await expect(
    page.getByRole('heading', { name: 'Envoi de courrier' }),
  ).toBeVisible();
  // PlanFlow n'envoie rien par lui-même : les messages partent du domaine du
  // client, et le dire évite la question « depuis quelle adresse ? ».
  await expect(page.getByText(/votre.+serveur de messagerie/i)).toBeVisible();
});

test('un réglage non testé est annoncé comme non vérifié', async ({ page }) => {
  await page.goto('/reglages/email');
  // Un réglage non éprouvé n'est pas un réglage, c'est une intention.
  await expect(page.getByText('Non vérifié')).toBeVisible();
});

test('le mot de passe n’est jamais renvoyé à l’écran', async ({ page }) => {
  await page.goto('/reglages/email');

  const secret = `secret-${Date.now()}`;
  const form = page.locator('form').filter({ hasText: 'Enregistrer' });

  await form.getByLabel('Serveur SMTP').fill('smtp.exemple.test');
  await form.getByLabel('Port', { exact: true }).fill('587');
  await form.getByLabel('Identifiant').fill('rh@exemple.test');
  await form.getByLabel('Mot de passe').fill(secret);
  await form.getByLabel('Nom d’expéditeur').fill('Test PlanFlow');
  await form.getByLabel('Adresse d’expéditeur').fill('rh@exemple.test');
  await form.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(page.getByText(/Réglages enregistrés/)).toBeVisible();

  // Le secret ne doit apparaître nulle part dans le HTML servi, ni en clair ni
  // dans une valeur de champ.
  await page.reload();
  expect(await page.content()).not.toContain(secret);
  await expect(form.getByLabel('Mot de passe')).toHaveValue('');
  await expect(form.getByLabel('Mot de passe')).toHaveAttribute(
    'placeholder',
    /inchangé/,
  );
});

test('une adresse d’expéditeur invalide est refusée', async ({ page }) => {
  await page.goto('/reglages/email');

  const form = page.locator('form').filter({ hasText: 'Enregistrer' });
  await form.getByLabel('Serveur SMTP').fill('smtp.exemple.test');
  await form.getByLabel('Nom d’expéditeur').fill('Test');
  // `type="email"` du navigateur bloquerait une saisie manifestement fausse :
  // on éprouve ici le contrôle serveur, avec une forme qui passe le premier.
  await form.getByLabel('Adresse d’expéditeur').fill('rh@exemple');
  await form.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(
    form.getByText(/adresse d’expéditeur n’est pas une adresse valide/),
  ).toBeVisible();
});

test('un envoi de test vers un serveur injoignable échoue proprement', async ({
  page,
}) => {
  await page.goto('/reglages/email');

  const form = page.locator('form').filter({ hasText: 'Enregistrer' });
  await form.getByLabel('Serveur SMTP').fill('smtp.invalide.test');
  await form.getByLabel('Port', { exact: true }).fill('587');
  await form.getByLabel('Nom d’expéditeur').fill('Test PlanFlow');
  await form.getByLabel('Adresse d’expéditeur').fill('rh@exemple.test');
  await form.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText(/Réglages enregistrés/)).toBeVisible();

  const testForm = page.locator('form').filter({ hasText: 'Envoyer un test' });
  await testForm.getByLabel('Envoyer un test à').fill('destinataire@exemple.test');
  await testForm.getByRole('button', { name: 'Envoyer un test' }).click();

  // L'échec est annoncé, pas avalé : un réglage muet se croit fonctionnel.
  await expect(testForm.getByText(/Connexion au serveur impossible/)).toBeVisible(
    { timeout: 30_000 },
  );
});
