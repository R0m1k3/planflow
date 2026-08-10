'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError, can } from '@/domain/access/authorize';
import { isKnownCountry, isKnownDepartment } from '@/domain/hr/geo';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
import { encryptOptional } from '@/server/crypto';

/**
 * Saisie du dossier personnel — matrice n° 1 et registre unique du personnel.
 *
 * Deux points d'écriture et non un seul. L'état civil et les coordonnées se
 * modifient avec `members.edit` ; le NIR, l'IBAN et le BIC exigent en plus de
 * pouvoir les **lire**. Les fondre dans une seule action laisserait un profil
 * habilité à modifier mais pas à lire renvoyer des champs vides — et effacer
 * ainsi ce qui ne lui avait jamais été montré.
 */

export interface ProfileActionState {
  error?: string;
  ok?: boolean;
}

class ValidationError extends Error {}

/** Un champ laissé vide vaut « non renseigné », pas la chaîne vide. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value));

/** Une valeur vide vaut « non renseigné » ; toute autre doit être connue. */
const optionalEnum = <T extends readonly string[]>(values: T) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (values as readonly string[]).includes(value),
      'Valeur inconnue',
    )
    .transform((value) => (value === '' ? null : value));

const optionalCountry = () =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || isKnownCountry(value), 'Pays inconnu')
    .transform((value) => (value === '' ? null : value));

const optionalDepartment = () =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || isKnownDepartment(value),
      'Département inconnu',
    )
    .transform((value) => (value === '' ? null : value));

const profileInput = z.object({
  membershipId: z.string().min(1),
  gender: optionalEnum(['FEMALE', 'MALE', 'UNSPECIFIED'] as const),
  firstName: z.string().trim().min(1, 'Prénom requis').max(80),
  birthName: optionalText(80),
  lastName: z.string().trim().min(1, 'Nom requis').max(80),
  birthDate: optionalText(10),
  birthPlace: optionalText(120),
  // Les pays et le département viennent de listes fermées : accepter du texte
  // libre rendrait le référentiel inutile dès la première saisie à la main.
  birthCountry: optionalCountry(),
  birthDepartment: optionalDepartment(),
  nationality: optionalCountry(),
  maritalStatus: optionalEnum([
    'SINGLE',
    'MARRIED',
    'PACS',
    'COHABITING',
    'DIVORCED',
    'WIDOWED',
  ] as const),
  dependents: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^\d{1,2}$/.test(value),
      'Nombre de personnes à charge invalide',
    )
    .transform((value) => (value === '' ? null : Number(value))),
  personalEmail: z
    .string()
    .trim()
    .max(180)
    .refine(
      (value) => value === '' || z.string().email().safeParse(value).success,
      'Adresse électronique invalide',
    )
    .transform((value) => (value === '' ? null : value)),
  phone: optionalText(30),
  landline: optionalText(30),
  smsSchedules: z.boolean(),
  addressLine1: optionalText(180),
  addressLine2: optionalText(180),
  postalCode: optionalText(12),
  city: optionalText(120),
  country: optionalCountry(),
  emergencyContactName: optionalText(120),
  emergencyContactPhone: optionalText(30),
});

export async function updateProfileAction(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = profileInput.safeParse({
    ...Object.fromEntries(
      [
        'membershipId',
        'gender',
        'firstName',
        'birthName',
        'lastName',
        'birthDate',
        'birthPlace',
        'birthCountry',
        'birthDepartment',
        'nationality',
        'maritalStatus',
        'dependents',
        'personalEmail',
        'phone',
        'landline',
        'addressLine1',
        'addressLine2',
        'postalCode',
        'city',
        'country',
        'emergencyContactName',
        'emergencyContactPhone',
      ].map((key) => [key, formData.get(key) ?? '']),
    ),
    // Une case décochée n'est pas envoyée : son absence vaut « non », et la
    // lire comme une chaîne vide en ferait une valeur inconnue.
    smsSchedules: formData.get('smsSchedules') === 'on',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const { membershipId, birthDate, ...rest } = parsed.data;

  // Une date de naissance postérieure à aujourd'hui n'est pas une faute de
  // frappe anodine : elle fausse l'âge, et l'âge commande l'emploi des mineurs.
  let parsedBirthDate: Date | null = null;
  if (birthDate) {
    const candidate = new Date(`${birthDate}T00:00:00Z`);
    if (Number.isNaN(candidate.getTime()) || candidate > new Date()) {
      return { error: 'Date de naissance invalide.' };
    }
    parsedBirthDate = candidate;
  }

  try {
    await mutate('members.edit', async (db, actor) => {
      const existing = await db.employeeProfile.findUnique({
        where: { membershipId },
        select: { firstName: true, lastName: true },
      });
      if (!existing) throw new ValidationError('Dossier introuvable.');

      await db.employeeProfile.update({
        where: { membershipId },
        data: { ...rest, birthDate: parsedBirthDate } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'membership.profile.update',
        entityType: 'EmployeeProfile',
        entityId: membershipId,
        before: existing,
        after: { firstName: rest.firstName, lastName: rest.lastName },
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return { error: 'Vous n’avez pas le droit de modifier ce dossier.' };
    }
    throw error;
  }

  revalidatePath('/equipe');
  revalidatePath(`/equipe/${membershipId}`);
  return { ok: true };
}

const sensitiveInput = z.object({
  membershipId: z.string().min(1),
  socialSecurityNumber: optionalText(20),
  iban: optionalText(40),
  bic: optionalText(15),
});

/**
 * Écrit les trois champs chiffrés au repos.
 *
 * Le NIR est contrôlé sur sa forme — quinze chiffres — et non sur sa clé : un
 * refus fondé sur un calcul que le saisisseur ne peut pas refaire à la main
 * bloquerait des dossiers valides sans jamais dire lesquels.
 */
export async function updateSensitiveAction(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = sensitiveInput.safeParse({
    membershipId: formData.get('membershipId') ?? '',
    socialSecurityNumber: formData.get('socialSecurityNumber') ?? '',
    iban: formData.get('iban') ?? '',
    bic: formData.get('bic') ?? '',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const { membershipId } = parsed.data;
  const nir = parsed.data.socialSecurityNumber?.replace(/\s/g, '') ?? null;
  const iban = parsed.data.iban?.replace(/\s/g, '').toUpperCase() ?? null;
  const bic = parsed.data.bic?.replace(/\s/g, '').toUpperCase() ?? null;

  if (nir && !/^\d{15}$/.test(nir)) {
    return { error: 'Le numéro de sécurité sociale compte quinze chiffres.' };
  }
  if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return { error: 'IBAN invalide.' };
  }

  try {
    await mutate('members.edit', async (db, actor) => {
      // La capacité de lecture est exigée pour écrire : sans elle, le
      // formulaire n'aurait pas pu afficher la valeur en place, et l'envoyer
      // reviendrait à écraser à l'aveugle.
      if (!can(actor, 'members.documents.view')) {
        throw new AuthorizationError('members.documents.view');
      }

      await db.employeeProfile.update({
        where: { membershipId },
        data: {
          socialSecurityNumberEnc: encryptOptional(nir),
          ibanEnc: encryptOptional(iban),
          bicEnc: encryptOptional(bic),
        } as never,
      });

      // Le journal ne retient que **ce qui a été renseigné**, jamais la valeur :
      // il se relit, s'exporte et se conserve longtemps.
      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'membership.profile.sensitive.update',
        entityType: 'EmployeeProfile',
        entityId: membershipId,
        after: {
          socialSecurityNumber: nir ? 'renseigné' : 'effacé',
          iban: iban ? 'renseigné' : 'effacé',
          bic: bic ? 'renseigné' : 'effacé',
        },
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return {
        error: 'Vous n’avez pas le droit de modifier ces données protégées.',
      };
    }
    throw error;
  }

  revalidatePath(`/equipe/${membershipId}`);
  return { ok: true };
}

const permitInput = z.object({
  membershipId: z.string().min(1),
  /** Décoché = le salarié n'a pas besoin d'autorisation : les titres tombent. */
  foreignWorker: z.boolean(),
  permitType: z.string().trim().max(120),
  reference: z.string().trim().max(120),
  issuedAt: z.string().trim().max(10),
  expiresAt: z.string().trim().max(10),
});

/**
 * Titre de séjour valant autorisation de travail.
 *
 * L'échéance est **obligatoire** dès qu'un titre est déclaré : un titre sans
 * date de fin ne se surveille pas, et employer quelqu'un dont le titre a expiré
 * est un délit — c'est précisément ce que cette date permet d'éviter.
 *
 * Décocher retire le titre plutôt que de le laisser dormir : un titre conservé
 * pour un salarié qui n'en relève plus continuerait d'alarmer à son échéance.
 */
export async function updateWorkPermitAction(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = permitInput.safeParse({
    membershipId: formData.get('membershipId') ?? '',
    foreignWorker: formData.get('foreignWorker') === 'on',
    permitType: formData.get('permitType') ?? '',
    reference: formData.get('reference') ?? '',
    issuedAt: formData.get('issuedAt') ?? '',
    expiresAt: formData.get('expiresAt') ?? '',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const { membershipId, foreignWorker } = parsed.data;

  if (foreignWorker) {
    if (!parsed.data.permitType) {
      return { error: 'Précisez la nature du titre.' };
    }
    if (!parsed.data.reference) {
      return { error: 'La référence du titre est requise.' };
    }
    if (!parsed.data.expiresAt) {
      return {
        error:
          'La date d’expiration est requise : un titre sans échéance ne peut pas être surveillé.',
      };
    }
  }

  const issuedAt = parsed.data.issuedAt
    ? new Date(`${parsed.data.issuedAt}T00:00:00Z`)
    : null;
  const expiresAt = parsed.data.expiresAt
    ? new Date(`${parsed.data.expiresAt}T00:00:00Z`)
    : null;

  if (foreignWorker && expiresAt && issuedAt && expiresAt < issuedAt) {
    return { error: 'Le titre expire avant d’avoir été délivré.' };
  }

  try {
    await mutate('members.edit', async (db, actor) => {
      const before = await db.workPermit.findFirst({
        where: { membershipId },
        orderBy: { expiresAt: 'desc' },
        select: { id: true, permitType: true, expiresAt: true },
      });

      // Remplacement et non accumulation : la fiche n'en porte qu'un, et
      // empiler les renouvellements ferait surveiller une échéance périmée à
      // côté de la bonne.
      await db.workPermit.deleteMany({ where: { membershipId } });

      if (foreignWorker && expiresAt) {
        await db.workPermit.create({
          data: {
            membershipId,
            permitType: parsed.data.permitType,
            reference: parsed.data.reference,
            issuedAt,
            expiresAt,
          } as never,
        });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'membership.work_permit.update',
        entityType: 'Membership',
        entityId: membershipId,
        before: before
          ? {
              permitType: before.permitType,
              expiresAt: before.expiresAt.toISOString(),
            }
          : null,
        after: foreignWorker
          ? {
              permitType: parsed.data.permitType,
              expiresAt: expiresAt?.toISOString() ?? null,
            }
          : { removed: true },
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return { error: 'Vous n’avez pas le droit de modifier ce dossier.' };
    }
    throw error;
  }

  revalidatePath(`/equipe/${membershipId}`);
  return { ok: true };
}
