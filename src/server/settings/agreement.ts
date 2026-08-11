'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import {
  agreementParametersSchema,
  parseAgreementParameters,
  type AgreementParameters,
} from '@/domain/compliance/parameters';
import { recordAudit } from '@/server/audit';
import { mutate, query } from '@/server/context';

/**
 * Convention collective — PLAN.md §9, réglage « /reglages/convention ».
 *
 * **Une convention ne se modifie pas : elle se réédite.** Chaque enregistrement
 * crée une version datée, laissant intacte la précédente. C'est l'exigence
 * effectif-datée de §12.2 : une paie de mars doit rester reproductible après un
 * changement de règle en juin, ce qu'une mise à jour en place rendrait
 * impossible — le moteur relirait les nouveaux seuils et produirait un autre
 * résultat sur les mêmes données.
 *
 * L'origine de chaque valeur est portée par le registre de paramétrage
 * (`LegalConfigEntry`, §12.7) : ordre public, disposition conventionnelle ou
 * accord d'entreprise ne se corrigent pas de la même main.
 */

export interface AgreementVersion {
  id: string;
  idcc: string;
  name: string;
  version: number;
  effectiveFrom: Date;
  source: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  parameters: AgreementParameters;
  /** Vraie pour la version applicable aujourd'hui. */
  isCurrent: boolean;
}

export async function listAgreementVersions(): Promise<AgreementVersion[]> {
  return query('settings.access', async (db) => {
    const rows = await db.collectiveAgreement.findMany({
      orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
    });

    const today = new Date();
    // La version courante est la plus récente **déjà en vigueur** : une version
    // datée du mois prochain existe en base sans gouverner le calcul du jour.
    const currentId = rows.find((row) => row.effectiveFrom <= today)?.id ?? null;

    return rows.map((row) => ({
      id: row.id,
      idcc: row.idcc,
      name: row.name,
      version: row.version,
      effectiveFrom: row.effectiveFrom,
      source: row.source,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      parameters: parseAgreementParameters(row.parameters),
      isCurrent: row.id === currentId,
    }));
  });
}

export interface ActionState {
  error?: string;
  ok?: boolean;
}

/**
 * Tranches d'heures supplémentaires, saisies une par ligne : `début;fin;taux`.
 *
 * Un tableau de longueur variable ne se saisit pas en champs fixes, et un JSON
 * brut exposerait la forme interne. Le format compact reste vérifiable à l'œil,
 * ce qui compte pour une valeur que le gestionnaire de paie doit relire.
 * `fin` vide signifie « jusqu'à l'infini ».
 */
function parseTiers(raw: string) {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const parts = line.split(';').map((part) => part.trim());
    if (parts.length !== 3) {
      throw new ParameterFormatError(
        `Tranche ${index + 1} : trois valeurs attendues « début;fin;taux ».`,
      );
    }
    const [from, to, rate] = parts as [string, string, string];
    const fromMinutes = Number(from);
    const toMinutes = to === '' ? null : Number(to);
    const ratePercent = Number(rate);

    if (
      !Number.isFinite(fromMinutes) ||
      (toMinutes !== null && !Number.isFinite(toMinutes)) ||
      !Number.isFinite(ratePercent)
    ) {
      throw new ParameterFormatError(
        `Tranche ${index + 1} : valeurs numériques attendues.`,
      );
    }

    return { fromMinutes, toMinutes, ratePercent };
  });
}

/** Dérogations de temps partiel : `code;libellé;minutes` par ligne. */
function parseDerogations(raw: string) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(';').map((part) => part.trim());
      if (parts.length !== 3) {
        throw new ParameterFormatError(
          `Dérogation ${index + 1} : « code;libellé;minutes » attendu.`,
        );
      }
      const [code, label, min] = parts as [string, string, string];
      const minWeeklyMinutes = Number(min);
      if (!code || !label || !Number.isFinite(minWeeklyMinutes)) {
        throw new ParameterFormatError(
          `Dérogation ${index + 1} : code, libellé et minutes requis.`,
        );
      }
      return { code, label, minWeeklyMinutes };
    });
}

class ParameterFormatError extends Error {}

const metaInput = z.object({
  idcc: z.string().trim().min(1, 'IDCC requis').max(10),
  name: z.string().trim().min(1, 'Intitulé requis').max(160),
  effectiveFrom: z.coerce.date(),
  source: z.string().trim().max(400),
  approvedBy: z.string().trim().max(160),
});

function num(formData: FormData, key: string): number {
  return Number(formData.get(key) ?? Number.NaN);
}

/**
 * Reconstruit le jeu complet depuis le formulaire, puis le valide.
 *
 * La validation passe par le **même** schéma que le chargement du moteur : un
 * jeu accepté ici est donc, par construction, un jeu que le moteur saura lire.
 */
function readParameters(formData: FormData): AgreementParameters {
  const candidate = {
    weeklyReferenceMinutes: num(formData, 'weeklyReferenceMinutes'),
    maxDailyWorkMinutes: num(formData, 'maxDailyWorkMinutes'),
    maxDailyAmplitudeMinutes:
      String(formData.get('maxDailyAmplitudeMinutes') ?? '') === ''
        ? null
        : num(formData, 'maxDailyAmplitudeMinutes'),
    minDailyRestMinutes: num(formData, 'minDailyRestMinutes'),
    minWeeklyRestMinutes: num(formData, 'minWeeklyRestMinutes'),
    maxWeeklyWorkAbsoluteMinutes: num(formData, 'maxWeeklyWorkAbsoluteMinutes'),
    averagedWeeklyWork: {
      windowWeeks: num(formData, 'averagedWindowWeeks'),
      maxAverageMinutes: num(formData, 'averagedMaxMinutes'),
    },
    maxConsecutiveWorkDays: num(formData, 'maxConsecutiveWorkDays'),
    breakAfterThreshold: {
      thresholdMinutes: num(formData, 'breakThresholdMinutes'),
      minBreakMinutes: num(formData, 'breakMinMinutes'),
    },
    partTime: {
      minWeeklyMinutes: num(formData, 'partTimeMinWeeklyMinutes'),
      derogations: parseDerogations(String(formData.get('derogations') ?? '')),
    },
    contractDeviationToleranceMinutes: num(formData, 'deviationToleranceMinutes'),
    overtime: {
      tiers: parseTiers(String(formData.get('overtimeTiers') ?? '')),
      annualQuotaMinutes: num(formData, 'overtimeQuotaMinutes'),
      beyondQuotaRestPercent: num(formData, 'overtimeBeyondRestPercent'),
    },
    complementaryHours: {
      firstTierRatePercent: num(formData, 'complementaryFirstRate'),
      beyondRatePercent: num(formData, 'complementaryBeyondRate'),
      firstTierFraction: num(formData, 'complementaryFirstFraction'),
      capFraction: num(formData, 'complementaryCapFraction'),
    },
    sunday: {
      premiumPercent: num(formData, 'sundayPremiumPercent'),
      compensatoryRestPercent: num(formData, 'sundayRestPercent'),
      mayorQuotaPerYear: num(formData, 'sundayMayorQuota'),
    },
    holiday: {
      workedPremiumPercent: num(formData, 'holidayWorkedPremium'),
      labourDayPremiumPercent: num(formData, 'holidayLabourDayPremium'),
      paidOffDaysPerYear: num(formData, 'holidayPaidOffDays'),
      substitutionRestPercent: num(formData, 'holidaySubstitutionRest'),
    },
    night: {
      startMinutes: num(formData, 'nightStartMinutes'),
      endMinutes: num(formData, 'nightEndMinutes'),
      notEnforceableFromAge: num(formData, 'nightNotEnforceableFromAge'),
    },
    forfaitJours: {
      maxDaysPerYear: num(formData, 'forfaitMaxDaysPerYear'),
      workloadReviewIntervalMonths: num(formData, 'forfaitReviewMonths'),
    },
  };

  const parsed = agreementParametersSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ParameterFormatError(
      `${issue?.path.join('.') ?? 'paramètre'} : ${issue?.message ?? 'valeur refusée'}`,
    );
  }
  return parsed.data;
}

export async function publishAgreementVersionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const meta = metaInput.safeParse({
    idcc: formData.get('idcc'),
    name: formData.get('name'),
    effectiveFrom: formData.get('effectiveFrom'),
    source: formData.get('source') ?? '',
    approvedBy: formData.get('approvedBy') ?? '',
  });

  if (!meta.success) {
    return { error: meta.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  let parameters: AgreementParameters;
  try {
    parameters = readParameters(formData);
  } catch (error) {
    if (error instanceof ParameterFormatError) return { error: error.message };
    throw error;
  }

  if (!meta.data.source) {
    // Une valeur sans source n'est pas opposable : le registre de paramétrage
    // exige de dire d'où elle vient avant de l'appliquer (§12.7).
    return {
      error:
        'Indiquez la source du texte : sans elle, le paramètre n’est pas opposable.',
    };
  }

  try {
    await mutate('settings.agreement.manage', async (db, actor) => {
      const last = await db.collectiveAgreement.findFirst({
        where: { idcc: meta.data.idcc },
        orderBy: { version: 'desc' },
      });

      const created = await db.collectiveAgreement.create({
        data: {
          idcc: meta.data.idcc,
          name: meta.data.name,
          parameters: parameters as never,
          version: (last?.version ?? 0) + 1,
          effectiveFrom: meta.data.effectiveFrom,
          source: meta.data.source,
          approvedBy: meta.data.approvedBy || null,
          approvedAt: meta.data.approvedBy ? new Date() : null,
        } as never,
      });

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'agreement.publish_version',
        entityType: 'CollectiveAgreement',
        entityId: created.id,
        before: last
          ? { version: last.version, effectiveFrom: last.effectiveFrom }
          : null,
        after: {
          version: created.version,
          effectiveFrom: created.effectiveFrom,
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

  revalidatePath('/reglages/convention');
  return { ok: true };
}
