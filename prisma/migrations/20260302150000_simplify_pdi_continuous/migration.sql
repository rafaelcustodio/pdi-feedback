-- US-009: Simplify PDI for continuous model

-- 1) Drop PDISchedule table and its indexes
DROP TABLE IF EXISTS "PDISchedule";

-- 2) Update existing PDIs: convert draft/scheduled/completed to active
UPDATE "PDI" SET "status" = 'active' WHERE "status" IN ('draft', 'scheduled', 'completed');

-- 3) Remove old enum values from PDIStatus
-- PostgreSQL requires creating a new enum and migrating
CREATE TYPE "PDIStatus_new" AS ENUM ('active', 'cancelled');
ALTER TABLE "PDI" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PDI" ALTER COLUMN "status" TYPE "PDIStatus_new" USING ("status"::text::"PDIStatus_new");
ALTER TABLE "PDI" ALTER COLUMN "status" SET DEFAULT 'active';
DROP TYPE "PDIStatus";
ALTER TYPE "PDIStatus_new" RENAME TO "PDIStatus";

-- 4) Drop removed columns from PDI
ALTER TABLE "PDI" DROP COLUMN IF EXISTS "period";
ALTER TABLE "PDI" DROP COLUMN IF EXISTS "frequencyMonths";
ALTER TABLE "PDI" DROP COLUMN IF EXISTS "scheduledAt";

-- 5) Drop the scheduledAt index (if it exists)
DROP INDEX IF EXISTS "PDI_scheduledAt_idx";
