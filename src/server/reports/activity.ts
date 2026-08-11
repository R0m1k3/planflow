import { query } from '@/server/context';

/**
 * Journal d'activité — PLAN.md §9, `/rapports/activite`.
 *
 * Le journal d'audit est append-only, imposé par un trigger. Cet écran ne fait
 * que le lire : aucune action ne s'y trouve, et c'est le point. Une piste que
 * l'on peut trier, filtrer et exporter, mais jamais corriger, est la seule qui
 * prouve quelque chose.
 *
 * L'accès passe par `audit.view`, capacité distincte de l'administration : on
 * confie la lecture de la piste à un contrôleur sans lui donner le droit de
 * modifier ce qu'elle enregistre.
 */

export interface ActivityEntry {
  id: string;
  occurredAt: Date;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string;
  reason: string | null;
  ip: string | null;
  /** Champs dont la valeur a changé, sans leur contenu. */
  changedFields: string[];
}

export interface ActivityFilters {
  /** Préfixe d'action, par exemple `planning` ou `payroll.period`. */
  domain?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export interface ActivityPage {
  entries: ActivityEntry[];
  /** Domaines présents dans le journal, pour le filtre. */
  domains: string[];
  entityTypes: string[];
  total: number;
  truncated: boolean;
}

const PAGE_SIZE = 200;

/**
 * Noms des champs modifiés, sans leur valeur.
 *
 * La piste enregistre l'avant et l'après en clair — c'est ce qui la rend
 * opposable. Les afficher dans une liste, en revanche, exposerait un salaire ou
 * une donnée de santé à quiconque ouvre l'écran. Le journal dit **ce qui** a
 * changé ; le détail se lit sur la fiche, sous ses propres autorisations.
 */
function changedFields(before: unknown, after: unknown): string[] {
  const keys = new Set<string>();
  for (const value of [before, after]) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const key of Object.keys(value)) keys.add(key);
    }
  }
  return [...keys].sort();
}

export async function getActivity(
  filters: ActivityFilters = {},
): Promise<ActivityPage> {
  return query('audit.view', async (db) => {
    const where = {
      ...(filters.domain ? { action: { startsWith: filters.domain } } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.from || filters.to
        ? {
            occurredAt: {
              ...(filters.from
                ? { gte: new Date(`${filters.from}T00:00:00Z`) }
                : {}),
              // Borne haute inclusive : filtrer « jusqu'au 31 » doit contenir
              // le 31, pas s'arrêter à son premier instant.
              ...(filters.to
                ? { lte: new Date(`${filters.to}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: PAGE_SIZE,
        include: {
          actor: {
            include: {
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    // Les listes de filtres viennent du journal lui-même : une action ajoutée
    // par un lot futur y apparaît sans qu'on ait à tenir une énumération à
    // jour, et une énumération figée finirait par masquer ce qu'elle omet.
    const [actions, types] = await Promise.all([
      db.auditLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
        take: 500,
      }),
      db.auditLog.findMany({
        distinct: ['entityType'],
        select: { entityType: true },
        orderBy: { entityType: 'asc' },
        take: 200,
      }),
    ]);

    return {
      entries: rows.map((row) => ({
        id: row.id,
        occurredAt: row.occurredAt,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        actorName: row.actor
          ? `${row.actor.profile?.firstName ?? ''} ${row.actor.profile?.lastName ?? row.actor.employeeNumber}`.trim()
          : 'Système',
        reason: row.reason,
        ip: row.ip,
        changedFields: changedFields(row.before, row.after),
      })),
      domains: [
        ...new Set(
          actions.map((row) => row.action.split('.')[0] ?? row.action),
        ),
      ].sort(),
      entityTypes: types.map((row) => row.entityType),
      total,
      truncated: total > rows.length,
    };
  });
}
