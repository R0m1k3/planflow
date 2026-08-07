-- CreateTable
CREATE TABLE "JobTitle" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "JobTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paletteKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceType" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorKey" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "countsAsWorkTime" BOOLEAN NOT NULL DEFAULT false,
    "affectsPaidLeaveAccrual" BOOLEAN NOT NULL DEFAULT true,
    "isSocialSecurity" BOOLEAN NOT NULL DEFAULT false,
    "requiresJustification" BOOLEAN NOT NULL DEFAULT false,
    "minNoticeDays" INTEGER,
    "silaeCode" TEXT,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "AbsenceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalConfigEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "population" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "attachmentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalConfigEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobTitle_accountId_idx" ON "JobTitle"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "JobTitle_accountId_name_key" ON "JobTitle"("accountId", "name");

-- CreateIndex
CREATE INDEX "Label_accountId_idx" ON "Label"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Label_accountId_code_key" ON "Label"("accountId", "code");

-- CreateIndex
CREATE INDEX "AbsenceType_accountId_idx" ON "AbsenceType"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceType_accountId_code_key" ON "AbsenceType"("accountId", "code");

-- CreateIndex
CREATE INDEX "LegalConfigEntry_accountId_idx" ON "LegalConfigEntry"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalConfigEntry_accountId_domain_key_effectiveFrom_key" ON "LegalConfigEntry"("accountId", "domain", "key", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "JobTitle" ADD CONSTRAINT "JobTitle_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceType" ADD CONSTRAINT "AbsenceType_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalConfigEntry" ADD CONSTRAINT "LegalConfigEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
