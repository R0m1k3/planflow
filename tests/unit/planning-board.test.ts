import { describe, expect, it } from 'vitest';

import {
  buildRows,
  shiftState,
  type BoardShiftInput,
  type RowPerson,
} from '@/domain/planning/board';
import { weekDates, zonedInstant } from '@/domain/planning/week';

const TZ = 'Europe/Paris';
const WEEK = { isoYear: 2026, isoWeek: 33 };
const DATES = weekDates(WEEK);

const person = (over: Partial<RowPerson> = {}): RowPerson => ({
  membershipId: 'm1',
  firstName: 'Sofia',
  lastName: 'Marchetti',
  job: 'Vendeuse conseil',
  forfaitJours: false,
  contractMinutes: 35 * 60,
  ...over,
});

const shift = (
  date: string,
  start: string,
  end: string,
  over: Partial<BoardShiftInput> = {},
): BoardShiftInput => ({
  id: `${date}-${start}`,
  membershipId: 'm1',
  startAt: zonedInstant(date, start, TZ),
  endAt: zonedInstant(date, end, TZ),
  breakMinutes: 0,
  poste: 'vte',
  isValidated: false,
  note: null,
  ...over,
});

describe('buildRows', () => {
  it('range chaque créneau dans la colonne de son jour local', () => {
    const { rows } = buildRows(
      [person()],
      [shift('2026-08-12', '09:00', '17:00')],
      DATES,
      TZ,
      false,
    );

    expect(rows[0]?.days[2]).toHaveLength(1);
    expect(rows[0]?.days[2]?.[0]?.time).toBe('09:00–17:00');
    expect(rows[0]?.days.flat()).toHaveLength(1);
  });

  it('affiche un salarié sans créneau', () => {
    // Un planning se construit à partir d'une grille vide : masquer les
    // salariés non planifiés rendrait l'écran inutilisable le lundi matin.
    const { rows } = buildRows([person()], [], DATES, TZ, false);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.counters.plannedMinutes).toBe(0);
    expect(rows[0]?.counters.restDays).toBe(7);
  });

  it('déduit la pause du temps planifié', () => {
    const { rows } = buildRows(
      [person()],
      [shift('2026-08-10', '09:00', '17:00', { breakMinutes: 60 })],
      DATES,
      TZ,
      false,
    );
    expect(rows[0]?.counters.plannedMinutes).toBe(7 * 60);
  });

  it('compte la nuit du changement d’heure à sa vraie durée', () => {
    // 25 octobre 2026, retour à l'heure d'hiver : 22 h–06 h dure neuf heures.
    const dates = weekDates({ isoYear: 2026, isoWeek: 43 });
    const startAt = zonedInstant('2026-10-24', '22:00', TZ);
    const endAt = zonedInstant('2026-10-25', '06:00', TZ);

    const { rows } = buildRows(
      [person()],
      [
        {
          id: 's',
          membershipId: 'm1',
          startAt,
          endAt,
          breakMinutes: 0,
          poste: 'inv',
          isValidated: false,
          note: null,
        },
      ],
      dates,
      TZ,
      false,
    );

    expect(rows[0]?.counters.plannedMinutes).toBe(9 * 60);
    // Le créneau se range au jour de son **début**, samedi.
    expect(rows[0]?.days[5]).toHaveLength(1);
    expect(rows[0]?.days[6]).toHaveLength(0);
  });

  it('sépare les besoins non couverts sur leur propre ligne', () => {
    const { rows, unassignedRow } = buildRows(
      [person()],
      [
        shift('2026-08-15', '10:00', '18:00', {
          id: 'open',
          membershipId: null,
        }),
      ],
      DATES,
      TZ,
      false,
    );

    expect(rows[0]?.days.flat()).toHaveLength(0);
    expect(unassignedRow?.days[5]).toHaveLength(1);
    expect(unassignedRow?.days[5]?.[0]?.state).toBe('unassigned');
    // Pas de contrat sur cette ligne : la comparer à 35 h n'aurait aucun sens.
    expect(unassignedRow?.counters.contractMinutes).toBe(0);
  });

  it('n’ouvre pas de ligne « non assigné » quand tout est couvert', () => {
    const { unassignedRow } = buildRows(
      [person()],
      [shift('2026-08-10', '09:00', '17:00')],
      DATES,
      TZ,
      false,
    );
    expect(unassignedRow).toBeNull();
  });

  it('compte les dimanches travaillés', () => {
    // Le dimanche du maire ouvre droit à majoration **et** repos compensateur :
    // le compteur doit être juste, pas approximatif.
    const { rows } = buildRows(
      [person()],
      [
        shift('2026-08-16', '10:00', '18:00'),
        shift('2026-08-14', '10:00', '18:00'),
      ],
      DATES,
      TZ,
      false,
    );
    expect(rows[0]?.counters.sundaysWorked).toBe(1);
    expect(rows[0]?.counters.restDays).toBe(5);
  });

  it('ignore un créneau hors de la semaine affichée', () => {
    const { rows } = buildRows(
      [person()],
      [shift('2026-08-24', '09:00', '17:00')],
      DATES,
      TZ,
      false,
    );
    // Le taire vaut mieux que de l'écraser sur lundi, où il fausserait le
    // compteur sans que rien ne le signale.
    expect(rows[0]?.counters.plannedMinutes).toBe(0);
  });

  it('neutralise la durée contractuelle au forfait jours', () => {
    const { rows } = buildRows(
      [person({ forfaitJours: true, contractMinutes: 35 * 60 })],
      [],
      DATES,
      TZ,
      false,
    );
    expect(rows[0]?.counters.contractMinutes).toBe(0);
  });

  it('ordonne les créneaux d’une même journée', () => {
    const { rows } = buildRows(
      [person()],
      [
        shift('2026-08-10', '14:00', '19:00'),
        shift('2026-08-10', '07:00', '12:00'),
      ],
      DATES,
      TZ,
      false,
    );
    expect(rows[0]?.days[0]?.map((entry) => entry.time)).toEqual([
      '07:00–12:00',
      '14:00–19:00',
    ]);
  });

  it('ne compte au RC que le repos compensateur', () => {
    // Le repos hebdomadaire est un droit déjà pris ; le compensateur est une
    // contrepartie due. Les additionner ferait disparaître la dette dans un
    // total qui ne veut rien dire.
    const { rows } = buildRows([person()], [], DATES, TZ, false, [], [
      { membershipId: 'm1', restType: 'COMPENSATORY_REST', minutes: 420 },
      { membershipId: 'm1', restType: 'WEEKLY_REST', minutes: 2100 },
    ]);

    expect(rows[0]?.counters.compensatoryRestMinutes).toBe(420);
  });

  it('tolère un repos sans durée', () => {
    // `Rest.minutes` est nullable : un repos posé sans durée vaut zéro minute,
    // pas NaN — un NaN se propagerait au bandeau et à l'export.
    const { rows } = buildRows([person()], [], DATES, TZ, false, [], [
      { membershipId: 'm1', restType: 'COMPENSATORY_REST', minutes: null },
    ]);

    expect(rows[0]?.counters.compensatoryRestMinutes).toBe(0);
  });
});

describe('shiftState', () => {
  it('distingue brouillon, publié et validé', () => {
    expect(shiftState(false, false, 'm1')).toBe('draft');
    expect(shiftState(false, true, 'm1')).toBe('published');
    expect(shiftState(true, true, 'm1')).toBe('validated');
  });

  it('garde le besoin non couvert reconnaissable même publié', () => {
    expect(shiftState(false, true, null)).toBe('unassigned');
  });
});

describe('zonedInstant', () => {
  it('vise la bonne heure locale été comme hiver', () => {
    expect(zonedInstant('2026-08-10', '09:00', TZ).toISOString()).toBe(
      '2026-08-10T07:00:00.000Z',
    );
    expect(zonedInstant('2026-01-05', '09:00', TZ).toISOString()).toBe(
      '2026-01-05T08:00:00.000Z',
    );
  });

  it('reste juste le jour du changement d’heure', () => {
    // 29 mars 2026 : minuit est en UTC+1, 09 h en UTC+2. Ajouter neuf heures à
    // minuit donnerait 10 h locales.
    expect(zonedInstant('2026-03-29', '09:00', TZ).toISOString()).toBe(
      '2026-03-29T07:00:00.000Z',
    );
    expect(zonedInstant('2026-10-25', '09:00', TZ).toISOString()).toBe(
      '2026-10-25T08:00:00.000Z',
    );
  });
});
