'use client';

import { useActionState, useState } from 'react';

import { InfoCard } from '@/app/(app)/equipe/[id]/InfoCard';
import { Button } from '@/components/ui/Button';
import { FormError, SubmitButton } from '@/components/ui/Form';
import {
  updateScopeAction,
  updateTeamsAction,
  type PlacementActionState,
} from '@/server/employees/placement-actions';
import type { ContractLocation } from '@/server/employees/queries';

/**
 * Périmètre et rattachement, en saisie.
 *
 * Deux formulaires plutôt qu'un : ils ne portent ni la même décision ni la
 * même capacité, et les réunir donnerait à l'un le pouvoir de l'autre.
 */

const empty: PlacementActionState = {};

export function ScopeForm({
  membershipId,
  locations,
  allLocations,
  scopedLocationIds,
}: {
  membershipId: string;
  locations: ContractLocation[];
  allLocations: boolean;
  scopedLocationIds: string[];
}) {
  const [state, save] = useActionState(updateScopeAction, empty);
  const [acknowledged, setAcknowledged] = useState<PlacementActionState>(empty);
  const [editing, setEditing] = useState(false);
  const [all, setAll] = useState(allLocations);

  if (state !== acknowledged && state.ok) {
    setAcknowledged(state);
    setEditing(false);
  }

  if (!editing) {
    return (
      <Button onClick={() => setEditing(true)}>Modifier le périmètre</Button>
    );
  }

  return (
    <form action={save} className="flex flex-col gap-3 pt-3">
      <input type="hidden" name="membershipId" value={membershipId} />

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="allLocations"
          checked={all}
          onChange={(event) => setAll(event.target.checked)}
          className="mt-0.5 size-4 accent-[var(--accent)]"
        />
        <span>
          <span className="font-medium">Accès généralisé</span>
          <span className="block text-micro text-ink-3">
            Tous les établissements, y compris ceux qui ouvriront plus tard.
          </span>
        </span>
      </label>

      {all ? null : (
        <fieldset className="flex flex-col gap-2 rounded-3 border border-line-1 p-3">
          <legend className="px-1 text-micro font-semibold text-ink-1">
            Établissements
          </legend>
          {locations.map((location) => (
            <label key={location.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="locationIds"
                value={location.id}
                defaultChecked={scopedLocationIds.includes(location.id)}
                className="size-4 accent-[var(--accent)]"
              />
              {location.name}
            </label>
          ))}
        </fieldset>
      )}

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Enregistrer le périmètre</SubmitButton>
        <Button type="button" onClick={() => setEditing(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function TeamsForm({
  membershipId,
  locations,
  teamIds,
  primaryTeamId,
}: {
  membershipId: string;
  locations: ContractLocation[];
  teamIds: string[];
  primaryTeamId: string | null;
}) {
  const [state, save] = useActionState(updateTeamsAction, empty);
  const [acknowledged, setAcknowledged] = useState<PlacementActionState>(empty);
  const [editing, setEditing] = useState(false);

  if (state !== acknowledged && state.ok) {
    setAcknowledged(state);
    setEditing(false);
  }

  const withTeams = locations.filter((location) => location.teams.length > 0);

  if (!editing) {
    return (
      <Button onClick={() => setEditing(true)}>Modifier les équipes</Button>
    );
  }

  return (
    <form action={save} className="flex flex-col gap-3 pt-3">
      <input type="hidden" name="membershipId" value={membershipId} />

      {withTeams.length === 0 ? (
        <p className="text-sm text-ink-2">
          Aucune équipe déclarée. Elles se créent dans les réglages des
          établissements.
        </p>
      ) : (
        <InfoCard title="Équipes">
          {withTeams.map((location) => (
            <fieldset key={location.id} className="flex flex-col gap-2 py-2">
              <legend className="text-micro font-semibold text-ink-1">
                {location.name}
              </legend>
              {location.teams.map((team) => (
                <div key={team.id} className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="teamIds"
                      value={team.id}
                      defaultChecked={teamIds.includes(team.id)}
                      className="size-4 accent-[var(--accent)]"
                    />
                    {team.name}
                  </label>
                  <label className="flex items-center gap-2 text-micro text-ink-2">
                    <input
                      type="radio"
                      name="primaryTeamId"
                      value={team.id}
                      defaultChecked={primaryTeamId === team.id}
                      className="size-3.5 accent-[var(--accent)]"
                    />
                    Principale
                  </label>
                </div>
              ))}
            </fieldset>
          ))}
        </InfoCard>
      )}

      <FormError>{state.error}</FormError>

      <div className="flex items-center gap-3">
        <SubmitButton>Enregistrer les équipes</SubmitButton>
        <Button type="button" onClick={() => setEditing(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
