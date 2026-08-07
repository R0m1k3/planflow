-- Étend l'isolation aux tables du dossier salarié.
--
-- Le test « toute table portant accountId est protégée » échoue sans ceci :
-- c'est lui qui transforme cet oubli en échec de CI plutôt qu'en fuite.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'EmployeeProfile', 'WorkPermit', 'UserContract', 'Amendment',
    'ForfaitDayEntry', 'WorkloadReview'
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
