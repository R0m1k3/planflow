'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuthorizationError } from '@/domain/access/authorize';
import { PAYROLL_ELEMENT_DEFINITIONS } from '@/domain/payroll/elements';
import {
  checksum,
  formatSilaeCsv,
  SilaeExportError,
} from '@/domain/payroll/silae';
import { parseMonthParam } from '@/domain/planning/month';
import { recordAudit } from '@/server/audit';
import { mutate } from '@/server/context';
import { buildPayrollPeriod, toSilaeLines } from '@/server/payroll/build';

export interface PayrollActionState {
  error?: string;
  ok?: boolean;
  /** Contenu du fichier, remis au navigateur pour téléchargement. */
  csv?: string;
  filename?: string;
  checksum?: string;
}

class ValidationError extends Error {}

const ELEMENT_KEYS = PAYROLL_ELEMENT_DEFINITIONS.map(
  (definition) => definition.key,
) as [string, ...string[]];

const mappingInput = z.object({
  sourceKey: z.enum(ELEMENT_KEYS),
  silaeCode: z.string().trim().max(80),
  confirmed: z.boolean(),
});

/**
 * Enregistre la correspondance d'un élément vers un code Silae.
 *
 * `confirmed` n'est pas une case décorative : l'export refuse de tourner tant
 * qu'une correspondance n'a pas été confirmée. Les codes appartiennent au
 * dossier du cabinet, et une correspondance devinée produirait une paie fausse
 * qui se chargerait sans erreur.
 */
export async function saveMappingAction(
  _previous: PayrollActionState,
  formData: FormData,
): Promise<PayrollActionState> {
  const parsed = mappingInput.safeParse({
    sourceKey: formData.get('sourceKey'),
    silaeCode: formData.get('silaeCode') ?? '',
    confirmed: formData.get('confirmed') === 'on',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' };
  }

  const definition = PAYROLL_ELEMENT_DEFINITIONS.find(
    (entry) => entry.key === parsed.data.sourceKey,
  );
  if (!definition) return { error: 'Élément de paie inconnu.' };

  try {
    await mutate('payroll.export.silae', async (db, actor) => {
      if (parsed.data.confirmed && !parsed.data.silaeCode) {
        throw new ValidationError(
          'Une correspondance ne peut pas être confirmée sans code.',
        );
      }

      const existing = await db.silaeCodeMapping.findFirst({
        where: { sourceKey: parsed.data.sourceKey },
      });

      if (existing) {
        await db.silaeCodeMapping.update({
          where: { id: existing.id },
          data: {
            silaeCode: parsed.data.silaeCode,
            confirmed: parsed.data.confirmed,
          },
        });
      } else {
        await db.silaeCodeMapping.create({
          data: {
            sourceKey: parsed.data.sourceKey,
            silaeCode: parsed.data.silaeCode,
            label: definition.label,
            kind: definition.kind,
            confirmed: parsed.data.confirmed,
          } as never,
        });
      }

      await recordAudit(db, {
        actorMembershipId: actor.membershipId,
        action: 'payroll.mapping.update',
        entityType: 'SilaeCodeMapping',
        entityId: parsed.data.sourceKey,
        before: existing
          ? { silaeCode: existing.silaeCode, confirmed: existing.confirmed }
          : null,
        after: {
          silaeCode: parsed.data.silaeCode,
          confirmed: parsed.data.confirmed,
        },
      });
    });
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de modifier les correspondances." };
    }
    throw error;
  }

  revalidatePath('/paie/silae');
  return { ok: true };
}

const exportInput = z.object({
  month: z.string().min(1),
  locationId: z.string().min(1),
});

/**
 * Produit le fichier Silae de la période.
 *
 * Le fichier n'est **pas** conservé en base : il porte les heures et les
 * absences de salariés identifiables, et sa génération est déterministe. Seule
 * l'empreinte est écrite, ce qui suffit à prouver qu'un réexport est identique.
 */
export async function exportSilaeAction(
  _previous: PayrollActionState,
  formData: FormData,
): Promise<PayrollActionState> {
  const parsed = exportInput.safeParse({
    month: formData.get('month'),
    locationId: formData.get('locationId'),
  });
  if (!parsed.success) return { error: 'Période ou établissement invalide.' };

  const month = parseMonthParam(parsed.data.month);
  if (!month) return { error: 'Période invalide.' };

  let csv = '';
  let digest = '';
  let filename = '';

  try {
    await mutate(
      'payroll.export.silae',
      async (db, actor) => {
        const period = await buildPayrollPeriod(
          db,
          month,
          parsed.data.locationId,
        );
        if (!period) {
          throw new ValidationError(
            "Aucune convention collective n'est chargée pour cette période.",
          );
        }

        // Un export partiel se charge sans erreur et rend la paie fausse pour
        // les salariés absents du fichier : il vaut mieux ne rien produire.
        if (period.blockers.length > 0) {
          throw new ValidationError(period.blockers.join(' · '));
        }
        if (period.rows.length === 0) {
          throw new ValidationError(
            'Aucun élément de paie sur cette période : rien à exporter.',
          );
        }

        const result = formatSilaeCsv(toSilaeLines(period));
        csv = result.csv;
        digest = await checksum(csv);
        filename = `silae-${period.location.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}-${parsed.data.month}.csv`;

        const record = await db.payrollExport.create({
          data: {
            locationId: parsed.data.locationId,
            periodStart: new Date(`${period.startDate}T00:00:00Z`),
            periodEnd: new Date(`${period.endDate}T00:00:00Z`),
            checksum: digest,
            lineCount: result.lineCount,
            generatedBy: actor.membershipId,
          } as never,
        });

        await recordAudit(db, {
          actorMembershipId: actor.membershipId,
          action: 'payroll.export.silae',
          entityType: 'PayrollExport',
          entityId: record.id,
          after: {
            period: `${period.startDate} → ${period.endDate}`,
            lines: result.lineCount,
            checksum: digest,
          },
        });
      },
      { locationId: parsed.data.locationId },
    );
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    if (error instanceof SilaeExportError) {
      return { error: error.issues.map((issue) => issue.message).join(' · ') };
    }
    if (error instanceof AuthorizationError) {
      return { error: "Vous n'avez pas le droit de produire cet export." };
    }
    throw error;
  }

  revalidatePath('/paie');
  return { ok: true, csv, filename, checksum: digest };
}
