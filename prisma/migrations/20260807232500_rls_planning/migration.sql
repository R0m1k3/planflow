-- Étend l'isolation aux tables du planning.
--
-- La grille est la table la plus lue de l'application : c'est aussi celle où
-- une fuite inter-comptes serait la plus visible. Le test « toute table portant
-- accountId est protégée » échoue sans ceci.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['WeeklySchedule', 'Shift', 'Rest', 'DailyNote']
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
