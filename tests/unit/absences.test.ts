import { describe, expect, it } from 'vitest';

import {
  absenceDayCount,
  countAbsenceDays,
  datesBetween,
  findAbsenceOverlaps,
  isRetroactive,
  isoWeekday,
  respectsNotice,
} from '@/domain/absences/count';
import {
  accrualForMonth,
  balanceAt,
  balanceOf,
  counterView,
  reversalOf,
  type LedgerEntry,
} from '@/domain/absences/ledger';

/** Août 2026 : le 15 est un samedi férié, le 14 un vendredi. */
const AOUT_2026 = ['2026-08-15'];

describe('endDate est le dernier jour d’absence', () => {
  it('décompte les deux bornes', () => {
    // Du lundi 10 au vendredi 14 : cinq jours, pas quatre. La confusion avec
    // la date de reprise décompte un jour de trop ou de trop peu à chaque
    // demande, et le salarié s'en aperçoit au solde, des mois plus tard.
    expect(
      absenceDayCount(
        { startDate: '2026-08-10', endDate: '2026-08-14' },
        { holidays: [] },
      ),
    ).toBe(5);
  });

  it('compte un jour pour une absence d’une journée', () => {
    expect(
      absenceDayCount(
        { startDate: '2026-08-10', endDate: '2026-08-10' },
        { holidays: [] },
      ),
    ).toBe(1);
  });

  it('ne décompte pas le jour de reprise', () => {
    // Reprise le lundi 17 : l'absence s'arrête au vendredi 14.
    const withReturnDate = absenceDayCount(
      { startDate: '2026-08-10', endDate: '2026-08-17' },
      { holidays: [] },
    );
    const correct = absenceDayCount(
      { startDate: '2026-08-10', endDate: '2026-08-14' },
      { holidays: [] },
    );
    expect(correct).toBe(5);
    expect(withReturnDate).toBe(6);
  });

  it('rend zéro sur une période inversée', () => {
    expect(
      absenceDayCount(
        { startDate: '2026-08-14', endDate: '2026-08-10' },
        { holidays: [] },
      ),
    ).toBe(0);
  });
});

describe('jours fériés', () => {
  it('retire le férié sans exiger de scinder la demande', () => {
    // Du lundi 10 au lundi 17, le samedi 15 est férié. En ouvrables :
    // 10, 11, 12, 13, 14, 17 comptent ; le 15 est férié, le 16 dimanche.
    const { total, days } = countAbsenceDays(
      { startDate: '2026-08-10', endDate: '2026-08-17' },
      { holidays: AOUT_2026 },
    );
    expect(total).toBe(6);
    expect(days.find((day) => day.isoDate === '2026-08-15')?.reason).toBe(
      'HOLIDAY',
    );
  });

  it('ne décompte rien sur un congé entièrement férié', () => {
    expect(
      absenceDayCount(
        { startDate: '2026-08-15', endDate: '2026-08-15' },
        { holidays: AOUT_2026 },
      ),
    ).toBe(0);
  });
});

describe('base de décompte', () => {
  it('compte le samedi en ouvrables', () => {
    // Du lundi 10 au samedi 15 sans férié : six jours ouvrables.
    expect(
      absenceDayCount(
        { startDate: '2026-08-10', endDate: '2026-08-15' },
        { holidays: [], basis: 'OUVRABLES', workingWeekdays: [1, 2, 3, 4, 5, 6] },
      ),
    ).toBe(6);
  });

  it('exclut le samedi en ouvrés', () => {
    expect(
      absenceDayCount(
        { startDate: '2026-08-10', endDate: '2026-08-15' },
        { holidays: [], basis: 'OUVRES', workingWeekdays: [1, 2, 3, 4, 5, 6] },
      ),
    ).toBe(5);
  });

  it('respecte le rythme du contrat', () => {
    // Un temps partiel qui ne travaille jamais le mercredi ne consomme pas de
    // congé ce jour-là.
    const { total, days } = countAbsenceDays(
      { startDate: '2026-08-10', endDate: '2026-08-14' },
      { holidays: [], workingWeekdays: [1, 2, 4, 5] },
    );
    expect(total).toBe(4);
    expect(days.find((day) => day.isoDate === '2026-08-12')?.reason).toBe(
      'NOT_WORKED',
    );
  });
});

describe('demi-journées', () => {
  it('retire une demi-journée à chaque borne marquée', () => {
    expect(
      absenceDayCount(
        {
          startDate: '2026-08-10',
          endDate: '2026-08-14',
          startHalfDay: true,
          endHalfDay: true,
        },
        { holidays: [] },
      ),
    ).toBe(4);
  });

  it('compte une demi-journée pour une absence d’une demi-journée', () => {
    expect(
      absenceDayCount(
        {
          startDate: '2026-08-10',
          endDate: '2026-08-10',
          startHalfDay: true,
        },
        { holidays: [] },
      ),
    ).toBe(0.5);
  });

  it('ne retire rien de plus sur une borne fériée', () => {
    // Une demi-journée posée sur un férié ne peut pas rendre le décompte
    // négatif : le férié ne se décompte déjà pas.
    expect(
      absenceDayCount(
        {
          startDate: '2026-08-15',
          endDate: '2026-08-17',
          startHalfDay: true,
        },
        { holidays: AOUT_2026 },
      ),
    ).toBe(1);
  });
});

describe('chevauchements', () => {
  const existing = [
    { id: 'a', startDate: '2026-08-10', endDate: '2026-08-14' },
  ];

  it('détecte un recouvrement partiel', () => {
    expect(
      findAbsenceOverlaps(
        { startDate: '2026-08-13', endDate: '2026-08-20' },
        existing,
      ),
    ).toHaveLength(1);
  });

  it('détecte deux congés qui se touchent le même jour', () => {
    // Bornes inclusives des deux côtés : `endDate` est un jour d'absence, donc
    // une comparaison exclusive laisserait passer ce cas.
    expect(
      findAbsenceOverlaps(
        { startDate: '2026-08-14', endDate: '2026-08-18' },
        existing,
      ),
    ).toHaveLength(1);
  });

  it('accepte deux congés consécutifs sans recouvrement', () => {
    expect(
      findAbsenceOverlaps(
        { startDate: '2026-08-15', endDate: '2026-08-18' },
        existing,
      ),
    ).toHaveLength(0);
  });

  it('ignore l’absence en cours de modification', () => {
    expect(
      findAbsenceOverlaps(
        { startDate: '2026-08-10', endDate: '2026-08-14' },
        existing,
        'a',
      ),
    ).toHaveLength(0);
  });
});

describe('préavis et rétroactivité', () => {
  it('accepte une demande respectant le préavis', () => {
    expect(
      respectsNotice({ startDate: '2026-08-20', endDate: '2026-08-21' }, '2026-08-10', 7),
    ).toBe(true);
    expect(
      respectsNotice({ startDate: '2026-08-16', endDate: '2026-08-17' }, '2026-08-10', 7),
    ).toBe(false);
  });

  it('n’exige rien quand aucun préavis n’est paramétré', () => {
    expect(
      respectsNotice({ startDate: '2026-08-11', endDate: '2026-08-11' }, '2026-08-10', null),
    ).toBe(true);
  });

  it('signale une demande rétroactive sans l’interdire', () => {
    // Un arrêt maladie se déclare toujours après coup : c'est l'écran qui
    // avertit, pas le domaine qui bloque.
    expect(
      isRetroactive({ startDate: '2026-08-01', endDate: '2026-08-05' }, '2026-08-10'),
    ).toBe(true);
  });
});

describe('utilitaires de dates', () => {
  it('numérote lundi 1 et dimanche 7', () => {
    expect(isoWeekday('2026-08-10')).toBe(1);
    expect(isoWeekday('2026-08-16')).toBe(7);
  });

  it('énumère les bornes incluses', () => {
    expect(datesBetween('2026-08-10', '2026-08-12')).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
    ]);
  });
});

describe('registre des compteurs', () => {
  const entries: LedgerEntry[] = [
    { kind: 'ACCRUAL', quantity: 2.5, unit: 'DAY', effectiveDate: '2026-01-31' },
    { kind: 'ACCRUAL', quantity: 2.5, unit: 'DAY', effectiveDate: '2026-02-28' },
    { kind: 'TAKEN', quantity: -3, unit: 'DAY', effectiveDate: '2026-02-10' },
  ];

  it('somme les écritures plutôt que de stocker un solde', () => {
    // Un solde stocké se désynchronise, et la désynchronisation ne se voit
    // qu'au moment où un salarié conteste.
    expect(balanceOf(entries)).toBe(2);
  });

  it('donne le solde à une date passée', () => {
    expect(balanceAt(entries, '2026-01-31')).toBe(2.5);
    expect(balanceAt(entries, '2026-02-10')).toBe(-0.5);
  });

  it('projette les acquisitions restantes', () => {
    const view = counterView(entries, 25);
    expect(view.accrued).toBe(5);
    expect(view.taken).toBe(3);
    expect(view.balance).toBe(2);
    expect(view.projected).toBe(27);
  });

  it('contre-passe à la date de la correction, pas à celle de l’écriture', () => {
    // Antidater masquerait la correction dans les soldes déjà communiqués.
    const original = entries[2] as LedgerEntry;
    const reversal = reversalOf(original, '2026-03-15');
    expect(reversal.quantity).toBe(3);
    expect(reversal.effectiveDate).toBe('2026-03-15');
    expect(balanceOf([...entries, reversal])).toBe(5);
  });
});

describe('acquisition de congés payés', () => {
  it('acquiert 2,5 jours par mois travaillé', () => {
    expect(accrualForMonth(true, 0)).toBe(2.5);
  });

  it('continue d’acquérir pendant un arrêt maladie', () => {
    // Droit issu de la réforme de 2024 : l'oublier prive le salarié d'un droit
    // acquis, sans que rien ne le signale.
    expect(accrualForMonth(false, 0)).toBe(2);
    expect(accrualForMonth(false, 5)).toBe(2);
  });

  it('plafonne l’acquisition maladie à 24 jours par an', () => {
    // Douze mois d'arrêt à 2 jours feraient 24 : le treizième n'acquiert rien.
    expect(accrualForMonth(false, 11)).toBe(2);
    expect(accrualForMonth(false, 12)).toBe(0);
  });

  it('acquiert le reliquat exact au dernier mois sous plafond', () => {
    expect(accrualForMonth(false, 11.5)).toBe(1);
  });
});

describe('jours fériés légaux', () => {
  it('calcule Pâques sur des années de référence', async () => {
    const { easterSunday } = await import('@/domain/absences/holidays');
    // Une table écrite à la main est juste l'année où on l'écrit et fausse dès
    // la suivante : trois jours fériés dépendent de cette date.
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe('2026-04-05');
    expect(easterSunday(2027).toISOString().slice(0, 10)).toBe('2027-03-28');
    expect(easterSunday(2024).toISOString().slice(0, 10)).toBe('2024-03-31');
    expect(easterSunday(2038).toISOString().slice(0, 10)).toBe('2038-04-25');
  });

  it('donne onze jours fériés par an', async () => {
    const { frenchHolidays } = await import('@/domain/absences/holidays');
    const holidays = frenchHolidays(2026);
    expect(holidays).toHaveLength(11);
    expect(holidays.map((entry) => entry.isoDate)).toContain('2026-04-06');
    expect(holidays.map((entry) => entry.isoDate)).toContain('2026-05-14');
    expect(holidays.map((entry) => entry.isoDate)).toContain('2026-05-25');
  });

  it('reste juste l’année suivante', async () => {
    const { frenchHolidays } = await import('@/domain/absences/holidays');
    const dates = frenchHolidays(2027).map((entry) => entry.isoDate);
    expect(dates).toContain('2027-03-29');
    expect(dates).toContain('2027-05-06');
    expect(dates).toContain('2027-05-17');
  });

  it('n’identifie que le 1er mai comme chômé de droit', async () => {
    const { isLabourDay } = await import('@/domain/absences/holidays');
    expect(isLabourDay('2027-05-01')).toBe(true);
    expect(isLabourDay('2027-07-14')).toBe(false);
  });
});
