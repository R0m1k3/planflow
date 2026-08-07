import { prisma } from '@/server/db';

export interface HealthResult {
  ok: boolean;
  error?: string;
}

/** Round-trips a trivial query so the landing page reports real connectivity. */
export async function checkDatabase(): Promise<HealthResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'erreur inconnue',
    };
  }
}
