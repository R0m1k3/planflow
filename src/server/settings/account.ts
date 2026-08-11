'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import {
  PREFERENCE_KEYS,
  timeToMinutes,
} from '@/domain/settings/preferences';
import { recordAudit } from '@/server/audit';
import { mutate, query } from '@/server/context';

/**
 * Compte et préférences — PLAN.md §9, `/reglages/compte` et
 * `/reglages/preferences`.
 *
 * Les préférences sont une ligne créée à la demande : l'absence de ligne vaut
 * « tous les défauts ». Semer une ligne à l'installation obligerait à migrer
 * chaque compte au premier réglage ajouté ; la lire avec un repli sur les
 * défauts du modèle ne coûte rien et ne se périme pas.
 */

export interface AccountIdentity {
  id: string;
  name: string;
  siren: string | null;
  apeCode: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  timezone: string;
}

export interface Preferences {
  defaultMealPerShift: boolean;
  paidBreaks: boolean;
  lockEmployeeMeals: boolean;
  employeesSeeOwnTotals: boolean;
  employeesSeeTeamPlanning: boolean;
  hideForfaitCounters: boolean;
  eveningShiftStartMinutes: number;
  employeesEditOwnProfile: boolean;
  employeesSeeOwnTimesheets: boolean;
  employeesSeeTeamContacts: boolean;
  managerCreatedArePlannable: boolean;
  directorsSharePeople: boolean;
  directorsAccessHrDashboard: boolean;
  directorsSeePaidLeave: boolean;
  managersSeePaidLeave: boolean;
  smoothOvertimeMonthly: boolean;
  includeRestInNormalHours: boolean;
  autoEmployeeNumber: boolean;
}

const DEFAULTS: Preferences = {
  defaultMealPerShift: false,
  paidBreaks: false,
  lockEmployeeMeals: false,
  employeesSeeOwnTotals: true,
  employeesSeeTeamPlanning: false,
  hideForfaitCounters: true,
  eveningShiftStartMinutes: 1200,
  employeesEditOwnProfile: true,
  employeesSeeOwnTimesheets: true,
  employeesSeeTeamContacts: false,
  managerCreatedArePlannable: false,
  directorsSharePeople: false,
  directorsAccessHrDashboard: true,
  directorsSeePaidLeave: true,
  managersSeePaidLeave: false,
  smoothOvertimeMonthly: false,
  includeRestInNormalHours: false,
  autoEmployeeNumber: false,
};

export async function getAccountIdentity(): Promise<AccountIdentity | null> {
  return query('settings.access', async (db, actor) => {
    const account = await db.account.findUnique({
      where: { id: actor.accountId },
    });
    if (!account) return null;

    return {
      id: account.id,
      name: account.name,
      siren: account.siren,
      apeCode: account.apeCode,
      addressLine: account.addressLine,
      postalCode: account.postalCode,
      city: account.city,
      country: account.country,
      timezone: account.timezone,
    };
  });
}

export async function getPreferences(): Promise<Preferences> {
  return query('settings.access', async (db, actor) => {
    const row = await db.accountPreferences.findUnique({
      where: { accountId: actor.accountId },
    });
    if (!row) return DEFAULTS;

    const { accountId: _ignored, updatedAt: _stamp, ...values } = row;
    return values;
  });
}

export interface ActionState {
  error?: string;
  ok?: boolean;
}

const identityInput = z.object({
  name: z.string().trim().min(1, 'Raison sociale requise').max(200),
  siren: z
    .string()
    .trim()
    .regex(/^\d{9}$/, 'Le SIREN compte 9 chiffres')
    .or(z.literal('')),
  apeCode: z
    .string()
    .trim()
    .regex(/^\d{4}[A-Z]$/, 'Le code APE s’écrit « 4759B »')
    .or(z.literal('')),
  addressLine: z.string().trim().max(200),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Le code postal compte 5 chiffres')
    .or(z.literal('')),
  city: z.string().trim().max(120),
  timezone: z.string().trim().min(1).max(64),
});

export async function saveAccountIdentityAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = identityInput.safeParse({
    name: formData.get('name'),
    siren: formData.get('siren') ?? '',
    apeCode: formData.get('apeCode') ?? '',
    addressLine: formData.get('addressLine') ?? '',
    postalCode: formData.get('postalCode') ?? '',
    city: formData.get('city') ?? '',
    timezone: formData.get('timezone') || 'Europe/Paris',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('settings.locations.manage', async (db, actor) => {
      const before = await db.account.findUnique({
        where: { id: actor.accountId },
      });
      if (!before) throw new AuthorizationError('settings.locations.manage');

      const data = {
        name: parsed.data.name,
        siren: parsed.data.siren || null,
        apeCode: parsed.data.apeCode || null,
        addressLine: parsed.data.addressLine || null,
        postalCode: parsed.data.postalCode || null,
        city: parsed.data.city || null,
        timezone: parsed.data.timezone,
      };

      await db.account.update({ where: { id: actor.accountId }, data });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'account.update',
        entityType: 'Account',
        entityId: actor.accountId,
        before: {
          name: before.name,
          siren: before.siren,
          apeCode: before.apeCode,
          city: before.city,
          timezone: before.timezone,
        },
        after: data,
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de modifier le compte." };
    }
    throw error;
  }

  revalidatePath('/reglages/compte');
  return { ok: true };
}

/**
 * Enregistre un bloc de préférences.
 *
 * Les cases non cochées n'arrivent pas dans le `FormData` : le formulaire porte
 * donc la liste des clés qu'il gouverne, et seules celles-là sont réécrites.
 * Sans cette liste, enregistrer le bloc « Plannings » remettrait à faux tout le
 * bloc « Droits » — un formulaire partiel effacerait ce qu'il n'affiche pas.
 */
export async function savePreferencesAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const scope = formData
    .getAll('scope')
    .map(String)
    .filter((key) => PREFERENCE_KEYS.includes(key));

  if (scope.length === 0) {
    return { error: 'Formulaire incomplet : aucun réglage à enregistrer.' };
  }

  const values: Record<string, boolean | number> = {};
  for (const key of scope) {
    values[key] = formData.get(key) === 'on';
  }

  const eveningRaw = formData.get('eveningShiftStart');
  if (typeof eveningRaw === 'string' && eveningRaw !== '') {
    const minutes = timeToMinutes(eveningRaw);
    if (minutes === null) {
      return { error: 'Heure de bascule du soir invalide (format HH:MM).' };
    }
    values.eveningShiftStartMinutes = minutes;
  }

  try {
    await mutate('settings.access', async (db, actor) => {
      const before = await db.accountPreferences.findUnique({
        where: { accountId: actor.accountId },
      });

      await db.accountPreferences.upsert({
        where: { accountId: actor.accountId },
        create: values as never,
        update: values as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'account.preferences.update',
        entityType: 'AccountPreferences',
        entityId: actor.accountId,
        before: before
          ? Object.fromEntries(
              Object.keys(values).map((key) => [
                key,
                (before as Record<string, unknown>)[key],
              ]),
            )
          : null,
        after: values,
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de modifier les réglages." };
    }
    throw error;
  }

  revalidatePath('/reglages/preferences');
  revalidatePath('/reglages/paie');
  return { ok: true };
}
