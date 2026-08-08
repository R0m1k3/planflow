import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import type { Page } from '@playwright/test';

import { totpCode, totpStep } from '../../src/domain/access/totp';

/**
 * Second facteur, côté tests.
 *
 * Le propriétaire de démonstration porte un rôle qui l'exige : la suite doit
 * donc l'enrôler pour de bon, en calculant les codes comme le ferait une
 * application d'authentification. Court-circuiter la vérification testerait un
 * produit que personne n'utilise.
 */

export const MFA_SECRET_FILE = 'test-results/.auth/mfa-secret.txt';

export interface RememberedSecret {
  secret: string;
  /** Dernier pas consommé, pour ne pas se heurter au refus de rejeu. */
  usedStep: number;
}

export function rememberSecret(secret: string, usedStep: number): void {
  mkdirSync(dirname(MFA_SECRET_FILE), { recursive: true });
  writeFileSync(
    MFA_SECRET_FILE,
    JSON.stringify({ secret, usedStep } satisfies RememberedSecret),
    'utf8',
  );
}

export function rememberedSecret(): RememberedSecret {
  return JSON.parse(readFileSync(MFA_SECRET_FILE, 'utf8')) as RememberedSecret;
}

export function codeNow(secret: string): string {
  return totpCode(secret, Date.now());
}

/**
 * Attend le pas suivant.
 *
 * Un code n'est accepté qu'une fois : deux connexions d'affilée dans la même
 * fenêtre de trente secondes échoueraient sans cette attente — ce qui est le
 * comportement voulu, pas un défaut à contourner en production.
 */
export async function waitForFreshCode(after: number): Promise<void> {
  while (totpStep(Date.now()) <= after) {
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

export function stepNow(): number {
  return totpStep(Date.now());
}

/** Répond au défi affiché après le mot de passe. */
export async function answerChallenge(
  page: Page,
  secret: string,
): Promise<void> {
  await page.getByLabel('Code').fill(codeNow(secret));
  await page.getByRole('button', { name: 'Vérifier' }).click();
}
