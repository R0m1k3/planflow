import { describe, expect, it } from 'vitest';

import {
  asciiFileName,
  CATEGORY_LABELS,
  DOCUMENT_CATEGORIES,
  formatBytes,
  isLinkExpired,
  isSensitiveCategory,
  MAX_DOCUMENT_BYTES,
  sanitiseFileName,
  uploadProblem,
} from '@/domain/documents/rules';

describe('catégories', () => {
  it('portent toutes un libellé', () => {
    // Une catégorie sans libellé s'afficherait en majuscules anglaises dans un
    // dossier RH français.
    for (const category of DOCUMENT_CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeTruthy();
    }
  });

  it('classent l’arrêt de travail en donnée de santé', () => {
    expect(isSensitiveCategory('SICK_NOTE')).toBe(true);
  });

  it('n’étendent pas la sensibilité à tout le dossier', () => {
    // Marquer tout comme sensible noierait les lectures qui comptent vraiment
    // sous un journal que personne ne relit.
    expect(isSensitiveCategory('IDENTITY')).toBe(false);
    expect(isSensitiveCategory('CONTRACT')).toBe(false);
  });
});

describe('contrôle du dépôt', () => {
  const valid = {
    name: 'attestation.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
  };

  it('accepte un PDF ordinaire', () => {
    expect(uploadProblem(valid)).toBeNull();
  });

  it('refuse un fichier vide', () => {
    expect(uploadProblem({ ...valid, sizeBytes: 0 })).toMatch(/vide/);
  });

  it('refuse au-delà de la taille maximale', () => {
    expect(
      uploadProblem({ ...valid, sizeBytes: MAX_DOCUMENT_BYTES + 1 }),
    ).toMatch(/20 Mio/);
    expect(uploadProblem({ ...valid, sizeBytes: MAX_DOCUMENT_BYTES })).toBeNull();
  });

  it('refuse un format hors de la liste', () => {
    // Les formats bureautiques à macros n'ont aucun usage ici.
    expect(
      uploadProblem({ ...valid, mimeType: 'application/vnd.ms-excel' }),
    ).toMatch(/Format non accepté/);
    expect(uploadProblem({ ...valid, mimeType: 'text/html' })).toMatch(
      /Format non accepté/,
    );
  });

  it('accepte les images de scan', () => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/webp', 'image/heic']) {
      expect(uploadProblem({ ...valid, mimeType })).toBeNull();
    }
  });
});

describe('nom de fichier', () => {
  it('ne garde que le dernier segment', () => {
    // Le nom ne désigne jamais l'emplacement — celui-ci est tiré au sort — mais
    // le nettoyer évite qu'un chemin s'affiche tel quel dans le dossier.
    expect(sanitiseFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitiseFileName('C:\\Users\\moi\\carte.pdf')).toBe('carte.pdf');
  });

  it('retire ce qui casserait l’en-tête de téléchargement', () => {
    // Un guillemet ou un retour à la ligne permettrait d'injecter un second
    // champ dans `Content-Disposition`.
    expect(sanitiseFileName('rib".pdf')).toBe('rib.pdf');
    expect(sanitiseFileName('note\r\ninjectée.pdf')).toBe('noteinjectée.pdf');
  });

  it('borne la longueur', () => {
    expect(sanitiseFileName(`${'a'.repeat(300)}.pdf`).length).toBe(120);
  });

  it('ne rend jamais une chaîne vide', () => {
    expect(sanitiseFileName('   ')).toBe('document');
    expect(sanitiseFileName('/')).toBe('document');
  });

  it('produit un repli ASCII pour l’en-tête', () => {
    expect(asciiFileName('attestation été.pdf')).toBe('attestation ete.pdf');
    expect(asciiFileName('相片.png')).toBe('__.png');
  });
});

describe('taille lisible', () => {
  it('choisit l’unité', () => {
    expect(formatBytes(512)).toBe('512 o');
    expect(formatBytes(2048)).toBe('2 Kio');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 Mio');
  });
});

describe('expiration d’un lien', () => {
  it('expire à la seconde annoncée', () => {
    const now = 1_700_000_000_000;
    expect(isLinkExpired(now / 1000, now)).toBe(true);
    expect(isLinkExpired(now / 1000 + 1, now)).toBe(false);
  });
});
