import { describe, expect, it } from 'vitest';

import {
  checkSilaeLines,
  checksum,
  formatSilaeCsv,
  formatSilaeDate,
  formatSilaeValue,
  minutesToDecimalHours,
  SILAE_HEADER,
  SilaeExportError,
  toAscii,
  type SilaeLine,
} from '@/domain/payroll/silae';

/**
 * Ces tests reproduisent les conventions relevées sur un export réel du
 * dossier (juillet 2026). Le fichier lui-même n'est pas versionné : il contient
 * les heures et les absences de salariés identifiables.
 *
 * Ce sont donc les **règles de forme** qui sont figées ici, avec les valeurs
 * exactes observées — un import de paie refusé pour un accent ou une virgule
 * coûte une demi-journée, un import accepté avec de mauvais arrondis coûte
 * bien davantage.
 */

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

function line(over: Partial<SilaeLine> = {}): SilaeLine {
  return {
    matricule: '00061',
    code: 'Heures travaillees',
    value: h(96),
    kind: 'HOURS',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    ...over,
  };
}

describe('mise en forme des valeurs', () => {
  it('rend les heures avec au moins une décimale', () => {
    expect(formatSilaeValue(h(96), 'HOURS')).toBe('96.0');
    expect(formatSilaeValue(h(105), 'HOURS')).toBe('105.0');
    expect(formatSilaeValue(h(1), 'HOURS')).toBe('1.0');
  });

  it('retire le zéro superflu sans perdre la décimale utile', () => {
    expect(formatSilaeValue(h(52, 30), 'HOURS')).toBe('52.5');
    expect(formatSilaeValue(h(0, 30), 'HOURS')).toBe('0.5');
    expect(formatSilaeValue(h(6, 30), 'HOURS')).toBe('6.5');
  });

  it('reproduit les arrondis observés au centième', () => {
    // Chaque valeur de gauche vient de l'export de référence.
    expect(formatSilaeValue(h(69, 40), 'HOURS')).toBe('69.67');
    expect(formatSilaeValue(h(4, 50), 'HOURS')).toBe('4.83');
    expect(formatSilaeValue(h(3, 5), 'HOURS')).toBe('3.08');
    expect(formatSilaeValue(h(4, 35), 'HOURS')).toBe('4.58');
    expect(formatSilaeValue(h(5, 45), 'HOURS')).toBe('5.75');
    expect(formatSilaeValue(h(116, 40), 'HOURS')).toBe('116.67');
    expect(formatSilaeValue(h(166, 15), 'HOURS')).toBe('166.25');
  });

  it('rend les jours en entier nu', () => {
    // Les jours travaillés sortent « 14 », jamais « 14.0 ».
    expect(formatSilaeValue(14, 'DAYS')).toBe('14');
    expect(formatSilaeValue(22, 'DAYS')).toBe('22');
    expect(formatSilaeValue(3, 'DAYS')).toBe('3');
  });

  it('convertit les minutes en heures décimales', () => {
    expect(minutesToDecimalHours(h(4, 50))).toBe(4.83);
    expect(minutesToDecimalHours(h(69, 40))).toBe(69.67);
    expect(minutesToDecimalHours(0)).toBe(0);
  });
});

describe('dates', () => {
  it('inverse en JJ/MM/AAAA', () => {
    expect(formatSilaeDate('2026-07-01')).toBe('01/07/2026');
    expect(formatSilaeDate('2026-07-31')).toBe('31/07/2026');
  });

  it('refuse une date qui n’est pas une date', () => {
    expect(() => formatSilaeDate('juillet')).toThrow(/invalide/);
  });
});

describe('ASCII', () => {
  it('retire les accents', () => {
    // L'export de référence ne contient aucun caractère composé : un salarié
    // nommé « Rémi » ne doit pas introduire le premier octet non-ASCII.
    expect(toAscii('Absence rémunérée')).toBe('Absence remuneree');
    expect(toAscii('Heures travaillées')).toBe('Heures travaillees');
  });

  it('écarte ce qui n’est pas imprimable en ASCII', () => {
    expect(toAscii('AB‑300')).toBe('AB300');
    expect(toAscii('café ☕')).toBe('cafe ');
  });
});

describe('sérialisation', () => {
  it('produit l’en-tête exact', () => {
    const { csv } = formatSilaeCsv([line()]);
    expect(csv.split('\r\n')[0]).toBe(SILAE_HEADER);
    expect(SILAE_HEADER).toBe('Matricule;Code;Valeur;Date debut;Date fin');
  });

  it('termine chaque ligne par CRLF, la dernière comprise', () => {
    const { csv } = formatSilaeCsv([line()]);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).not.toMatch(/[^\r]\n/);
  });

  it('reproduit une ligne de l’export de référence', () => {
    const { csv } = formatSilaeCsv([
      line({ code: 'Heures travaillees', value: h(96) }),
    ]);
    expect(csv).toContain('00061;Heures travaillees;96.0;01/07/2026;31/07/2026');
  });

  it('reproduit une ligne d’absence bornée sur ses propres dates', () => {
    // Les agrégats couvrent la période de paie ; une absence couvre la période
    // d'absence. Les confondre décalerait le décompte d'un mois entier.
    const { csv } = formatSilaeCsv([
      line({
        matricule: '00173',
        code: 'AB-630',
        value: h(4, 50),
        startDate: '2026-07-27',
        endDate: '2026-07-27',
      }),
    ]);
    expect(csv).toContain('00173;AB-630;4.83;27/07/2026;27/07/2026');
  });

  it('n’ajoute ni guillemet ni point-virgule final', () => {
    const { csv } = formatSilaeCsv([line()]);
    const row = csv.split('\r\n')[1] ?? '';
    expect(row).not.toContain('"');
    expect(row.endsWith(';')).toBe(false);
    expect(row.split(';')).toHaveLength(5);
  });

  it('accepte les deux formes de matricule du dossier', () => {
    const { csv } = formatSilaeCsv([
      line({ matricule: '00201' }),
      line({ matricule: 'COPIGA' }),
    ]);
    expect(csv).toContain('00201;');
    expect(csv).toContain('COPIGA;');
  });
});

describe('déterminisme', () => {
  it('trie de façon stable quel que soit l’ordre d’entrée', () => {
    const lines = [
      line({ matricule: '00201', code: 'Heures travaillees' }),
      line({ matricule: '00061', code: 'Nombre total de jours travailles', value: 14, kind: 'DAYS' }),
      line({ matricule: '00061', code: 'AB-300', value: h(11) }),
    ];

    const first = formatSilaeCsv(lines).csv;
    const second = formatSilaeCsv([...lines].reverse()).csv;
    expect(first).toBe(second);
  });

  it('produit la même empreinte pour un réexport identique', async () => {
    // L'import Silae écrase la période pour les salariés concernés : un export
    // doit pouvoir être rejoué sans effet de bord, et l'empreinte le prouve.
    const lines = [line(), line({ code: 'AB-300', value: h(11) })];
    const a = await checksum(formatSilaeCsv(lines).csv);
    const b = await checksum(formatSilaeCsv([...lines].reverse()).csv);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe('contrôles préalables', () => {
  it('refuse un matricule manquant', () => {
    // Un export partiel se charge sans erreur et la paie est fausse pour les
    // salariés absents du fichier : il vaut mieux ne rien produire.
    const issues = checkSilaeLines([line({ matricule: '  ' })]);
    expect(issues[0]?.message).toMatch(/Matricule Silae manquant/);
  });

  it('refuse un code non renseigné', () => {
    const issues = checkSilaeLines([line({ code: '' })]);
    expect(issues[0]?.message).toMatch(/Code de paie non renseigné/);
  });

  it('refuse une valeur négative', () => {
    const issues = checkSilaeLines([line({ value: -60 })]);
    expect(issues[0]?.message).toMatch(/négative/);
  });

  it('refuse une période inversée', () => {
    const issues = checkSilaeLines([
      line({ startDate: '2026-07-31', endDate: '2026-07-01' }),
    ]);
    expect(issues[0]?.message).toMatch(/antérieure/);
  });

  it('échoue en listant les manques plutôt qu’en produisant un fichier', () => {
    expect(() => formatSilaeCsv([line({ matricule: '' })])).toThrow(
      SilaeExportError,
    );

    try {
      formatSilaeCsv([line({ matricule: '' }), line({ code: '' })]);
      expect.unreachable('Un export incomplet ne doit pas aboutir.');
    } catch (error) {
      expect((error as SilaeExportError).issues).toHaveLength(2);
    }
  });
});
