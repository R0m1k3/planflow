/**
 * Purge périodique — PLAN.md §12.5, matrice n° 21.
 *
 * La matrice demande des purges **automatiques**. Un bouton qu'il faut penser à
 * presser n'en est pas une : ce script est fait pour une tâche planifiée.
 *
 *     pnpm retention:purge          # tous les comptes
 *     pnpm retention:purge --dry    # inventaire seulement
 *
 * Il passe par le client scopé et la RLS, compte par compte : une purge qui
 * contournerait l'isolation serait le pire endroit où la perdre.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { inspectRetention, runRetentionPurge } from '../src/server/retention/purge';
import { withTenant } from '../src/server/tenant';

const dryRun = process.argv.includes('--dry');

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const accounts = await prisma.account.findMany({
    select: { id: true, name: true },
  });

  for (const account of accounts) {
    await withTenant(account.id, async (db) => {
      if (dryRun) {
        const candidates = await inspectRetention(db);
        const due = candidates.filter((entry) => entry.verdict === 'DUE');
        console.log(
          `${account.name} — ${due.length} pièce(s) échue(s) sur ${candidates.length}`,
        );
        for (const entry of due) {
          console.log(`  ${entry.name} (${entry.category}) — ${entry.dueVia}`);
        }
        return;
      }

      // L'acteur est la purge elle-même : aucun humain ne décide pièce par
      // pièce, et attribuer l'effacement à la dernière personne connectée
      // fausserait le journal.
      const report = await runRetentionPurge(db, 'retention');
      console.log(`${account.name} — ${report.purged} pièce(s) effacée(s)`);
    });
  }

  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
