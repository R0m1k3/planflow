import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

/**
 * Le scoping multi-tenant se dérive du schéma Prisma.
 *
 * Ce test protège la dérivation elle-même : le mode de défaillance n'est pas
 * d'écrire une mauvaise règle, c'est d'ajouter un modèle et d'oublier de le
 * déclarer quelque part. Il a déjà été rencontré une fois — quatre modèles
 * ajoutés au WP-02 échappaient au filtre.
 */
describe('modèles scopés', () => {
  const scoped = Prisma.dmmf.datamodel.models.filter((model) =>
    model.fields.some(
      (field) => field.name === 'accountId' && field.kind === 'scalar',
    ),
  );

  it('détecte tous les modèles portant accountId', () => {
    expect(scoped.length).toBeGreaterThanOrEqual(13);
  });

  it('couvre les modèles connus du périmètre', () => {
    const names = new Set(scoped.map((model) => model.name));
    for (const model of [
      'Location',
      'Team',
      'Membership',
      'Role',
      'AuditLog',
      'JobTitle',
      'Label',
      'AbsenceType',
      'LegalConfigEntry',
      'RetentionPolicy',
    ]) {
      expect(names.has(model), `${model} doit être scopé`).toBe(true);
    }
  });

  it('n’inclut pas les modèles volontairement globaux', () => {
    const names = new Set(scoped.map((model) => model.name));
    // Permission est un référentiel produit ; User et Session vivent avant
    // qu'un compte soit connu, au moment de l'authentification.
    for (const model of ['Permission', 'User', 'Session', 'Account']) {
      expect(names.has(model), `${model} ne doit pas être scopé`).toBe(false);
    }
  });
});
