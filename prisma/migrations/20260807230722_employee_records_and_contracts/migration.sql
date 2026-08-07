-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('APPRENTISSAGE', 'CDD', 'CDI', 'DIRIGEANT_ASSIMILE_SALARIE', 'DIRIGEANT_NON_SALARIE', 'EXTRA', 'INTERIM', 'STAGIAIRE', 'SAISONNIER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "WorkTimeArrangement" AS ENUM ('HOURLY', 'FORFAIT_JOURS');

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "membershipId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "birthDate" DATE,
    "birthPlace" TEXT,
    "nationality" TEXT,
    "addressLine1" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "personalEmail" TEXT,
    "socialSecurityNumberEnc" BYTEA,
    "ibanEnc" BYTEA,
    "bicEnc" BYTEA,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("membershipId")
);

-- CreateTable
CREATE TABLE "WorkPermit" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "permitType" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "issuedAt" DATE,
    "expiresAt" DATE NOT NULL,

    CONSTRAINT "WorkPermit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContract" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "trialEndDate" DATE,
    "workTimeArrangement" "WorkTimeArrangement" NOT NULL DEFAULT 'HOURLY',
    "weeklyHours" DECIMAL(5,2) NOT NULL DEFAULT 35,
    "forfaitDaysPerYear" DECIMAL(5,1),
    "forfaitAgreementRef" TEXT,
    "forfaitAgreedAt" TIMESTAMP(3),
    "isModulated" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DECIMAL(10,4),
    "monthlySalary" DECIMAL(10,2),
    "jobTitleId" TEXT,
    "classification" TEXT,
    "coefficient" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "endReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amendment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userContractId" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "changes" JSONB NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Amendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForfaitDayEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userContractId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "quantity" DECIMAL(2,1) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForfaitDayEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkloadReview" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userContractId" TEXT NOT NULL,
    "heldAt" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "actions" TEXT,

    CONSTRAINT "WorkloadReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeProfile_accountId_idx" ON "EmployeeProfile"("accountId");

-- CreateIndex
CREATE INDEX "WorkPermit_accountId_idx" ON "WorkPermit"("accountId");

-- CreateIndex
CREATE INDEX "WorkPermit_membershipId_idx" ON "WorkPermit"("membershipId");

-- CreateIndex
CREATE INDEX "UserContract_accountId_idx" ON "UserContract"("accountId");

-- CreateIndex
CREATE INDEX "UserContract_membershipId_idx" ON "UserContract"("membershipId");

-- CreateIndex
CREATE INDEX "Amendment_accountId_idx" ON "Amendment"("accountId");

-- CreateIndex
CREATE INDEX "Amendment_userContractId_idx" ON "Amendment"("userContractId");

-- CreateIndex
CREATE INDEX "ForfaitDayEntry_accountId_idx" ON "ForfaitDayEntry"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "ForfaitDayEntry_userContractId_localDate_key" ON "ForfaitDayEntry"("userContractId", "localDate");

-- CreateIndex
CREATE INDEX "WorkloadReview_accountId_idx" ON "WorkloadReview"("accountId");

-- CreateIndex
CREATE INDEX "WorkloadReview_userContractId_idx" ON "WorkloadReview"("userContractId");

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPermit" ADD CONSTRAINT "WorkPermit_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContract" ADD CONSTRAINT "UserContract_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_userContractId_fkey" FOREIGN KEY ("userContractId") REFERENCES "UserContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
