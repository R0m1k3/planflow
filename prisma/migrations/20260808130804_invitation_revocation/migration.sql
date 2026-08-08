-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedBy" TEXT;

-- CreateIndex
CREATE INDEX "Invitation_membershipId_idx" ON "Invitation"("membershipId");
