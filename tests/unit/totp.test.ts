import { describe, expect, it } from 'vitest';

import {
  base32Decode,
  base32Encode,
  formatSecret,
  otpauthUri,
  totpCode,
  totpCodeAtStep,
  totpStep,
  TOTP_STEP_SECONDS,
  verifyTotp,
} from '@/domain/access/totp';
import { mfaRequired } from '@/domain/access/mfa-policy';

/**
 * Vecteurs de la RFC 6238, appendice B.
 *
 * Le secret y est la chaîne ASCII « 12345678901234567890 ». Éprouver contre des
 * valeurs publiées est ce qui distingue « le code change toutes les trente
 * secondes » de « le code est celui qu'attend l'application du téléphone ».
 */
const RFC_SECRET = base32Encode(
  Uint8Array.from(Buffer.from('12345678901234567890', 'ascii')),
);

describe('base32', () => {
  it('fait l’aller-retour', () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 255, 128, 64]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it('encode selon l’alphabet standard', () => {
    expect(base32Encode(Uint8Array.from(Buffer.from('foobar', 'ascii')))).toBe(
      'MZXW6YTBOI',
    );
  });

  it('tolère espaces, minuscules et remplissage', () => {
    // Un secret recopié à la main arrive rarement propre.
    expect(base32Decode('mzxw 6ytb oi==')).toEqual(
      base32Decode('MZXW6YTBOI'),
    );
  });

  it('refuse un caractère hors alphabet', () => {
    expect(() => base32Decode('MZXW6YTB01')).toThrow(/base32/);
  });
});

describe('TOTP — vecteurs RFC 6238', () => {
  // La RFC publie huit chiffres ; PlanFlow en produit six, soit les six
  // derniers du même calcul.
  const vectors: Array<[seconds: number, expected: string]> = [
    [59, '287082'],
    [1_111_111_109, '081804'],
    [1_111_111_111, '050471'],
    [1_234_567_890, '005924'],
    [2_000_000_000, '279037'],
  ];

  for (const [seconds, expected] of vectors) {
    it(`produit ${expected} à T=${seconds}`, () => {
      expect(totpCode(RFC_SECRET, seconds * 1000)).toBe(expected);
    });
  }
});

describe('pas de temps', () => {
  it('avance toutes les trente secondes', () => {
    expect(totpStep(0)).toBe(0);
    expect(totpStep((TOTP_STEP_SECONDS - 1) * 1000)).toBe(0);
    expect(totpStep(TOTP_STEP_SECONDS * 1000)).toBe(1);
  });
});

describe('vérification', () => {
  const now = 1_700_000_000_000;

  it('accepte le code courant', () => {
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, now), now).ok).toBe(true);
  });

  it('tolère un pas de dérive de part et d’autre', () => {
    // Une horloge de téléphone en avance de quelques secondes est courante ;
    // refuser cette dérive rendrait le facteur inutilisable un jour sur deux.
    const step = totpStep(now);
    for (const offset of [-1, 1]) {
      const code = totpCodeAtStep(RFC_SECRET, step + offset);
      expect(verifyTotp(RFC_SECRET, code, now).ok).toBe(true);
    }
  });

  it('refuse au-delà de la tolérance', () => {
    const code = totpCodeAtStep(RFC_SECRET, totpStep(now) + 2);
    expect(verifyTotp(RFC_SECRET, code, now).ok).toBe(false);
  });

  it('refuse le rejeu d’un code déjà employé', () => {
    // Sans cela, le facteur protège d'un mot de passe volé mais pas d'un code
    // lu par-dessus l'épaule pendant ses trente secondes.
    const step = totpStep(now);
    const code = totpCodeAtStep(RFC_SECRET, step);
    expect(verifyTotp(RFC_SECRET, code, now, null)).toEqual({ ok: true, step });
    expect(verifyTotp(RFC_SECRET, code, now, step).ok).toBe(false);
  });

  it('refuse aussi un code antérieur au dernier employé', () => {
    const step = totpStep(now);
    const previous = totpCodeAtStep(RFC_SECRET, step - 1);
    expect(verifyTotp(RFC_SECRET, previous, now, step).ok).toBe(false);
  });

  it('refuse ce qui n’a pas la forme d’un code', () => {
    expect(verifyTotp(RFC_SECRET, '12345', now).ok).toBe(false);
    expect(verifyTotp(RFC_SECRET, 'abcdef', now).ok).toBe(false);
    expect(verifyTotp(RFC_SECRET, '', now).ok).toBe(false);
  });

  it('ignore les espaces de saisie', () => {
    const code = totpCode(RFC_SECRET, now);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotp(RFC_SECRET, spaced, now).ok).toBe(true);
  });
});

describe('URI otpauth', () => {
  const uri = otpauthUri({
    secret: 'JBSWY3DPEHPK3PXP',
    account: 'camille@example.fr',
    issuer: 'Maison Rivage',
  });

  it('porte l’émetteur dans le chemin et en paramètre', () => {
    // Les applications n'ont jamais convergé : n'en fournir qu'une donne des
    // entrées mal nommées chez la moitié des utilisateurs.
    expect(uri).toContain('otpauth://totp/Maison%20Rivage:');
    expect(uri).toContain('issuer=Maison+Rivage');
  });

  it('déclare les paramètres attendus', () => {
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });

  it('échappe l’adresse', () => {
    expect(uri).toContain('camille%40example.fr');
  });
});

describe('secret lisible', () => {
  it('se groupe par quatre', () => {
    expect(formatSecret('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP');
  });
});

describe('obligation de second facteur', () => {
  it('vise qui distribue les droits', () => {
    expect(mfaRequired(new Set(['settings.roles.manage']))).toBe(true);
  });

  it('vise qui lit les rémunérations', () => {
    expect(mfaRequired(new Set(['members.salary.view']))).toBe(true);
  });

  it('épargne un salarié ordinaire', () => {
    // Imposer le facteur à toute l'équipe de vente le rendrait contournable
    // par la première demande d'assistance.
    expect(mfaRequired(new Set(['planning.view', 'timeoff.request']))).toBe(
      false,
    );
  });
});
