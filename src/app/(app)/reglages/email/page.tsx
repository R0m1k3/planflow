import {
  EmailSettingsForm,
  TestEmailForm,
} from '@/components/settings/EmailSettingsForm';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { query, requireSession } from '@/server/context';

export const metadata = { title: 'Envoi de courrier · PlanFlow' };

/**
 * Réglages d'envoi.
 *
 * Le mot de passe n'est **pas** chargé, même chiffré : la page n'en a pas
 * besoin, et une valeur qui ne quitte jamais le serveur ne peut pas fuiter par
 * le HTML.
 */
async function loadSettings() {
  return query('settings.notifications.manage', async (db) => {
    const settings = await db.emailSettings.findFirst({
      select: {
        host: true,
        port: true,
        secure: true,
        username: true,
        passwordEnc: true,
        fromName: true,
        fromAddress: true,
        replyTo: true,
        verifiedAt: true,
        lastError: true,
      },
    });
    if (!settings) return null;

    const { passwordEnc, ...rest } = settings;
    return { ...rest, hasPassword: passwordEnc !== null };
  });
}

async function loadRecentLogs() {
  return query('settings.notifications.manage', async (db) =>
    db.emailLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 10,
      select: {
        id: true,
        to: true,
        subject: true,
        kind: true,
        status: true,
        error: true,
        sentAt: true,
      },
    }),
  );
}

export default async function EmailSettingsPage() {
  const session = await requireSession();
  const settings = await loadSettings();
  const logs = await loadRecentLogs();

  return (
    <PageBody>
      <PageHeader
        title="Envoi de courrier"
        subtitle="Le serveur qui expédie les invitations, les notifications et les informations dues aux salariés."
        actions={
          settings?.verifiedAt ? (
            <Badge tone="ok">
              Vérifié le {settings.verifiedAt.toISOString().slice(0, 10)}
            </Badge>
          ) : (
            <Badge tone="warn">Non vérifié</Badge>
          )
        }
      />

      {settings?.lastError ? (
        <p role="alert" className="rounded-3 border border-danger bg-danger-soft p-3 text-sm text-danger-soft-ink">
          Dernière tentative en échec — {settings.lastError}
        </p>
      ) : null}

      {/*
        La phrase « c'est *votre* serveur qui envoie » reste affichée une fois
        le réglage posé : elle répond à « depuis quelle adresse partent les
        messages ? », question qui se pose surtout quand la configuration
        existe déjà et qu'un salarié demande d'où vient le courrier.
      */}
      <section className="rounded-3 border border-line-1 bg-surface-2 p-4 text-sm text-ink-2">
        {!settings ? (
          <p className="mb-2 text-ink-1">
            <strong>Aucun serveur d’envoi n’est configuré.</strong> Tant que ce
            réglage manque, PlanFlow ne peut ni inviter un salarié, ni notifier
            une publication de planning, ni délivrer l’information due au retour
            d’un arrêt.
          </p>
        ) : null}
        <p>
          PlanFlow n’envoie rien par lui-même : il se connecte à{' '}
          <strong>votre</strong> serveur de messagerie. Les messages partent
          donc de votre domaine, et vos salariés reconnaissent l’expéditeur.
        </p>
      </section>

      <EmailSettingsForm settings={settings} />

      {settings ? <TestEmailForm defaultTo={session.user.email} /> : null}

      <section className="rounded-3 border border-line-1 bg-surface">
        <h2 className="border-b border-line-1 px-4 py-2 text-micro font-semibold tracking-[0.08em] text-ink-3 uppercase">
          Derniers envois
        </h2>
        {logs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-3">Aucun envoi enregistré.</p>
        ) : (
          <ul className="divide-y divide-line-1">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm"
              >
                <Badge tone={log.status === 'SENT' ? 'ok' : 'danger'}>
                  {log.status === 'SENT' ? 'Envoyé' : 'Échec'}
                </Badge>
                <span className="text-ink-1">{log.to}</span>
                <span className="text-ink-2">{log.subject}</span>
                {log.error ? (
                  <span className="text-micro text-danger">{log.error}</span>
                ) : null}
                <span className="ml-auto text-micro text-ink-3">
                  {log.sentAt.toISOString().slice(0, 16).replace('T', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-line-1 px-4 py-2 text-micro text-ink-3">
          Le contenu des messages n’est pas conservé : il porte des données
          personnelles et se régénère. Le journal sert à répondre à « je n’ai
          rien reçu », pas à relire le courrier.
        </p>
      </section>
    </PageBody>
  );
}
