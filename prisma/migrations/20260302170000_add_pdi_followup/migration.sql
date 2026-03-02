-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "PDIFollowUp" (
    "id" TEXT NOT NULL,
    "pdiId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "conductedAt" TIMESTAMP(3),
    "notes" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PDIFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PDIFollowUp_pdiId_idx" ON "PDIFollowUp"("pdiId");

-- AddForeignKey
ALTER TABLE "PDIFollowUp" ADD CONSTRAINT "PDIFollowUp_pdiId_fkey" FOREIGN KEY ("pdiId") REFERENCES "PDI"("id") ON DELETE CASCADE ON UPDATE CASCADE;
