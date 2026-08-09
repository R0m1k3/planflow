-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('IDENTITY', 'BANK', 'CONTRACT', 'AMENDMENT', 'SICK_NOTE', 'WORK_PERMIT', 'REGISTER', 'OTHER');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "membershipId" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "retentionUntil" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_fileKey_key" ON "Document"("fileKey");

-- CreateIndex
CREATE INDEX "Document_accountId_idx" ON "Document"("accountId");

-- CreateIndex
CREATE INDEX "Document_membershipId_idx" ON "Document"("membershipId");

-- CreateIndex
CREATE INDEX "Document_retentionUntil_idx" ON "Document"("retentionUntil");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
