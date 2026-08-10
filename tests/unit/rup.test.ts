import { describe, expect, it } from 'vitest';

import {
  RUP_COLUMNS,
  missingMentions,
  peopleWithGaps,
  type RupPerson,
} from '@/domain/legal/rup';

/**
 * Registre unique du personnel — mentions obligatoires.
 *
 * La sanction se compte **par salarié concerné**, pas par registre : c'est ce
 * que le décompte doit refléter, et c'est ce qui décide de l'avertissement
 * affiché avant l'édition.
 */

const complete: RupPerson = {
  lastName: 'Ferrand',
  firstName: 'Camille',
  sex: 'F',
  nationality: 'France',
  birthDate: new Date('1990-04-12T00:00:00Z'),
  jobTitle: 'Hôte de caisse',
  qualification: 'Niveau 3',
  contractLabel: 'CDI',
  entryDate: new Date('2024-09-01T00:00:00Z'),
  exitDate: null,
};

describe('registre unique du personnel', () => {
  it('énumère les mentions fixées par le texte', () => {
    expect(RUP_COLUMNS.map((column) => column.key)).toEqual([
      'lastName',
      'firstName',
      'sex',
      'nationality',
      'birthDate',
      'jobTitle',
      'qualification',
      'contractLabel',
      'entryDate',
      'exitDate',
    ]);
  });

  it('répartit la largeur sur la totalité de la page', () => {
    const total = RUP_COLUMNS.reduce((sum, column) => sum + column.width, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('ne réclame rien quand toutes les mentions sont là', () => {
    expect(missingMentions(complete)).toEqual([]);
  });

  it('tient une date de sortie absente pour une présence, pas pour un oubli', () => {
    // Un salarié en poste n'a pas de date de sortie : la réclamer ferait
    // apparaître tout l'effectif courant comme incomplet.
    expect(missingMentions({ ...complete, exitDate: null })).toEqual([]);
  });

  it('nomme les mentions manquantes', () => {
    expect(
      missingMentions({ ...complete, nationality: null, qualification: '' }),
    ).toEqual(['Nationalité', 'Qualification']);
  });

  it('compte les personnes concernées, pas les champs vides', () => {
    const bancal: RupPerson = {
      ...complete,
      sex: null,
      nationality: null,
      birthDate: null,
    };
    // Trois manques sur une seule personne : une contravention, pas trois.
    expect(peopleWithGaps([complete, bancal])).toBe(1);
  });
});

describe('rendu du registre', () => {
  it('produit un PDF paginé qui porte les manques en pied', async () => {
    const { renderRegisterPdf } = await import('@/server/employees/rup-pdf');

    // Assez de lignes pour dépasser une page : c'est la rupture que le rendu
    // rate le plus volontiers.
    const people: RupPerson[] = Array.from({ length: 60 }, (_, index) => ({
      ...complete,
      lastName: `Nom manifestement trop long pour la colonne ${index}`,
      sex: index % 2 === 0 ? null : 'F',
    }));

    const pdf = await renderRegisterPdf({
      locationId: 'loc',
      locationName: 'La Foir’Fouille',
      siret: '12345678901234',
      people,
      incomplete: 30,
    });

    expect(Buffer.from(pdf).subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('édite un registre vide plutôt que de refuser', async () => {
    const { renderRegisterPdf } = await import('@/server/employees/rup-pdf');

    // Un établissement qui vient d'ouvrir n'a personne : le registre existe
    // quand même, et son absence serait plus embarrassante que sa vacuité.
    const pdf = await renderRegisterPdf({
      locationId: 'loc',
      locationName: 'Nouvel établissement',
      siret: null,
      people: [],
      incomplete: 0,
    });

    expect(Buffer.from(pdf).subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('matricule proposé', () => {
  it('part à E0001 sur un effectif vide', async () => {
    const { nextEmployeeNumber } = await import('@/domain/hr/civil-status');
    expect(nextEmployeeNumber([])).toBe('E0001');
  });

  it('suit le dernier rang attribué', async () => {
    const { nextEmployeeNumber } = await import('@/domain/hr/civil-status');
    expect(nextEmployeeNumber(['E0001', 'E0007', 'E0003'])).toBe('E0008');
  });

  it('ignore les matricules repris d’un autre outil', async () => {
    const { nextEmployeeNumber } = await import('@/domain/hr/civil-status');
    // Un client qui migre apporte ses propres formes : les compter fausserait
    // le rang, et refuser l'embauche pour cette raison serait absurde.
    expect(nextEmployeeNumber(['SILAE-42', '00012', 'E0002'])).toBe('E0003');
  });
});

describe('référentiels géographiques', () => {
  it('nomme les pays en français depuis leur code', async () => {
    const { countryLabel } = await import('@/domain/hr/geo');
    expect(countryLabel('FR')).toBe('France');
    expect(countryLabel('DE')).toBe('Allemagne');
  });

  it('laisse passer une valeur héritée plutôt que de la blanchir', async () => {
    const { countryLabel } = await import('@/domain/hr/geo');
    // Les dossiers saisis avant le référentiel portent le nom en clair.
    expect(countryLabel('Nouvelle-Calédonie')).toBe('Nouvelle-Calédonie');
  });

  it('ramène un nom hérité à son code', async () => {
    const { toCountryCode } = await import('@/domain/hr/geo');
    expect(toCountryCode('France')).toBe('FR');
    expect(toCountryCode('FR')).toBe('FR');
    expect(toCountryCode('Pays imaginaire')).toBe('');
    expect(toCountryCode(null)).toBe('');
  });

  it('porte la Corse et l’outre-mer', async () => {
    const { departmentLabel, isKnownDepartment } = await import('@/domain/hr/geo');
    expect(departmentLabel('2A')).toBe('2A - Corse-du-Sud');
    expect(departmentLabel('974')).toBe('974 - La Réunion');
    expect(isKnownDepartment('20')).toBe(false);
  });

  it('coupe un numéro sur l’indicatif le plus long', async () => {
    const { splitDial } = await import('@/domain/hr/geo');
    // « +352 » commence par « +3 » : tester dans l'ordre de la table
    // donnerait la France pour un numéro luxembourgeois.
    expect(splitDial('+352 621 12 34 56')).toEqual({
      dial: '+352',
      rest: '621 12 34 56',
    });
    expect(splitDial('+33 6 12 34 56 78')).toEqual({
      dial: '+33',
      rest: '6 12 34 56 78',
    });
  });

  it('retombe sur la France pour un numéro sans indicatif', async () => {
    const { splitDial } = await import('@/domain/hr/geo');
    expect(splitDial('06 12 34 56 78')).toEqual({
      dial: '+33',
      rest: '06 12 34 56 78',
    });
  });
});
