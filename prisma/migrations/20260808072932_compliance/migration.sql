-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'BLOCKING');

-- CreateTable
CREATE TABLE "CollectiveAgreement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "idcc" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "source" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectiveAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceViolation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "weeklyScheduleId" TEXT NOT NULL,
    "membershipId" TEXT,
    "ruleCode" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "localDate" DATE,
    "message" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "shiftIds" TEXT[],
    "agreementId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgementReason" TEXT,

    CONSTRAINT "ComplianceViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "isPaidOff" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorisedSunday" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "reference" TEXT,

    CONSTRAINT "AuthorisedSunday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectiveAgreement_accountId_idcc_effectiveFrom_idx" ON "CollectiveAgreement"("accountId", "idcc", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CollectiveAgreement_accountId_idx" ON "CollectiveAgreement"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectiveAgreement_accountId_idcc_version_key" ON "CollectiveAgreement"("accountId", "idcc", "version");

-- CreateIndex
CREATE INDEX "ComplianceViolation_accountId_idx" ON "ComplianceViolation"("accountId");

-- CreateIndex
CREATE INDEX "ComplianceViolation_weeklyScheduleId_idx" ON "ComplianceViolation"("weeklyScheduleId");

-- CreateIndex
CREATE INDEX "ComplianceViolation_membershipId_localDate_idx" ON "ComplianceViolation"("membershipId", "localDate");

-- CreateIndex
CREATE INDEX "Holiday_accountId_idx" ON "Holiday"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_locationId_localDate_key" ON "Holiday"("locationId", "localDate");

-- CreateIndex
CREATE INDEX "AuthorisedSunday_accountId_idx" ON "AuthorisedSunday"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorisedSunday_locationId_localDate_key" ON "AuthorisedSunday"("locationId", "localDate");

-- AddForeignKey
ALTER TABLE "ComplianceViolation" ADD CONSTRAINT "ComplianceViolation_weeklyScheduleId_fkey" FOREIGN KEY ("weeklyScheduleId") REFERENCES "WeeklySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Isolation : toute table portant accountId doit porter sa politique.
ALTER TABLE "CollectiveAgreement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CollectiveAgreement" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CollectiveAgreement"
  USING ("accountId" = planflow_current_account());
CREATE POLICY tenant_insert ON "CollectiveAgreement"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());

ALTER TABLE "ComplianceViolation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceViolation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ComplianceViolation"
  USING ("accountId" = planflow_current_account());
CREATE POLICY tenant_insert ON "ComplianceViolation"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());

ALTER TABLE "Holiday" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Holiday" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Holiday"
  USING ("accountId" = planflow_current_account());
CREATE POLICY tenant_insert ON "Holiday"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());

ALTER TABLE "AuthorisedSunday" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthorisedSunday" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuthorisedSunday"
  USING ("accountId" = planflow_current_account());
CREATE POLICY tenant_insert ON "AuthorisedSunday"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());

-- Une version de convention ne se modifie pas : elle se remplace par une
-- nouvelle version datée. Sans cela, une paie antérieure cesse d'être
-- reproductible, ce qui est précisément l'exigence n° 1 de la matrice.
CREATE TRIGGER collective_agreement_append_only
  BEFORE UPDATE OR DELETE ON "CollectiveAgreement"
  FOR EACH ROW EXECUTE FUNCTION planflow_deny_write();
