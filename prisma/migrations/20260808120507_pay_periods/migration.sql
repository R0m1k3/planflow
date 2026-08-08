-- CreateEnum
CREATE TYPE "PayPeriodKind" AS ENUM ('MAIN', 'ALTERNATIVE');

-- CreateEnum
CREATE TYPE "PayPeriodStatus" AS ENUM ('OPEN', 'LOCKED');

-- AlterTable
ALTER TABLE "PayrollExport" ADD COLUMN     "payPeriodId" TEXT;

-- CreateTable
CREATE TABLE "PayPeriod" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "kind" "PayPeriodKind" NOT NULL DEFAULT 'MAIN',
    "populations" "ContractType"[],
    "status" "PayPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "unlockedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayPeriodSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "payPeriodId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "plannedMinutes" INTEGER NOT NULL,
    "actualMinutes" INTEGER NOT NULL,
    "absenceMinutes" INTEGER NOT NULL,
    "workedDays" INTEGER NOT NULL,
    "overtimeByBracket" JSONB NOT NULL,
    "absenceBreakdown" JSONB NOT NULL,
    "variables" JSONB NOT NULL,
    "agreementId" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayPeriodSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayPeriod_accountId_idx" ON "PayPeriod"("accountId");

-- CreateIndex
CREATE INDEX "PayPeriod_accountId_startDate_idx" ON "PayPeriod"("accountId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "PayPeriod_locationId_startDate_endDate_kind_key" ON "PayPeriod"("locationId", "startDate", "endDate", "kind");

-- CreateIndex
CREATE INDEX "PayPeriodSnapshot_accountId_idx" ON "PayPeriodSnapshot"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "PayPeriodSnapshot_payPeriodId_membershipId_key" ON "PayPeriodSnapshot"("payPeriodId", "membershipId");

-- AddForeignKey
ALTER TABLE "PayPeriodSnapshot" ADD CONSTRAINT "PayPeriodSnapshot_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "PayPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Isolation : toute table portant accountId doit porter sa politique.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['PayPeriod','PayPeriodSnapshot']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("accountId" = planflow_current_account())', t);
    EXECUTE format(
      'CREATE POLICY tenant_insert ON %I FOR INSERT WITH CHECK ("accountId" = planflow_current_account())', t);
  END LOOP;
END $$;
