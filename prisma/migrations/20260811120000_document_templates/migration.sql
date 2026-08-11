-- ---------------------------------------------------------------------------
-- Modèles de documents — PLAN.md §4.7 et WP-10.
--
-- `templateId` sur Document est en ON DELETE SET NULL et non CASCADE : une
-- pièce déjà remise à un salarié ne doit pas disparaître parce qu'on a effacé
-- le modèle qui l'a produite. Le lien se perd, le document reste.
-- ---------------------------------------------------------------------------

CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "availableFields" JSONB NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentTemplate_accountId_name_key" ON "DocumentTemplate"("accountId", "name");

CREATE INDEX "DocumentTemplate_accountId_idx" ON "DocumentTemplate"("accountId");

ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Document" ADD COLUMN "templateId" TEXT;

CREATE INDEX "Document_templateId_idx" ON "Document"("templateId");

ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Isolation par compte — même défense en profondeur que les autres tables.
--
-- Un modèle porte le corps d'attestations et de courriers types : sa fuite
-- livrerait la raison sociale, les mentions et la forme des actes d'un autre
-- client. L'extension Prisma filtre déjà ; ces règles valent pour le cas où
-- elle serait contournée.
-- ---------------------------------------------------------------------------

ALTER TABLE "DocumentTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentTemplate" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "DocumentTemplate"
  USING ("accountId" = planflow_current_account());

CREATE POLICY tenant_insert ON "DocumentTemplate"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());
