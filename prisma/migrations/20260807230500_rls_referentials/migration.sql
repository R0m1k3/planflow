-- Étend l'isolation aux tables ajoutées par WP-02.
--
-- Une table portant `accountId` sans politique associée est un trou : elle
-- répond à tout le monde. C'est le mode de défaillance le plus discret de la
-- RLS — on n'ajoute pas une règle, on oublie d'en ajouter une.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['JobTitle', 'Label', 'AbsenceType', 'LegalConfigEntry']
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
