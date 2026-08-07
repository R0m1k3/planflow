/*
  Warnings:

  - Added the required column `firstName` to the `EmployeeProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `EmployeeProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- Reprise : le nom existait sur le compte utilisateur, il descend au dossier.
UPDATE "EmployeeProfile" p
SET "firstName" = COALESCE(u."firstName", 'Prénom'),
    "lastName"  = COALESCE(u."lastName", 'À compléter')
FROM "Membership" m
LEFT JOIN "User" u ON u.id = m."userId"
WHERE m.id = p."membershipId";

UPDATE "EmployeeProfile" SET "firstName" = 'Prénom' WHERE "firstName" IS NULL;
UPDATE "EmployeeProfile" SET "lastName" = 'À compléter' WHERE "lastName" IS NULL;

ALTER TABLE "EmployeeProfile" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "EmployeeProfile" ALTER COLUMN "lastName" SET NOT NULL;
