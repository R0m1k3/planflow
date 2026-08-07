import { checkDatabase } from '@/server/health';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const database = await checkDatabase();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">PlanFlow</h1>
        <p className="mt-2 text-neutral-600">
          Socle applicatif — lot WP-00. Les écrans métier arrivent aux lots suivants.
        </p>
      </div>

      <dl className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-neutral-600">Base de données</dt>
          <dd
            className={
              database.ok
                ? 'text-sm font-medium text-emerald-700'
                : 'text-sm font-medium text-red-700'
            }
          >
            {database.ok ? 'connectée' : `indisponible — ${database.error}`}
          </dd>
        </div>
      </dl>
    </main>
  );
}
