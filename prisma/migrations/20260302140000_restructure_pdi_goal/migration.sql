-- US-006: Restructure PDIGoal with new fields

-- Rename existing columns (preserves data)
ALTER TABLE "PDIGoal" RENAME COLUMN "title" TO "developmentObjective";
ALTER TABLE "PDIGoal" RENAME COLUMN "description" TO "actions";

-- Remove competency column
ALTER TABLE "PDIGoal" DROP COLUMN "competency";

-- Add new columns
ALTER TABLE "PDIGoal" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "PDIGoal" ADD COLUMN "expectedResults" TEXT;
ALTER TABLE "PDIGoal" ADD COLUMN "responsibleId" TEXT;
ALTER TABLE "PDIGoal" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "PDIGoal" ADD COLUMN "successMetrics" TEXT;
ALTER TABLE "PDIGoal" ADD COLUMN "achievedResults" TEXT;

-- Add foreign key for responsibleId
ALTER TABLE "PDIGoal" ADD CONSTRAINT "PDIGoal_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on responsibleId
CREATE INDEX "PDIGoal_responsibleId_idx" ON "PDIGoal"("responsibleId");
