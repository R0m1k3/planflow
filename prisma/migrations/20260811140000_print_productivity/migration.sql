-- ---------------------------------------------------------------------------
-- Impression et productivité — PLAN.md §9, `/reglages/impression` et
-- `/reglages/productivite`.
--
-- `productivityTargetPerHour` est nullable et non « 0 par défaut » : zéro est un
-- objectif — inatteignable — alors que l'absence de valeur dit qu'aucun objectif
-- n'a été fixé. Un écran qui affiche « 0 €/h attendu » pousse à corriger un
-- réglage qui n'existe pas.
-- ---------------------------------------------------------------------------

ALTER TABLE "AccountPreferences" ADD COLUMN "printLandscape" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AccountPreferences" ADD COLUMN "printDensity" TEXT NOT NULL DEFAULT 'large';
ALTER TABLE "AccountPreferences" ADD COLUMN "printContractTotals" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AccountPreferences" ADD COLUMN "printOtherTeams" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AccountPreferences" ADD COLUMN "printSunday" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AccountPreferences" ADD COLUMN "printSignatureColumn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AccountPreferences" ADD COLUMN "productivityTargetPerHour" DECIMAL(10,2);
