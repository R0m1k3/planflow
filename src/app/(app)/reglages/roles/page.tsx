import {
  CreateRoleForm,
  DeleteRoleForm,
  RolePermissionsForm,
  type CapabilityView,
  type RoleView,
} from '@/components/settings/RoleEditor';
import { PageBody, PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { query } from '@/server/context';

export const metadata = { title: 'Rôles et permissions · PlanFlow' };
export const dynamic = 'force-dynamic';

/**
 * Rôles et capacités.
 *
 * Critère d'acceptation de WP-01 : un rôle personnalisé créé par un client doit
 * modifier effectivement l'accès, sans changement de code. Le code ne teste
 * jamais un nom de rôle, seulement des capacités — c'est ce qui rend cet écran
 * possible.
 */
export default async function RolesPage() {
  const { roles, capabilities } = await query(
    'settings.roles.manage',
    async (db, actor) => {
      const [rows, permissions] = await Promise.all([
        db.role.findMany({
          orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
          include: {
            permissions: { include: { permission: true } },
            _count: { select: { memberships: true } },
          },
        }),
        db.permission.findMany({ orderBy: [{ category: 'asc' }, { code: 'asc' }] }),
      ]);

      return {
        roles: rows.map(
          (role): RoleView => ({
            id: role.id,
            key: role.key,
            name: role.name,
            isSystem: role.isSystem,
            memberCount: role._count.memberships,
            granted: role.permissions.map((entry) => entry.permission.code),
          }),
        ),
        capabilities: permissions.map(
          (permission): CapabilityView => ({
            code: permission.code,
            category: permission.category,
            label: permission.label,
            // Calculé côté serveur depuis l'acteur : le client n'a pas à
            // décider ce qu'il a le droit d'accorder.
            grantable: actor.permissions.has(permission.code),
          }),
        ),
      };
    },
  );

  return (
    <PageBody>
      <PageHeader
        title="Rôles et permissions"
        subtitle="Le code teste des capacités, jamais un nom de rôle : renommer « Manager » ou en créer un cinquième ne casse rien."
        actions={<Badge tone="neutral">{roles.length} rôles</Badge>}
      />

      <section className="rounded-3 border border-line-1 bg-surface-2 p-4 text-sm text-ink-2">
        <p>
          Vous ne pouvez accorder que les capacités que vous détenez vous-même —
          sinon cet écran suffirait à s’octroyer l’accès aux rémunérations.
          Retirer reste possible : réduire un droit n’a jamais élargi le sien.
        </p>
        <p className="mt-2">
          Au moins un rôle doit conserver « Gérer les rôles », faute de quoi
          l’organisation se fermerait dehors et le seul recours serait une
          intervention en base.
        </p>
      </section>

      <Card>
        <CardHeader title="Créer un rôle" />
        <div className="p-4">
          <CreateRoleForm />
        </div>
      </Card>

      {roles.map((role) => (
        <Card key={role.id}>
          <CardHeader
            title={role.name}
            badge={<Badge tone="neutral">{role.granted.length}</Badge>}
          />
          <RolePermissionsForm role={role} capabilities={capabilities} />
          <DeleteRoleForm role={role} />
        </Card>
      ))}
    </PageBody>
  );
}
