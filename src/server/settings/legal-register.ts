'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { recordAudit } from '@/server/audit';
import { LEGAL_DOMAINS, LEGAL_DOMAIN_KEYS } from '@/domain/legal/domains';
import { mutate, query } from '@/server/context';

/**
 * Registre de paramétrage juridique — PLAN.md §12.7, matrice n° 1.
 *
 * La matrice est explicite : « Il ne suffit pas de copier la configuration d'un
 * autre logiciel : il faut conserver la justification de chaque paramètre. »
 *
 * Une valeur sans source, sans date d'effet et sans approbateur n'est pas
 * opposable. Ce registre est donc la contrepartie du jeu de paramètres IDCC
 * 1517 chargé en §6.3 : les valeurs existent, ce sont les preuves qui manquent.
 */

export interface LegalEntryRow {
  id: string;
  domain: string;
  key: string;
  value: string;
  source: string;
  effectiveFrom: Date;
  population: string;
  approvedBy: string | null;
  approvedAt: Date | null;
}

export interface LegalRegisterView {
  entries: LegalEntryRow[];
  /** Domaines sans aucune entrée approuvée. */
  missingDomains: string[];
  approvedCount: number;
  pendingCount: number;
}

export async function readLegalRegister(): Promise<LegalRegisterView> {
  return query('settings.access', async (db) => {
    const entries = await db.legalConfigEntry.findMany({
      orderBy: [{ domain: 'asc' }, { key: 'asc' }],
    });

    const approved = entries.filter((entry) => entry.approvedAt !== null);
    const domainsWithApproval = new Set(approved.map((entry) => entry.domain));

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        domain: entry.domain,
        key: entry.key,
        value: entry.value,
        source: entry.source,
        effectiveFrom: entry.effectiveFrom,
        population: entry.population,
        approvedBy: entry.approvedBy,
        approvedAt: entry.approvedAt,
      })),
      missingDomains: LEGAL_DOMAINS.filter(
        (domain) => !domainsWithApproval.has(domain.key),
      ).map((domain) => domain.label),
      approvedCount: approved.length,
      pendingCount: entries.length - approved.length,
    };
  });
}

const entryInput = z.object({
  domain: z.enum(LEGAL_DOMAIN_KEYS as unknown as [string, ...string[]]),
  key: z.string().trim().min(1, 'Paramètre requis').max(120),
  value: z.string().trim().min(1, 'Valeur requise').max(500),
  source: z
    .string()
    .trim()
    .min(1, 'Source requise — texte, article ou référence de l’accord')
    .max(500),
  effectiveFrom: z.coerce.date(),
  population: z.string().trim().min(1, 'Population requise').max(200),
});

export interface ActionState {
  error?: string;
  ok?: boolean;
}

export async function addLegalEntryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = entryInput.safeParse({
    domain: formData.get('domain'),
    key: formData.get('key'),
    value: formData.get('value'),
    source: formData.get('source'),
    effectiveFrom: formData.get('effectiveFrom'),
    population: formData.get('population'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  try {
    await mutate('settings.agreement.manage', async (db, actor) => {
      const created = await db.legalConfigEntry.create({
        data: {
          domain: parsed.data.domain,
          key: parsed.data.key,
          value: parsed.data.value,
          source: parsed.data.source,
          effectiveFrom: parsed.data.effectiveFrom,
          population: parsed.data.population,
        } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'legal_config.create',
        entityType: 'LegalConfigEntry',
        entityId: created.id,
        after: {
          domain: created.domain,
          key: created.key,
          value: created.value,
          source: created.source,
        },
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de gérer la convention." };
    }
    throw error;
  }

  revalidatePath('/reglages/registre');
  return { ok: true };
}

export async function approveLegalEntryAction(
  formData: FormData,
): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  await mutate('settings.agreement.manage', async (db, actor) => {
    const before = await db.legalConfigEntry.findUnique({ where: { id } });
    if (!before || before.approvedAt) return;

    // L'approbateur est l'acteur de la session, jamais un champ du formulaire :
    // une signature qu'on peut saisir soi-même ne vaut rien.
    await db.legalConfigEntry.update({
      where: { id },
      data: { approvedBy: actor.membershipId, approvedAt: new Date() },
    });

    await recordAudit(db, {
      actorMembershipId: actor.membershipId,
      action: 'legal_config.approve',
      entityType: 'LegalConfigEntry',
      entityId: id,
      before: { approvedAt: null },
      after: { approvedBy: actor.membershipId },
      reason: `Approbation du paramètre ${before.domain}.${before.key}`,
    });
  });

  revalidatePath('/reglages/registre');
}
