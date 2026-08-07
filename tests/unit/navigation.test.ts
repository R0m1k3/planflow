import { describe, expect, it } from 'vitest';

import {
  activeItem,
  isActive,
  matches,
  NAVIGATION,
  sectionForPath,
} from '@/components/shell/navigation';

describe('matches', () => {
  it('reconnaît la racine sans capturer tout le site', () => {
    expect(matches('/', '/')).toBe(true);
    expect(matches('/', '/equipe')).toBe(false);
  });

  it('couvre les sous-routes', () => {
    expect(matches('/equipe', '/equipe')).toBe(true);
    expect(matches('/equipe', '/equipe/camille-ferrand')).toBe(true);
    expect(matches('/equipe', '/equipements')).toBe(false);
  });

  it('écarte les liens d’ancre', () => {
    expect(matches('/conges#attente', '/conges')).toBe(false);
  });
});

describe('activeItem', () => {
  it('retient la correspondance la plus spécifique', () => {
    // Une fiche salarié est un détail de « Membres » : c'est cette entrée qui
    // reste allumée, et non un lien codé en dur vers un salarié particulier.
    expect(activeItem('/equipe/cm123abc')?.id).toBe('membres');
    expect(activeItem('/equipe')?.id).toBe('membres');
    expect(activeItem('/reglages/registre')?.id).toBe('registre');
  });

  it('ne renvoie rien pour une route hors navigation', () => {
    expect(activeItem('/inconnu')).toBeUndefined();
  });
});

describe('isActive', () => {
  it('n’allume qu’une entrée par écran', () => {
    const targets = NAVIGATION.flatMap((section) => section.items)
      .map((item) => item.href)
      .filter(
        (href): href is string =>
          typeof href === 'string' && !href.includes('#'),
      );

    for (const pathname of [...targets, '/equipe/cm123abc']) {
      const lit = NAVIGATION.flatMap((section) => section.items).filter(
        (item) => item.href && isActive(item.href, pathname),
      );
      expect(lit.length, `${pathname} allume ${lit.length} entrées`).toBe(1);
    }
  });
});

describe('sectionForPath', () => {
  it('trouve la section portant la route courante', () => {
    expect(sectionForPath('/planning/semaine').id).toBe('plannings');
    expect(sectionForPath('/equipe/camille-ferrand').id).toBe('equipe');
    expect(sectionForPath('/conges').id).toBe('conges');
  });

  it('retombe sur la première section pour une route inconnue', () => {
    expect(sectionForPath('/inconnu').id).toBe('apercu');
  });
});
