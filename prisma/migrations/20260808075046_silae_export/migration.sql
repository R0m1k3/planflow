-- CreateEnum
CREATE TYPE "SilaeMappingKind" AS ENUM ('SERVICE', 'OVERTIME', 'ABSENCE', 'VARIABLE');

-- CreateTable
CREATE TABLE "SilaeCodeMapping" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "silaeCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "SilaeMappingKind" NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SilaeCodeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollExport" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "locationId" TEXT,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "checksum" TEXT NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "generatedBy" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SilaeCodeMapping_accountId_idx" ON "SilaeCodeMapping"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "SilaeCodeMapping_accountId_sourceKey_key" ON "SilaeCodeMapping"("accountId", "sourceKey");

-- CreateIndex
CREATE INDEX "PayrollExport_accountId_periodStart_idx" ON "PayrollExport"("accountId", "periodStart");

-- CreateIndex
CREATE INDEX "PayrollExport_accountId_idx" ON "PayrollExport"("accountId");

-- Isolation : toute table portant accountId doit porter sa politique.
ALTER TABLE "SilaeCodeMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SilaeCodeMapping" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SilaeCodeMapping"
  USING ("accountId" = planflow_current_account());
CREATE POLICY tenant_insert ON "SilaeCodeMapping"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());

ALTER TABLE "PayrollExport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollExport" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PayrollExport"
  USING ("accountId" = planflow_current_account());
CREATE POLICY tenant_insert ON "PayrollExport"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());

-- Une trace d'export ne se réécrit pas : elle atteste de ce qui a été transmis
-- au gestionnaire de paie, à une date donnée.
CREATE TRIGGER payroll_export_append_only
  BEFORE UPDATE OR DELETE ON "PayrollExport"
  FOR EACH ROW EXECUTE FUNCTION planflow_deny_write();
