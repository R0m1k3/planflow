import { NextResponse } from 'next/server';

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

  return NextResponse.json(
    { status: database.ok ? 'ok' : 'degraded' },
    {
      status: database.ok ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    },
  );
}
