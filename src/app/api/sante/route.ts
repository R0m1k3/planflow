import { NextResponse } from 'next/server';

import { checkTenantIsolation } from '@/server/db-guard';
import { checkDatabase } from '@/server/health';

export const dynamic = 'force-dynamic';

/**
 * Point de santé, destiné aux sondes de conteneur.
 *
 * Il ne dit que « la base répond » : ni version, ni schéma, ni compte. Une
 * sonde est joignable sans authentification, elle ne doit donc rien apprendre
 * à qui la interroge.
 */
export async function GET() {
  const database = await checkDatabase();

  // L'isolation est signalée mais ne dégrade pas la sonde : une base joignable
  // avec un compte trop privilégié reste une application qui répond. Le refus
  // de démarrer, lui, est traité par assertTenantIsolation en production.
  const isolation = database.ok
    ? await checkTenantIsolation().catch(() => null)
    : null;

  return NextResponse.json(
    {
      status: database.ok ? 'ok' : 'degraded',
      tenantIsolation: isolation ? (isolation.ok ? 'enforced' : 'weakened') : 'unknown',
    },
    {
      status: database.ok ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  );
}
