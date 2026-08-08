-- CreateEnum
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CounterType" AS ENUM ('PAID_LEAVE', 'RTT', 'COMPENSATORY_REST', 'MODULATION', 'OVERTIME');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('ACCRUAL', 'TAKEN', 'ADJUSTMENT', 'CARRY_OVER', 'EXPIRY', 'REGULARISATION');

-- CreateEnum
CREATE TYPE "LedgerUnit" AS ENUM ('DAY', 'HOUR');

-- CreateEnum
CREATE TYPE "LedgerSource" AS ENUM ('TIMEOFF', 'PAY_PERIOD', 'MANUAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "userContractId" TEXT,
    "absenceTypeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "startHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "endDate" DATE NOT NULL,
    "endHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "countedDays" DECIMAL(6,2),
    "status" "TimeOffStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionComment" TEXT,
    "justificationDocumentId" TEXT,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "counterType" "CounterType" NOT NULL,
    "acquisitionPeriodStart" DATE NOT NULL,
    "acquisitionPeriodEnd" DATE NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerOperation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "counterId" TEXT NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unit" "LedgerUnit" NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "sourceType" "LedgerSource" NOT NULL,
    "sourceId" TEXT,
    "reason" TEXT,
    "reversesId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RttPolicy" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysPerYear" DECIMAL(5,2) NOT NULL,
    "periodStart" TEXT NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "RttPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RttPolicyAssignment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "rttPolicyId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,

    CONSTRAINT "RttPolicyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveNotice" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "timeOffId" TEXT,
    "returnDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "deliveryProof" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeOff_accountId_idx" ON "TimeOff"("accountId");

-- CreateIndex
CREATE INDEX "TimeOff_membershipId_startDate_idx" ON "TimeOff"("membershipId", "startDate");

-- CreateIndex
CREATE INDEX "TimeOff_accountId_status_idx" ON "TimeOff"("accountId", "status");

-- CreateIndex
CREATE INDEX "Counter_accountId_idx" ON "Counter"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Counter_membershipId_counterType_acquisitionPeriodStart_key" ON "Counter"("membershipId", "counterType", "acquisitionPeriodStart");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerOperation_reversesId_key" ON "LedgerOperation"("reversesId");

-- CreateIndex
CREATE INDEX "LedgerOperation_accountId_idx" ON "LedgerOperation"("accountId");

-- CreateIndex
CREATE INDEX "LedgerOperation_counterId_effectiveDate_idx" ON "LedgerOperation"("counterId", "effectiveDate");

-- CreateIndex
CREATE INDEX "RttPolicy_accountId_idx" ON "RttPolicy"("accountId");

-- CreateIndex
CREATE INDEX "RttPolicyAssignment_accountId_idx" ON "RttPolicyAssignment"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "RttPolicyAssignment_rttPolicyId_membershipId_key" ON "RttPolicyAssignment"("rttPolicyId", "membershipId");

-- CreateIndex
CREATE INDEX "LeaveNotice_accountId_idx" ON "LeaveNotice"("accountId");

-- CreateIndex
CREATE INDEX "LeaveNotice_membershipId_idx" ON "LeaveNotice"("membershipId");

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_absenceTypeId_fkey" FOREIGN KEY ("absenceTypeId") REFERENCES "AbsenceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerOperation" ADD CONSTRAINT "LedgerOperation_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "Counter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RttPolicyAssignment" ADD CONSTRAINT "RttPolicyAssignment_rttPolicyId_fkey" FOREIGN KEY ("rttPolicyId") REFERENCES "RttPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Isolation : toute table portant accountId doit porter sa politique.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['TimeOff','Counter','LedgerOperation','RttPolicy','RttPolicyAssignment','LeaveNotice']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("accountId" = planflow_current_account())', t);
    EXECUTE format(
      'CREATE POLICY tenant_insert ON %I FOR INSERT WITH CHECK ("accountId" = planflow_current_account())', t);
  END LOOP;
END $$;

-- Le registre est append-only : une correction s'écrit — contre-passation puis
-- nouvelle écriture — elle ne se réécrit pas. La règle est en base et non
-- seulement dans l'application, parce qu'une règle applicative finit par être
-- contournée par un script de reprise.
CREATE TRIGGER ledger_operation_append_only
  BEFORE UPDATE OR DELETE ON "LedgerOperation"
  FOR EACH ROW EXECUTE FUNCTION planflow_deny_write();
