-- ---------------------------------------------------------------------------
-- Siège social et préférences du compte — PLAN.md §9.
--
-- Les colonnes d'adresse vont sur Account et non sur Location : le siège figure
-- sur les documents édités et au registre du personnel, et il n'est pas
-- nécessairement celui d'un magasin.
--
-- Les préférences sont une table à part plutôt que dix colonnes de plus sur
-- Account : elles changent des calculs, se relisent ensemble, et la séparation
-- garde lisible ce qui identifie l'entreprise et ce qui paramètre l'outil.
-- ---------------------------------------------------------------------------

ALTER TABLE "Account" ADD COLUMN "addressLine" TEXT;
ALTER TABLE "Account" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Account" ADD COLUMN "city" TEXT;
ALTER TABLE "Account" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'FR';
ALTER TABLE "Account" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris';

CREATE TABLE "AccountPreferences" (
    "accountId" TEXT NOT NULL,

    "defaultMealPerShift" BOOLEAN NOT NULL DEFAULT false,
    "paidBreaks" BOOLEAN NOT NULL DEFAULT false,
    "lockEmployeeMeals" BOOLEAN NOT NULL DEFAULT false,
    "employeesSeeOwnTotals" BOOLEAN NOT NULL DEFAULT true,
    "employeesSeeTeamPlanning" BOOLEAN NOT NULL DEFAULT false,
    "hideForfaitCounters" BOOLEAN NOT NULL DEFAULT true,
    "eveningShiftStartMinutes" INTEGER NOT NULL DEFAULT 1200,

    "employeesEditOwnProfile" BOOLEAN NOT NULL DEFAULT true,
    "employeesSeeOwnTimesheets" BOOLEAN NOT NULL DEFAULT true,
    "employeesSeeTeamContacts" BOOLEAN NOT NULL DEFAULT false,
    "managerCreatedArePlannable" BOOLEAN NOT NULL DEFAULT false,
    "directorsSharePeople" BOOLEAN NOT NULL DEFAULT false,
    "directorsAccessHrDashboard" BOOLEAN NOT NULL DEFAULT true,
    "directorsSeePaidLeave" BOOLEAN NOT NULL DEFAULT true,
    "managersSeePaidLeave" BOOLEAN NOT NULL DEFAULT false,

    "smoothOvertimeMonthly" BOOLEAN NOT NULL DEFAULT false,
    "includeRestInNormalHours" BOOLEAN NOT NULL DEFAULT false,
    "autoEmployeeNumber" BOOLEAN NOT NULL DEFAULT false,

    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountPreferences_pkey" PRIMARY KEY ("accountId")
);

ALTER TABLE "AccountPreferences" ADD CONSTRAINT "AccountPreferences_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Isolation par compte.
--
-- La clé primaire *est* l'identifiant de compte, si bien qu'une fuite
-- supposerait déjà de connaître l'identifiant visé. La politique reste posée :
-- la défense en profondeur ne se dispense pas au motif que l'attaque serait
-- malcommode.
-- ---------------------------------------------------------------------------

ALTER TABLE "AccountPreferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountPreferences" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "AccountPreferences"
  USING ("accountId" = planflow_current_account());

CREATE POLICY tenant_insert ON "AccountPreferences"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());
