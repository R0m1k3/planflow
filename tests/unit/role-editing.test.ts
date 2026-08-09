import { describe, expect, it } from 'vitest';

import type { Actor } from '@/domain/access/authorize';
import {
  escalationRefusal,
  lockoutRefusal,
  OWNER_LEVEL_CAPABILITY,
  REFUSAL_MESSAGES,
  ROLE_ADMIN_CAPABILITY,
  slugifyRoleKey,
  type EditRefusal,
} from '@/domain/access/role-editing';

function actor(permissions: string[]): Actor {
  return {
    membershipId: 'm1',
    accountId: 'a1',
    userId: 'u1',
    roleKey: 'admin',
    permissions: new Set(permissions),
    scope: { allLocations: true, locationIds: [], teamIds: [] },
  };
}

describe('escalade', () => {
  it('laisse accorder ce qu’on détient', () => {
    expect(
      escalationRefusal({
        actor: actor(['planning.publish', ROLE_ADMIN_CAPABILITY]),
        previous: new Set(),
        next: new Set(['planning.publish']),
      }),
    ).toBeNull();
  });

  it('refuse d’accorder ce qu’on n’a pas', () => {
    // Sans cette règle, la première personne autorisée à éditer un rôle
    // s'accorde l'accès aux rémunérations en trois clics.
    expect(
      escalationRefusal({
        actor: actor([ROLE_ADMIN_CAPABILITY]),
        previous: new Set(),
        next: new Set(['members.salary.view']),
      }),
    ).toBe('ESCALATION');
  });

  it('traite le niveau propriétaire à part', () => {
    expect(
      escalationRefusal({
        actor: actor([ROLE_ADMIN_CAPABILITY]),
        previous: new Set(),
        next: new Set([OWNER_LEVEL_CAPABILITY]),
      }),
    ).toBe('OWNER_LEVEL');
  });

  it('laisse un propriétaire déléguer son niveau', () => {
    expect(
      escalationRefusal({
        actor: actor([ROLE_ADMIN_CAPABILITY, OWNER_LEVEL_CAPABILITY]),
        previous: new Set(),
        next: new Set([OWNER_LEVEL_CAPABILITY]),
      }),
    ).toBeNull();
  });

  it('laisse retirer une capacité qu’on ne détient pas', () => {
    // Réduire un droit n'a jamais élargi le sien : interdire ce retrait
    // empêcherait de corriger un rôle trop large.
    expect(
      escalationRefusal({
        actor: actor([ROLE_ADMIN_CAPABILITY]),
        previous: new Set(['members.salary.view', 'planning.publish']),
        next: new Set(['planning.publish']),
      }),
    ).toBeNull();
  });

  it('ignore une capacité déjà présente', () => {
    // Enregistrer un rôle sans y toucher ne doit pas échouer parce qu'il porte
    // une capacité que l'éditeur n'a pas.
    expect(
      escalationRefusal({
        actor: actor([ROLE_ADMIN_CAPABILITY]),
        previous: new Set(['members.salary.view']),
        next: new Set(['members.salary.view']),
      }),
    ).toBeNull();
  });
});

describe('verrouillage', () => {
  it('accepte tant qu’un rôle garde la gestion des droits', () => {
    expect(
      lockoutRefusal({
        rolesAfter: [
          { id: 'r1', permissions: new Set([ROLE_ADMIN_CAPABILITY]) },
          { id: 'r2', permissions: new Set(['planning.view']) },
        ],
      }),
    ).toBeNull();
  });

  it('refuse le retrait du dernier', () => {
    // Une organisation qui s'enferme dehors n'a plus d'autre recours qu'une
    // intervention en base.
    expect(
      lockoutRefusal({
        rolesAfter: [
          { id: 'r1', permissions: new Set(['planning.view']) },
          { id: 'r2', permissions: new Set(['planning.publish']) },
        ],
      }),
    ).toBe('LAST_ADMIN');
  });

  it('se juge sur l’ensemble, pas sur le rôle édité', () => {
    // Retirer la capacité d'un rôle est permis si un autre la conserve.
    expect(
      lockoutRefusal({
        rolesAfter: [
          { id: 'r1', permissions: new Set() },
          { id: 'r2', permissions: new Set([ROLE_ADMIN_CAPABILITY]) },
        ],
      }),
    ).toBeNull();
  });
});

describe('clé de rôle', () => {
  it('translittère et met en minuscules', () => {
    expect(slugifyRoleKey('Responsable de secteur')).toBe(
      'responsable-de-secteur',
    );
    expect(slugifyRoleKey('Chef d’équipe régionale')).toBe(
      'chef-d-equipe-regionale',
    );
  });

  it('ne laisse pas de tiret aux extrémités', () => {
    expect(slugifyRoleKey('  — Extra —  ')).toBe('extra');
  });

  it('rend une chaîne vide quand rien n’est utilisable', () => {
    // L'appelant refuse alors la création plutôt que de fabriquer une clé
    // arbitraire que personne ne reconnaîtra.
    expect(slugifyRoleKey('!!!')).toBe('');
  });

  it('borne la longueur', () => {
    expect(slugifyRoleKey('a'.repeat(80)).length).toBe(40);
  });
});

describe('messages de refus', () => {
  it('en fournit un pour chaque motif', () => {
    const refusals: EditRefusal[] = [
      'ESCALATION',
      'OWNER_LEVEL',
      'LAST_ADMIN',
      'SYSTEM_ROLE',
      'DUPLICATE_KEY',
      'ROLE_IN_USE',
      'NOT_FOUND',
    ];
    for (const refusal of refusals) {
      expect(REFUSAL_MESSAGES[refusal]).toBeTruthy();
    }
  });
});
