-- Défense en profondeur — PLAN.md §3.1 et §3.5.
--
-- L'extension Prisma filtre déjà chaque requête par compte. Ces règles-ci
-- valent pour le cas où elle serait contournée : requête brute, bug de
-- câblage, ou console de maintenance. Une isolation qui repose sur une seule
-- couche applicative n'est pas une isolation.

-- ---------------------------------------------------------------------------
-- 1. Journal d'audit append-only
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION planflow_deny_write() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'La table % est en append-only : ni UPDATE ni DELETE. Une correction s''écrit, elle ne se réécrit pas.',
    TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION planflow_deny_write();

-- ---------------------------------------------------------------------------
-- 2. Row-level security, portée par le compte courant
-- ---------------------------------------------------------------------------
--
-- Le compte est transmis par `SET LOCAL app.account_id` à l'ouverture d'une
-- transaction (voir src/server/tenant.ts). Hors transaction scopée, le réglage
-- est absent et les politiques ne laissent rien passer.
--
-- current_setting(..., true) renvoie NULL plutôt que d'échouer quand le
-- réglage n'existe pas : c'est ce qui permet à la politique de refuser au lieu
-- de faire planter la requête avec une erreur peu parlante.

CREATE OR REPLACE FUNCTION planflow_current_account() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.account_id', true), '');
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Location', 'Team', 'Membership', 'MembershipScope', 'Invitation',
    'Role', 'AuditLog', 'RetentionPolicy', 'FeatureFlag'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("accountId" = planflow_current_account())',
      t
    );
    EXECUTE format(
      'CREATE POLICY tenant_insert ON %I FOR INSERT WITH CHECK ("accountId" = planflow_current_account())',
      t
    );
  END LOOP;
END;
$$;

-- Account lui-même : lecture limitée au compte courant.
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Account"
  USING (id = planflow_current_account());
CREATE POLICY tenant_insert ON "Account"
  FOR INSERT WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. Rôle applicatif
-- ---------------------------------------------------------------------------
--
-- Le propriétaire d'une table contourne la RLS, sauf FORCE ci-dessus. FORCE
-- l'applique aussi au propriétaire, donc les migrations et les tâches
-- d'administration doivent passer explicitement par un compte à privilèges.
-- On ne crée pas de rôle séparé ici : le déploiement auto-hébergé n'en a qu'un,
-- et FORCE suffit à rendre les politiques effectives.
