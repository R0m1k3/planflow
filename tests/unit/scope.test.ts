import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError, type Actor } from '@/domain/access/authorize';
import {
  assertMemberInScope,
  assertResourceInScope,
  isMemberInScope,
  membershipScopeWhere,
} from '@/server/scope';
import type { ScopedClient } from '@/server/tenant';

/**
 * Périmètre appliqué aux objets chargés.
 *
 * Le mode de défaillance visé : un manager d'un établissement qui forge
 * l'identifiant d'un créneau, d'une demande ou d'un dossier d'un autre
 * établissement. La capacité seule ne suffit pas à le refuser.
 */

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    membershipId: 'm1',
    accountId: 'acc1',
    userId: 'u1',
    roleKey: 'manager',
    permissions: new Set(['planning.edit', 'timeoff.decide', 'members.view']),
    scope: { allLocations: false, locationIds: ['loc1'], teamIds: [] },
    ...overrides,
  };
}

function dbCounting(count: number) {
  const countFn = vi.fn().mockResolvedValue(count);
  return {
    db: { membership: { count: countFn } } as unknown as ScopedClient,
    countFn,
  };
}

describe('assertResourceInScope', () => {
  it('refuse un créneau d’un autre établissement', () => {
    expect(() =>
      assertResourceInScope(actor(), 'planning.edit', {
        locationId: 'loc2',
        teamId: 'team2',
      }),
    ).toThrow(AuthorizationError);
  });

  it('accepte un créneau de son établissement', () => {
    expect(() =>
      assertResourceInScope(actor(), 'planning.edit', {
        locationId: 'loc1',
        teamId: 'team1',
      }),
    ).not.toThrow();
  });

  it('accepte tout établissement au périmètre global', () => {
    const director = actor({
      scope: { allLocations: true, locationIds: [], teamIds: [] },
    });
    expect(() =>
      assertResourceInScope(director, 'planning.edit', { locationId: 'loc9' }),
    ).not.toThrow();
  });
});

describe('membershipScopeWhere', () => {
  it('ne filtre rien au périmètre global', () => {
    const director = actor({
      scope: { allLocations: true, locationIds: [], teamIds: [] },
    });
    expect(membershipScopeWhere(director)).toEqual({});
  });

  it('limite aux établissements et équipes couverts, et à soi', () => {
    const where = membershipScopeWhere(actor()) as { OR: unknown[] };
    expect(where.OR).toContainEqual({ id: 'm1' });
    expect(where.OR).toContainEqual({
      contracts: { some: { locationId: { in: ['loc1'] } } },
    });
  });
});

describe('isMemberInScope', () => {
  it('laisse toujours lire son propre dossier', async () => {
    const { db, countFn } = dbCounting(0);
    await expect(isMemberInScope(db, actor(), 'm1')).resolves.toBe(true);
    expect(countFn).not.toHaveBeenCalled();
  });

  it('refuse un salarié hors périmètre', async () => {
    const { db } = dbCounting(0);
    await expect(isMemberInScope(db, actor(), 'm2')).resolves.toBe(false);
    await expect(
      assertMemberInScope(db, actor(), 'timeoff.decide', 'm2'),
    ).rejects.toThrow(AuthorizationError);
  });

  it('accepte un salarié de son établissement', async () => {
    const { db } = dbCounting(1);
    await expect(
      assertMemberInScope(db, actor(), 'timeoff.decide', 'm2'),
    ).resolves.toBeUndefined();
  });
});
