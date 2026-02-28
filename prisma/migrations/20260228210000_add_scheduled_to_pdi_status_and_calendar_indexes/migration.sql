-- AlterEnum
ALTER TYPE "PDIStatus" ADD VALUE 'scheduled';

-- AlterTable
ALTER TABLE "PDI" ADD COLUMN "scheduledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PDI_scheduledAt_idx" ON "PDI"("scheduledAt");

-- CreateIndex
CREATE INDEX "Feedback_scheduledAt_idx" ON "Feedback"("scheduledAt");
