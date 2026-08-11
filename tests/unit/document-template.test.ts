import { describe, expect, it } from 'vitest';

import {
  MissingTemplateValue,
  referencedFields,
  renderTemplate,
  TEMPLATE_FIELD_KEYS,
  unknownFields,
} from '@/domain/documents/template';

describe('referencedFields', () => {
  it('relève les variables citées, sans doublon', () => {
    const body = '<p>{{salarie.nom}} — {{salarie.nom}} {{contrat.debut}}</p>';
    expect(referencedFields(body)).toEqual(['salarie.nom', 'contrat.debut']);
  });

  it('tolère les espaces dans les accolades', () => {
    expect(referencedFields('{{ salarie.nom }}')).toEqual(['salarie.nom']);
  });
});

describe('unknownFields', () => {
  it('signale une variable que l’application ne sait pas résoudre', () => {
    // Le cas qui compte : la faute de frappe. Sans ce contrôle, le modèle
    // s'enregistre et échoue au moment de générer la pièce, devant le salarié.
    expect(unknownFields('{{salarie.salire}}')).toEqual(['salarie.salire']);
  });

  it('accepte toutes les variables du catalogue', () => {
    const body = TEMPLATE_FIELD_KEYS.map((key) => `{{${key}}}`).join(' ');
    expect(unknownFields(body)).toEqual([]);
  });
});

describe('renderTemplate', () => {
  it('remplace les variables par leur valeur', () => {
    const out = renderTemplate('<p>{{salarie.nom}}</p>', {
      'salarie.nom': 'Ferrand',
    });
    expect(out).toBe('<p>Ferrand</p>');
  });

  it('échappe la valeur, jamais le gabarit', () => {
    // Le corps est rédigé par un administrateur et reste de l'HTML ; la valeur
    // vient du dossier et pourrait porter un chevron.
    const out = renderTemplate('<p><strong>{{salarie.nom}}</strong></p>', {
      'salarie.nom': '<script>alert(1)</script>',
    });
    expect(out).toBe(
      '<p><strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong></p>',
    );
  });

  it('refuse de rendre une variable sans valeur', () => {
    // Une attestation trouée est un document faux, pas un document incomplet :
    // le blanc se remarque une fois sur deux, et la pièce part signée.
    expect(() =>
      renderTemplate('{{salarie.nom}} {{contrat.debut}}', {
        'salarie.nom': 'Ferrand',
      }),
    ).toThrow(MissingTemplateValue);
  });

  it('traite la chaîne vide comme une valeur manquante', () => {
    expect(() =>
      renderTemplate('{{salarie.nom}}', { 'salarie.nom': '' }),
    ).toThrow(MissingTemplateValue);
  });

  it('nomme les variables manquantes dans l’erreur', () => {
    try {
      renderTemplate('{{salarie.nom}} {{contrat.debut}}', {});
      expect.unreachable('le rendu aurait dû échouer');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingTemplateValue);
      expect((error as MissingTemplateValue).keys).toEqual([
        'salarie.nom',
        'contrat.debut',
      ]);
    }
  });
});
