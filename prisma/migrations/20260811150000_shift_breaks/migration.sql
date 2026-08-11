-- ---------------------------------------------------------------------------
-- Pauses détaillées d'un créneau — PLAN.md §4.4.
--
-- `Shift.breakMinutes` garde son sens : la somme des pauses **non rémunérées**,
-- déduite du temps de travail. Tous les calculs de paie et de compteurs
-- continuent de la lire sans changer d'un caractère.
--
-- `paidBreakMinutes` s'ajoute à côté. Une pause payée n'est pas déduite du
-- temps travaillé mais reste une pause : sans cette colonne, la règle de pause
-- minimale au-delà de six heures verrait zéro et alerterait à tort sur un
-- créneau qui respecte la convention.
-- ---------------------------------------------------------------------------

ALTER TABLE "Shift" ADD COLUMN "paidBreakMinutes" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ShiftBreak" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "startMinutes" INTEGER,
    "durationMinutes" INTEGER NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShiftBreak_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShiftBreak_accountId_idx" ON "ShiftBreak"("accountId");
CREATE INDEX "ShiftBreak_shiftId_idx" ON "ShiftBreak"("shiftId");

ALTER TABLE "ShiftBreak" ADD CONSTRAINT "ShiftBreak_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise des créneaux existants : leur total devient une pause unique, non
-- rémunérée et non située. Laisser la table vide ferait disparaître de l'écran
-- des pauses qui comptent pourtant toujours dans les heures payées.
INSERT INTO "ShiftBreak" ("id", "accountId", "shiftId", "durationMinutes", "isPaid", "position")
SELECT
  gen_random_uuid()::text,
  "accountId",
  "id",
  "breakMinutes",
  false,
  0
FROM "Shift"
WHERE "breakMinutes" > 0;

-- ---------------------------------------------------------------------------
-- Isolation par compte — une pause dit à quelle heure quelqu'un s'absente de
-- son poste. Même défense en profondeur que le créneau qui la porte.
-- ---------------------------------------------------------------------------

ALTER TABLE "ShiftBreak" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShiftBreak" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "ShiftBreak"
  USING ("accountId" = planflow_current_account());

CREATE POLICY tenant_insert ON "ShiftBreak"
  FOR INSERT WITH CHECK ("accountId" = planflow_current_account());
