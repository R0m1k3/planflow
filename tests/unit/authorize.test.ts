import { describe, expect, it } from 'vitest';

import {
  authorize,
  AuthorizationError,
  can,
  canForMember,
  inScope,
  type Actor,
} from '@/domain/access/authorize';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CODES,
  SYSTEM_ROLES,
} from '@/domain/access/permissions';

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    membershipId: 'm1',
    accountId: 'acc1',
    userId: 'u1',
    roleKey: 'manager',
    permissions: new Set(['planning.view']),
    scope: { allLocations: false, locationIds: ['loc1'], teamIds: [] },
    ...overrides,
  };
}

describe('can', () => {
  it('refuse une capacité absente', () => {
    expect(can(actor(), 'planning.publish')).toBe(false);
  });

  it('accorde une capacité présente', () => {
    expect(can(actor(), 'planning.view')).toBe(true);
  });

  it('refuse hors du compte, même avec la capacité', () => {
    // Le cas qui compte : détenir le droit ne dit rien du périmètre.
    expect(
      can(actor(), 'planning.view', { accountId: 'autre-compte' }),
    ).toBe(false);
  });

  it('refuse un établissement hors périmètre', () => {
    expect(can(actor(), 'planning.view', { locationId: 'loc2' })).toBe(false);
    expect(can(actor(), 'planning.view', { locationId: 'loc1' })).toBe(true);
  });

  it('accorde tous les établissements au périmètre global', () => {
    const director = actor({
      scope: { allLocations: true, locationIds: [], teamIds: [] },
    });
    expect(can(director, 'planning.view', { locationId: 'loc99' })).toBe(true);
  });
});

describe('authorize', () => {
  it('lève quand la capacité manque', () => {
    expect(() => authorize(actor(), 'planning.publish')).toThrow(
      AuthorizationError,
    );
  });

  it('lève quand le périmètre ne couvre pas la ressource', () => {
    expect(() =>
      authorize(actor(), 'planning.view', { locationId: 'loc2' }),
    ).toThrow(/périmètre/);
  });

  it('ne lève pas quand tout est réuni', () => {
    expect(() =>
      authorize(actor(), 'planning.view', { locationId: 'loc1' }),
    ).not.toThrow();
  });
});

describe('canForMember', () => {
  const employee = actor({
    permissions: new Set(['counters.view_own']),
  });

  it('permet de voir ses propres compteurs', () => {
    expect(
      canForMember(employee, 'counters.view_own', 'counters.view_others', 'm1'),
    ).toBe(true);
  });

  it('refuse ceux des autres sans la capacité dédiée', () => {
    // L'audit relève ces deux droits explicitement séparés : les confondre
    // ouvrirait les compteurs de toute l'équipe à chaque salarié.
    expect(
      canForMember(employee, 'counters.view_own', 'counters.view_others', 'm2'),
    ).toBe(false);
  });
});

describe('inScope', () => {
  it('accepte une ressource sans périmètre précisé', () => {
    expect(inScope(actor())).toBe(true);
  });
});

describe('catalogue de capacités', () => {
  it('n’attribue que des capacités existantes', () => {
    // Une faute de frappe dans une attribution donnerait un rôle qui ne peut
    // rien faire, sans erreur au démarrage.
    const known = new Set(PERMISSION_CODES);
    for (const role of SYSTEM_ROLES) {
      for (const code of DEFAULT_ROLE_PERMISSIONS[role.key]) {
        expect(known.has(code), `${role.key} : capacité inconnue ${code}`).toBe(
          true,
        );
      }
    }
  });

  it('réserve la délégation du niveau propriétaire', () => {
    for (const role of SYSTEM_ROLES) {
      const has = DEFAULT_ROLE_PERMISSIONS[role.key].includes(
        'role_config.assign_owner_level',
      );
      expect(has, `${role.key}`).toBe(role.key === 'owner');
    }
  });

  it('ne donne pas les réglages au manager', () => {
    const manager = DEFAULT_ROLE_PERMISSIONS.manager;
    for (const code of [
      'settings.access',
      'settings.locations.manage',
      'settings.agreement.manage',
      'members.salary.view',
      'payroll.access',
    ]) {
      expect(manager, `manager ne doit pas détenir ${code}`).not.toContain(code);
    }
  });

  it('donne à l’employé le strict nécessaire', () => {
    const employee = DEFAULT_ROLE_PERMISSIONS.employee;
    expect(employee).toContain('timeoff.request');
    expect(employee).toContain('counters.view_own');
    expect(employee).not.toContain('counters.view_others');
    expect(employee).not.toContain('timeoff.decide');
    expect(employee).not.toContain('planning.publish');
  });

  it('utilise des codes stables de la forme ressource.action', () => {
    for (const code of PERMISSION_CODES) {
      expect(code, `${code} doit être en minuscules avec des points`).toMatch(
        /^[a-z_]+(\.[a-z_]+)+$/,
      );
    }
  });
});
