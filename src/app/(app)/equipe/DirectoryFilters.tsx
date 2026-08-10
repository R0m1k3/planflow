'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

/**
 * Filtres de l'annuaire.
 *
 * L'état vit dans l'adresse, pas dans le composant : un effectif filtré
 * s'envoie par lien, se met en favori, et le retour arrière défait le dernier
 * choix plutôt que de vider la page.
 */

const selectClass =
  'h-9 min-w-0 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1 outline-none focus-visible:border-focus';

export interface FilterOptions {
  locations: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  contractTypes: Array<{ value: string; label: string }>;
}

export function DirectoryFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const params = useSearchParams();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = (key: string) => params.get(key) ?? '';

  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(next.size > 0 ? `/equipe?${next}` : '/equipe');
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">Rechercher un collaborateur</span>
        <input
          name="q"
          type="search"
          defaultValue={current('q')}
          placeholder="Rechercher par prénom, nom ou matricule."
          className="h-10 rounded-3 border border-line-2 bg-surface px-3.5 text-sm text-ink-1 outline-none placeholder:text-ink-3 focus-visible:border-focus"
          onChange={(event) => {
            // La frappe ne déclenche pas une requête par caractère : elle
            // attend un silence. Sans cela, chercher « Dupont » en lance six.
            const value = event.target.value;
            if (debounce.current) clearTimeout(debounce.current);
            debounce.current = setTimeout(() => apply('q', value), 300);
          }}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Établissement"
          className={selectClass}
          value={current('etablissement')}
          onChange={(event) => apply('etablissement', event.target.value)}
        >
          <option value="">Tous les établissements</option>
          {options.locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Rôle"
          className={selectClass}
          value={current('role')}
          onChange={(event) => apply('role', event.target.value)}
        >
          <option value="">Tous les rôles</option>
          {options.roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Type de contrat"
          className={selectClass}
          value={current('contrat')}
          onChange={(event) => apply('contrat', event.target.value)}
        >
          <option value="">Tous les types de contrats</option>
          {options.contractTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Présence"
          className={selectClass}
          value={current('presence')}
          onChange={(event) => apply('presence', event.target.value)}
        >
          <option value="">Utilisateurs actifs</option>
          <option value="archived">Archivés</option>
          <option value="all">Tous</option>
        </select>

        <select
          aria-label="Tri"
          className={selectClass}
          value={current('tri')}
          onChange={(event) => apply('tri', event.target.value)}
        >
          <option value="">Tri par nom</option>
          <option value="number">Tri par matricule</option>
        </select>
      </div>
    </div>
  );
}
