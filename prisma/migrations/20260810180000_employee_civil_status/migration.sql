-- État civil complet du dossier salarié.
--
-- Ces mentions manquaient au schéma alors que la loi les réclame ou que la
-- paie s'appuie dessus :
--
-- - le **sexe** est exigé au registre unique du personnel (art. D1221-23) ;
--   sans lui, tout dossier y sort incomplet ;
-- - le **nom de naissance** ne se déduit pas du nom d'usage, et c'est lui que
--   portent la déclaration sociale et le registre ;
-- - le **pays** et le **département** de naissance sont demandés séparément
--   par la déclaration : les extraire d'une commune saisie librement échouerait
--   au premier « Bar-le-Duc (Meuse) » ;
-- - la **situation de famille** et les **personnes à charge** commandent des
--   droits que le salarié seul peut déclarer ;
-- - l'**heure d'embauche** est demandée par la DPAE, que la date seule ne
--   suffit pas à remplir.
--
-- Toutes les colonnes sont facultatives : un dossier incomplet doit pouvoir
-- exister — c'est au registre de signaler ce qui lui manque, pas à la base de
-- refuser l'embauche. Seule exception, l'envoi des plannings par SMS, qui est
-- un consentement : explicitement faux par défaut, la charge de la preuve
-- pesant sur l'employeur.

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'UNSPECIFIED');

-- Le PACS est distinct du concubinage et du mariage : les trois n'ouvrent pas
-- les mêmes droits, et les confondre fausserait la paie.
-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'PACS', 'COHABITING', 'DIVORCED', 'WIDOWED');

-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "birthCountry" TEXT,
ADD COLUMN     "birthDepartment" TEXT,
ADD COLUMN     "birthName" TEXT,
ADD COLUMN     "dependents" INTEGER,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "landline" TEXT,
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "smsSchedules" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserContract" ADD COLUMN     "startTime" TEXT;
