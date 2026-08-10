'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';

/**
 * Rattachement et périmètre.
 *
 * Deux capacités distinctes, parce que ce sont deux décisions distinctes :
 *
 * - le **périmètre** dit ce qu'une personne voit du compte. L'élargir revient à
 *   lui donner accès à des dossiers et des plannings qu'elle n'avait pas :
 *   c'est distribuer des droits, donc `settings.roles.manage` ;
 * - le **rattachement** dit sur quelle grille elle apparaît. C'est de
 *   l'organisation du travail, donc `settings.teams.manage`.
 *
 * L'établissement du contrat n'est modifiable ni par l'une ni par l'autre : il
 * est porté par le contrat, et ne se change que par avenant.
 */

export interface PlacementActionState {
  error?: string;
  ok?: boolean;
}

class ValidationError extends Error {}

const scopeInput = z.object({
  membershipId: z.string().min(1),
  allLocations: z.boolean(),
  locationIds: z.array(z.string().min(1)),
});

export async function updateScopeAction(
  _previous: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const parsed = scopeInput.safeParse({
    membershipId: formData.get('membershipId') ?? '',
    allLocations: formData.get('allLocations') === 'on',
    locationIds: formData.getAll('locationIds').map(String),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const { membershipId, allLocations, locationIds } = parsed.data;

  if (!allLocations && locationIds.length === 0) {
    return {
      error:
        'Sans accès généralisé, désignez au moins un établissement — sinon cette personne ne verrait plus rien.',
    };
  }

  try {
    await mutate('settings.roles.manage', async (db, actor) => {
      const membership = await db.membership.findUnique({
        where: { id: membershipId },
        select: { id: true },
      });
      if (!membership) throw new ValidationError('Salarié introuvable.');

      const known = await db.location.findMany({
        where: { id: { in: locationIds } },
        select: { id: true },
      });
      if (known.length !== locationIds.length) {
        throw new ValidationError('Établissement inconnu.');
      }

      const before = await db.membershipScope.findMany({
        where: { membershipId },
        select: { allLocations: true, locationId: true },
      });

      // Remplacement et non fusion : un périmètre qui ne fait que grandir ne
      // se réduit jamais, et le retrait d'un établissement resterait sans
      // effet — l'exact contraire de ce que l'écran promet.
      await db.membershipScope.deleteMany({ where: { membershipId } });

      if (allLocations) {
        await db.membershipScope.create({
          data: { membershipId, allLocations: true } as never,
        });
      } else {
        for (const locationId of locationIds) {
          await db.membershipScope.create({
            data: { membershipId, allLocations: false, locationId } as never,
          });
        }
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'membership.scope.update',
        entityType: 'Membership',
        entityId: membershipId,
        before: { scopes: before },
        after: { allLocations, locationIds },
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return {
        error:
          'Modifier un périmètre revient à distribuer des droits : la capacité « Gérer les rôles » est requise.',
      };
    }
    throw error;
  }

  revalidatePath(`/equipe/${membershipId}/planification`);
  return { ok: true };
}

const teamsInput = z.object({
  membershipId: z.string().min(1),
  teamIds: z.array(z.string().min(1)),
  primaryTeamId: z.string().trim(),
});

export async function updateTeamsAction(
  _previous: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const parsed = teamsInput.safeParse({
    membershipId: formData.get('membershipId') ?? '',
    teamIds: formData.getAll('teamIds').map(String),
    primaryTeamId: formData.get('primaryTeamId') ?? '',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const { membershipId, teamIds, primaryTeamId } = parsed.data;

  if (primaryTeamId && !teamIds.includes(primaryTeamId)) {
    return {
      error: 'L’équipe principale doit figurer parmi les équipes cochées.',
    };
  }

  try {
    await mutate('settings.teams.manage', async (db, actor) => {
      const known = await db.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true },
      });
      if (known.length !== teamIds.length) {
        throw new ValidationError('Équipe inconnue.');
      }

      const before = await db.teamMember.findMany({
        where: { membershipId },
        select: { teamId: true, isPrimary: true },
      });

      await db.teamMember.deleteMany({ where: { membershipId } });

      for (const teamId of teamIds) {
        await db.teamMember.create({
          data: {
            teamId,
            membershipId,
            // Une seule principale : c'est elle qui décide de la colonne où la
            // personne apparaît quand la grille n'en montre qu'une.
            isPrimary: teamId === (primaryTeamId || teamIds[0]),
          } as never,
        });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'membership.teams.update',
        entityType: 'Membership',
        entityId: membershipId,
        before: { teams: before },
        after: { teamIds, primaryTeamId: primaryTeamId || teamIds[0] || null },
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return {
        error: 'La capacité « Gérer les équipes » est requise.',
      };
    }
    throw error;
  }

  revalidatePath(`/equipe/${membershipId}/planification`);
  revalidatePath('/equipe');
  return { ok: true };
}
