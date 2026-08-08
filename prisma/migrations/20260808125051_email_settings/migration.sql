-- CreateEnum
CREATE TYPE "EmailKind" AS ENUM ('TEST', 'INVITATION', 'PASSWORD_RESET', 'PLANNING_PUBLISHED', 'TIMEOFF_DECISION', 'LEAVE_NOTICE');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "passwordEnc" BYTEA,
    "fromName" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "replyTo" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "kind" "EmailKind" NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "error" TEXT,
    "messageId" TEXT,
    "membershipId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSettings_accountId_key" ON "EmailSettings"("accountId");

-- CreateIndex
CREATE INDEX "EmailSettings_accountId_idx" ON "EmailSettings"("accountId");

-- CreateIndex
CREATE INDEX "EmailLog_accountId_sentAt_idx" ON "EmailLog"("accountId", "sentAt");

-- Isolation : toute table portant accountId doit porter sa politique.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['EmailSettings','EmailLog']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("accountId" = planflow_current_account())', t);
    EXECUTE format(
      'CREATE POLICY tenant_insert ON %I FOR INSERT WITH CHECK ("accountId" = planflow_current_account())', t);
  END LOOP;
END $$;

-- Le journal d'envoi atteste de ce qui a été transmis : il ne se réécrit pas.
CREATE TRIGGER email_log_append_only
  BEFORE UPDATE OR DELETE ON "EmailLog"
  FOR EACH ROW EXECUTE FUNCTION planflow_deny_write();
