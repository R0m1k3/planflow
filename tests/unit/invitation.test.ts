import { describe, expect, it } from 'vitest';

import {
  composeInvitationToken,
  expiryFrom,
  INVITATION_TTL_DAYS,
  invitationState,
  MIN_PASSWORD_LENGTH,
  passwordProblem,
  splitInvitationToken,
} from '@/domain/access/invitation';

const now = new Date('2026-03-10T09:00:00Z');

function invitation(overrides: Partial<{
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}> = {}) {
  return {
    expiresAt: new Date('2026-03-17T09:00:00Z'),
    acceptedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

describe('état d’une invitation', () => {
  it('est en attente tant qu’elle n’a rien subi', () => {
    expect(invitationState(invitation(), now)).toBe('PENDING');
  });

  it('expire à l’instant exact de son échéance', () => {
    // La borne compte : une invitation « valable jusqu'au 17 » ne doit pas
    // rester utilisable une seconde de plus.
    const expiresAt = new Date('2026-03-10T09:00:00Z');
    expect(invitationState(invitation({ expiresAt }), now)).toBe('EXPIRED');
    expect(
      invitationState(
        invitation({ expiresAt: new Date('2026-03-10T09:00:01Z') }),
        now,
      ),
    ).toBe('PENDING');
  });

  it('reste acceptée après son expiration', () => {
    // Dire « expirée » d'un accès qui a servi tromperait celui qui relit le
    // dossier : l'accès existe, la date d'échéance ne le concerne plus.
    const state = invitationState(
      invitation({
        expiresAt: new Date('2026-01-01T00:00:00Z'),
        acceptedAt: new Date('2025-12-30T00:00:00Z'),
      }),
      now,
    );
    expect(state).toBe('ACCEPTED');
  });

  it('distingue la révocation de l’expiration', () => {
    expect(
      invitationState(invitation({ revokedAt: new Date('2026-03-09T00:00:00Z') }), now),
    ).toBe('REVOKED');
  });

  it('donne la priorité à l’acceptation sur la révocation', () => {
    // Révoquer après coup ne défait pas un accès déjà pris : c'est le
    // membership qu'il faut archiver, et le dossier doit le montrer.
    const state = invitationState(
      invitation({
        acceptedAt: new Date('2026-03-08T00:00:00Z'),
        revokedAt: new Date('2026-03-09T00:00:00Z'),
      }),
      now,
    );
    expect(state).toBe('ACCEPTED');
  });
});

describe('échéance', () => {
  it('court sur la durée annoncée', () => {
    const expiry = expiryFrom(now);
    const days = (expiry.getTime() - now.getTime()) / 86_400_000;
    expect(days).toBe(INVITATION_TTL_DAYS);
  });
});

describe('jeton de lien', () => {
  it('fait l’aller-retour', () => {
    const token = composeInvitationToken('acc_123', 'sEcReT-value');
    expect(splitInvitationToken(token)).toEqual({
      accountId: 'acc_123',
      secret: 'sEcReT-value',
    });
  });

  it('coupe au premier point seulement', () => {
    // Un secret contenant un point ne doit pas être tronqué : il partirait
    // valide dans le message et serait refusé au retour.
    expect(splitInvitationToken('acc.a.b.c')).toEqual({
      accountId: 'acc',
      secret: 'a.b.c',
    });
  });

  it('refuse les formes dégénérées', () => {
    expect(splitInvitationToken('sansPoint')).toBeNull();
    expect(splitInvitationToken('.secret')).toBeNull();
    expect(splitInvitationToken('compte.')).toBeNull();
    expect(splitInvitationToken('')).toBeNull();
  });
});

describe('mot de passe', () => {
  const personal = {
    firstName: 'Camille',
    lastName: 'Rivière',
    email: 'camille.riviere@example.fr',
  };

  it('accepte une phrase de passe', () => {
    expect(passwordProblem('le vent se leve en mars', personal)).toBeNull();
  });

  it('refuse en dessous de la longueur minimale', () => {
    const problem = passwordProblem('a'.repeat(MIN_PASSWORD_LENGTH - 1), {});
    expect(problem).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it('refuse un mot de passe contenant le nom', () => {
    // Prénom et nom sont les premières combinaisons essayées, et ce sont
    // précisément celles que l'invitation vient de divulguer.
    expect(passwordProblem('Camille-2026-ok', personal)).toMatch(/nom/);
    expect(passwordProblem('xx-riviere-xxxxxx', personal)).toMatch(/nom/);
  });

  it('refuse un mot de passe contenant l’adresse', () => {
    expect(
      passwordProblem('camille.riviere+1', personal),
    ).toMatch(/nom|adresse/);
  });

  it('ignore un nom trop court pour être discriminant', () => {
    // Sans ce garde-fou, un salarié nommé « Li » ne pourrait employer aucun
    // mot de passe contenant ces deux lettres.
    expect(passwordProblem('lit de camp fleuri', { lastName: 'Li' })).toBeNull();
  });

  it('refuse une répétition du même caractère', () => {
    expect(passwordProblem('aaaaaaaaaaaaaaaa', {})).toMatch(/répétition/);
  });

  it('borne la longueur haute', () => {
    // Argon2 sur une saisie de plusieurs mégaoctets immobiliserait le serveur.
    expect(passwordProblem('x'.repeat(201), {})).toMatch(/200/);
  });
});
