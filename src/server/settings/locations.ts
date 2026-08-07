'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { recordAudit } from '@/server/audit';
import { mutate, query } from '@/server/context';

/**
 * Établissements et équipes.
 *
 * Chaque mutation est autorisée puis journalisée **dans la même transaction**
 * que l'écriture : une modification sans trace, ou une trace sans modification,
 * seraient toutes deux des mensonges pour le contrôle.
 */

export interface LocationRow {
  id: string;
  name: string;
  siret: string | null;
  timezone: string;
  employerContributionRate: string;
  archivedAt: Date | null;
  teams: Array<{ id: string; name: string; archivedAt: Date | null }>;
}

export async function listLocations(
  includeArchived = false,
): Promise<LocationRow[]> {
  return query('settings.access', async (db) => {
    const locations = await db.location.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: { name: 'asc' },
      include: {
        teams: {
          where: includeArchived ? {} : { archivedAt: null },
          orderBy: { position: 'asc' },
        },
      },
    });

    return locations.map((location) => ({
      id: location.id,
      name: location.name,
      siret: location.siret,
      timezone: location.timezone,
      employerContributionRate: location.employerContributionRate.toString(),
      archivedAt: location.archivedAt,
      teams: location.teams.map((team) => ({
        id: team.id,
        name: team.name,
        archivedAt: team.archivedAt,
      })),
    }));
  });
}

const locationInput = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(120),
  siret: z
    .string()
    .trim()
    .regex(/^\d{14}$/, 'Le SIRET compte 14 chiffres')
    .or(z.literal('')),
  timezone: z.string().trim().min(1),
  employerContributionRate: z.coerce
    .number()
    .min(0, 'Taux négatif impossible')
    .max(100, 'Un taux de cotisations dépasse rarement 100 %'),
});

export interface ActionState {
  error?: string;
  ok?: boolean;
}

export async function createLocationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = locationInput.safeParse({
    name: formData.get('name'),
    siret: formData.get('siret') ?? '',
    timezone: formData.get('timezone') || 'Europe/Paris',
    employerContributionRate: formData.get('employerContributionRate') ?? 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('settings.locations.manage', async (db, actor) => {
      const created = await db.location.create({
        data: {
          name: parsed.data.name,
          siret: parsed.data.siret || null,
          timezone: parsed.data.timezone,
          employerContributionRate: parsed.data.employerContributionRate,
        } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'location.create',
        entityType: 'Location',
        entityId: created.id,
        after: {
          name: created.name,
          siret: created.siret,
          timezone: created.timezone,
        },
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les établissements." };
    }
    throw error;
  }

  revalidatePath('/reglages/etablissements');
  return { ok: true };
}

export async function archiveLocationAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await mutate('settings.locations.manage', async (db, actor) => {
    const before = await db.location.findUnique({ where: { id } });
    if (!before) return;

    // Archiver plutôt que supprimer : un établissement fermé garde des
    // plannings, des contrats et des variables de paie dont la conservation
    // court encore (PLAN.md §12.5).
    await db.location.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await recordAudit(db, {
      actorMembershipId: actor.membershipId,
      action: 'location.archive',
      entityType: 'Location',
      entityId: id,
      before: { archivedAt: before.archivedAt },
      after: { archivedAt: new Date().toISOString() },
    });
  });

  revalidatePath('/reglages/etablissements');
}

const teamInput = z.object({
  locationId: z.string().min(1),
  name: z.string().trim().min(1, "Nom d'équipe requis").max(120),
});

export async function createTeamAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = teamInput.safeParse({
    locationId: formData.get('locationId'),
    name: formData.get('name'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate(
      'settings.teams.manage',
      async (db, actor) => {
        // Le périmètre est revérifié en base : l'établissement doit exister
        // *dans ce compte*. Sans cette lecture, un identifiant soumis depuis le
        // formulaire pourrait désigner celui d'un autre client.
        const location = await db.location.findUnique({
          where: { id: parsed.data.locationId },
        });
        if (!location) {
          throw new AuthorizationError('settings.teams.manage');
        }

        const count = await db.team.count({
          where: { locationId: location.id },
        });

        const created = await db.team.create({
          data: {
            locationId: location.id,
            name: parsed.data.name,
            position: count,
          } as never,
        });

        await recordAudit(db, {
          actorMembershipId: actor.membershipId,
          action: 'team.create',
          entityType: 'Team',
          entityId: created.id,
          after: { name: created.name, locationId: location.id },
        });
      },
      { locationId: parsed.data.locationId },
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer les équipes." };
    }
    throw error;
  }

  revalidatePath('/reglages/etablissements');
  return { ok: true };
}
