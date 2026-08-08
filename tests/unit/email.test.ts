import { describe, expect, it } from 'vitest';

import {
  escapeHtml,
  formatSender,
  invitationMessage,
  isEmailAddress,
  redactSmtpError,
  render,
  testMessage,
} from '@/domain/email/message';

describe('adresse d’expéditeur', () => {
  it('compose un en-tête simple', () => {
    expect(formatSender({ name: 'Maison Rivage', address: 'rh@example.fr' })).toBe(
      'Maison Rivage <rh@example.fr>',
    );
  });

  it('met le nom entre guillemets dès qu’il contient une virgule', () => {
    // Sans guillemets, l'en-tête casse à la virgule et le message part avec un
    // second destinataire fantôme.
    expect(
      formatSender({ name: 'Maison Rivage, RH', address: 'rh@example.fr' }),
    ).toBe('"Maison Rivage, RH" <rh@example.fr>');
  });

  it('échappe les guillemets du nom', () => {
    expect(
      formatSender({ name: 'Le "Comptoir"', address: 'rh@example.fr' }),
    ).toBe('"Le \\"Comptoir\\"" <rh@example.fr>');
  });

  it('met entre guillemets un nom contenant un chevron', () => {
    // Un chevron non protégé ouvrirait une seconde adresse dans l'en-tête.
    expect(
      formatSender({ name: 'RH <interne>', address: 'rh@example.fr' }),
    ).toBe('"RH <interne>" <rh@example.fr>');
  });
});

describe('validation d’adresse', () => {
  it('accepte les formes usuelles', () => {
    expect(isEmailAddress('rh@example.fr')).toBe(true);
    expect(isEmailAddress('prenom.nom+rh@sous.example.co.uk')).toBe(true);
  });

  it('refuse ce qui n’en est pas une', () => {
    expect(isEmailAddress('rh@example')).toBe(false);
    expect(isEmailAddress('rh example.fr')).toBe(false);
    expect(isEmailAddress('')).toBe(false);
  });
});

describe('gabarit', () => {
  const layout = {
    title: 'Titre',
    intro: 'Bonjour Rémi,',
    body: ['Premier paragraphe.', 'Second paragraphe.'],
    action: { label: 'Ouvrir', url: 'https://exemple.test/a?b=c' },
    footer: 'Pied de message.',
  };

  it('produit les deux versions du même contenu', () => {
    // Un message dont la version texte diffère du HTML est un message qu'on n'a
    // pas relu, et beaucoup de filtres le remarquent avant le destinataire.
    const { text, html } = render(layout);
    for (const paragraph of layout.body) {
      expect(text).toContain(paragraph);
      expect(html).toContain(paragraph);
    }
    expect(text).toContain(layout.action.url);
    expect(html).toContain(layout.action.url);
  });

  it('rend le lien en clair dans la version texte', () => {
    const { text } = render(layout);
    expect(text).toContain('Ouvrir : https://exemple.test/a?b=c');
  });

  it('n’embarque aucune ressource distante', () => {
    // La charte de télémétrie vaut aussi pour le courrier : un pixel de suivi
    // dans un message RH est une collecte que personne n'a acceptée.
    const { html } = render(layout);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/url\(/i);
  });

  it('échappe le HTML du contenu', () => {
    const { html } = render({
      ...layout,
      intro: 'Bonjour <script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('échappement', () => {
  it('traite les cinq caractères qui comptent', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('message d’invitation', () => {
  const message = invitationMessage('salarie@example.test', {
    firstName: 'Rémi',
    accountName: 'Maison Rivage',
    url: 'https://planflow.example/invitation/abc',
    expiresAt: new Date('2026-09-15T00:00:00Z'),
  });

  it('nomme le destinataire et l’entreprise', () => {
    expect(message.to).toBe('salarie@example.test');
    expect(message.text).toContain('Rémi');
    expect(message.text).toContain('Maison Rivage');
  });

  it('annonce la date d’expiration', () => {
    // Un lien qui expire sans le dire produit un appel au support.
    expect(message.text).toContain('15 septembre 2026');
  });

  it('dit quoi faire si le message n’était pas attendu', () => {
    expect(message.text).toMatch(/ignorez-le/);
  });
});

describe('message de test', () => {
  it('explique le cas des indésirables', () => {
    // C'est la première difficulté rencontrée en configurant un envoi : le
    // message part mais n'arrive pas.
    const message = testMessage('rh@example.fr', 'Maison Rivage');
    expect(message.text).toMatch(/SPF, DKIM/);
  });
});

describe('erreurs SMTP', () => {
  it('masque la commande d’authentification', () => {
    // Les serveurs renvoient volontiers la commande AUTH en clair : la
    // recopier à l'écran ou au journal exposerait le mot de passe.
    const redacted = redactSmtpError(
      new Error('Invalid command: AUTH PLAIN AHJoQGV4YW1wbGUuZnIAczNjcmV0'),
    );
    expect(redacted).toContain('AUTH [masqué]');
    expect(redacted).not.toContain('AHJoQGV4YW1wbGUuZnIAczNjcmV0');
  });

  it('masque un mot de passe nommé', () => {
    expect(redactSmtpError(new Error('login failed: password=s3cret'))).toBe(
      'login failed: password [masqué]',
    );
  });

  it('remplace l’identifiant par un libellé', () => {
    const redacted = redactSmtpError(
      new Error('535 Authentication failed for rh@example.fr'),
      'rh@example.fr',
    );
    expect(redacted).toContain('[identifiant]');
    expect(redacted).not.toContain('rh@example.fr');
  });

  it('borne la longueur du message', () => {
    const redacted = redactSmtpError(new Error('x'.repeat(2000)));
    expect(redacted.length).toBeLessThanOrEqual(500);
  });

  it('accepte une valeur qui n’est pas une erreur', () => {
    expect(redactSmtpError('ECONNREFUSED')).toBe('ECONNREFUSED');
  });
});
