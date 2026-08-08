-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'VALIDATED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "RestType" AS ENUM ('WEEKLY_REST', 'COMPENSATORY_REST');

-- CreateTable
CREATE TABLE "WeeklySchedule" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "isoYear" INTEGER NOT NULL,
    "isoWeek" INTEGER NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WeeklySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "weeklyScheduleId" TEXT NOT NULL,
    "membershipId" TEXT,
    "localDate" DATE NOT NULL,
    "startAt" TIMESTAMPTZ NOT NULL,
    "endAt" TIMESTAMPTZ NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "actualStartAt" TIMESTAMPTZ,
    "actualEndAt" TIMESTAMPTZ,
    "actualBreakMinutes" INTEGER,
    "labelId" TEXT,
    "mealCount" INTEGER NOT NULL DEFAULT 0,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "weeklyScheduleId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "restType" "RestType" NOT NULL,
    "minutes" INTEGER,

    CONSTRAINT "Rest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyNote" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "weeklyScheduleId" TEXT NOT NULL,
    "localDate" DATE NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "DailyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklySchedule_accountId_idx" ON "WeeklySchedule"("accountId");

-- CreateIndex
CREATE INDEX "WeeklySchedule_locationId_isoYear_isoWeek_idx" ON "WeeklySchedule"("locationId", "isoYear", "isoWeek");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySchedule_teamId_isoYear_isoWeek_key" ON "WeeklySchedule"("teamId", "isoYear", "isoWeek");

-- CreateIndex
CREATE INDEX "Shift_accountId_idx" ON "Shift"("accountId");

-- CreateIndex
CREATE INDEX "Shift_weeklyScheduleId_localDate_idx" ON "Shift"("weeklyScheduleId", "localDate");

-- CreateIndex
CREATE INDEX "Shift_membershipId_localDate_idx" ON "Shift"("membershipId", "localDate");

-- CreateIndex
CREATE INDEX "Rest_accountId_idx" ON "Rest"("accountId");

-- CreateIndex
CREATE INDEX "DailyNote_accountId_idx" ON "DailyNote"("accountId");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_weeklyScheduleId_fkey" FOREIGN KEY ("weeklyScheduleId") REFERENCES "WeeklySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rest" ADD CONSTRAINT "Rest_weeklyScheduleId_fkey" FOREIGN KEY ("weeklyScheduleId") REFERENCES "WeeklySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyNote" ADD CONSTRAINT "DailyNote_weeklyScheduleId_fkey" FOREIGN KEY ("weeklyScheduleId") REFERENCES "WeeklySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
