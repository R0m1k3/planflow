'use client';

import { useActionState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  OWNER_LEVEL_CAPABILITY,
  ROLE_ADMIN_CAPABILITY,
} from '@/domain/access/role-editing';
import {
  createRoleAction,
  deleteRoleAction,
  saveRolePermissionsAction,
  type RoleState,
} from '@/server/roles/actions';

const empty: RoleState = {};

export interface CapabilityView {
  code: string;
  category: string;
  label: string;
  /** L'acteur courant la détient : il peut donc l'accorder. */
  grantable: boolean;
}

export interface RoleView {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  memberCount: number;
  granted: string[];
}

export function CreateRoleForm() {
  const [state, action, pending] = useActionState(createRoleAction, empty);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-micro font-medium tracking-[0.04em] text-ink-3 uppercase">
          Nom du rôle
        </span>
        <input
          name="name"
          required
          minLength={2}
          placeholder="Responsable de secteur"
          className="h-8 w-64 rounded-2 border border-line-2 bg-surface px-2 text-sm text-ink-1"
        />
        <span className="text-micro text-ink-3">
          Créé sans aucune capacité : un rôle neuf qui hériterait des vôtres
          distribuerait des droits que personne n’a demandés.
        </span>
      </label>
      <Button type="submit" variant="primary" disabled={pending}>
        Créer
      </Button>
      <Messages state={state} />
    </form>
  );
}

/**
 * Capacités d'un rôle.
 *
 * Les cases qu'on ne détient pas soi-même sont désactivées et le disent : on ne
 * peut accorder que ce qu'on a. Retirer reste possible — réduire un droit n'a
 * jamais élargi le sien.
 */
export function RolePermissionsForm({
  role,
  capabilities,
}: {
  role: RoleView;
  capabilities: CapabilityView[];
}) {
  const [state, action, pending] = useActionState(
    saveRolePermissionsAction,
    empty,
  );
  const granted = new Set(role.granted);

  const categories = [...new Set(capabilities.map((c) => c.category))];

  return (
    <form
      action={action}
      // Repère stable : les libellés de capacités contiennent les mots des
      // rôles (« niveau propriétaire »), et une recherche par texte désigne
      // alors plusieurs cartes à la fois.
      data-testid={`role-${role.key}`}
      className="flex flex-col gap-4 p-4"
    >
      <input type="hidden" name="roleId" value={role.id} />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-ink-1">{role.name}</span>
        <Badge tone="neutral">{role.key}</Badge>
        {role.isSystem ? <Badge tone="info">Rôle système</Badge> : null}
        <span className="text-micro text-ink-3">
          {role.memberCount} membre{role.memberCount > 1 ? 's' : ''} ·{' '}
          {role.granted.length} capacité{role.granted.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {categories.map((category) => (
          <fieldset key={category} className="flex flex-col gap-1">
            <legend className="text-micro font-semibold tracking-[0.06em] text-ink-3 uppercase">
              {category}
            </legend>
            {capabilities
              .filter((capability) => capability.category === category)
              .map((capability) => {
                const isGranted = granted.has(capability.code);
                // Interdire de décocher ce qu'on ne peut pas re-cocher éviterait
                // un retrait qu'on ne saurait pas défaire — mais empêcherait
                // aussi de réduire un rôle trop large. Le retrait reste permis.
                const locked = !capability.grantable && !isGranted;

                return (
                  <label
                    key={capability.code}
                    className="flex items-start gap-2 text-sm text-ink-2"
                  >
                    <input
                      type="checkbox"
                      name="permission"
                      value={capability.code}
                      defaultChecked={isGranted}
                      disabled={locked}
                      className="mt-0.5 size-4"
                    />
                    <span className={locked ? 'text-ink-3' : undefined}>
                      {capability.label}
                      {capability.code === ROLE_ADMIN_CAPABILITY ? (
                        <span className="block text-micro text-ink-3">
                          Au moins un rôle doit la conserver.
                        </span>
                      ) : null}
                      {capability.code === OWNER_LEVEL_CAPABILITY ? (
                        <span className="block text-micro text-ink-3">
                          Ne se délègue que par un propriétaire.
                        </span>
                      ) : null}
                      {locked ? (
                        <span className="block text-micro text-ink-3">
                          Vous ne la détenez pas.
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          Enregistrer
        </Button>
        <Messages state={state} />
      </div>
    </form>
  );
}

export function DeleteRoleForm({ role }: { role: RoleView }) {
  const [state, action, pending] = useActionState(deleteRoleAction, empty);

  if (role.isSystem) return null;

  return (
    <form
      action={action}
      data-testid={`role-delete-${role.key}`}
      className="flex items-center gap-3 px-4 pb-4"
    >
      <input type="hidden" name="roleId" value={role.id} />
      <Button type="submit" disabled={pending || role.memberCount > 0}>
        Supprimer ce rôle
      </Button>
      {role.memberCount > 0 ? (
        <span className="text-micro text-ink-3">
          Réaffectez ses {role.memberCount} membre(s) d’abord.
        </span>
      ) : null}
      <Messages state={state} />
    </form>
  );
}

function Messages({ state }: { state: RoleState }) {
  return (
    <>
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
      {state.message ? (
        <span className="text-xs text-ok-soft-ink">{state.message}</span>
      ) : null}
    </>
  );
}
