-- ---------------------------------------------------------------------------
-- Isolation par compte — même défense en profondeur que les autres tables.
--
-- Une pièce de dossier RH est le pire objet à laisser franchir la frontière
-- entre deux comptes : elle porte un nom, une identité, parfois une donnée de
-- santé. L'extension Prisma filtre déjà, ces règles valent pour le cas où elle
-- serait contournée.
-- ---------------------------------------------------------------------------

ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Document"
  USING ("accountId" = planflow_current_account());

CREATE POLICY tenant_insert ON "Document"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());
