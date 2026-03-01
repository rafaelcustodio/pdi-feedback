-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('pdi', 'feedback');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "admissionDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "isOnboarding" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SectorSchedule" (
    "id" TEXT NOT NULL,
    "organizationalUnitId" TEXT NOT NULL,
    "type" "ScheduleType" NOT NULL,
    "frequencyMonths" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectorSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectorSchedule_organizationalUnitId_idx" ON "SectorSchedule"("organizationalUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "SectorSchedule_organizationalUnitId_type_key" ON "SectorSchedule"("organizationalUnitId", "type");

-- AddForeignKey
ALTER TABLE "SectorSchedule" ADD CONSTRAINT "SectorSchedule_organizationalUnitId_fkey" FOREIGN KEY ("organizationalUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
