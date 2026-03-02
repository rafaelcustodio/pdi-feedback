-- Migration: Consolidate PDIFollowUp from duplicate PDIs and add unique partial index
-- Complements migration 20260302160000 which consolidated goals and comments
-- but did not handle PDIFollowUp (created later) or add the unique constraint.
-- This migration is idempotent.

-- Step 1: Reparent PDIFollowUp from non-keeper active PDIs to keeper PDIs
-- (In case new duplicates were created after the first consolidation)
UPDATE "PDIFollowUp" AS f
SET "pdiId" = keeper."id"
FROM "PDI" AS src,
  (
    SELECT DISTINCT ON ("employeeId") "id", "employeeId"
    FROM "PDI"
    WHERE "status" = 'active'
    ORDER BY "employeeId", "updatedAt" DESC
  ) AS keeper
WHERE f."pdiId" = src."id"
  AND src."status" = 'active'
  AND src."employeeId" = keeper."employeeId"
  AND src."id" != keeper."id";

-- Step 2: Reparent goals from non-keeper active PDIs to keeper PDIs (idempotent re-run)
UPDATE "PDIGoal" AS g
SET "pdiId" = keeper."id"
FROM "PDI" AS src,
  (
    SELECT DISTINCT ON ("employeeId") "id", "employeeId"
    FROM "PDI"
    WHERE "status" = 'active'
    ORDER BY "employeeId", "updatedAt" DESC
  ) AS keeper
WHERE g."pdiId" = src."id"
  AND src."status" = 'active'
  AND src."employeeId" = keeper."employeeId"
  AND src."id" != keeper."id";

-- Step 3: Reparent comments from non-keeper active PDIs to keeper PDIs (idempotent re-run)
UPDATE "PDIComment" AS c
SET "pdiId" = keeper."id"
FROM "PDI" AS src,
  (
    SELECT DISTINCT ON ("employeeId") "id", "employeeId"
    FROM "PDI"
    WHERE "status" = 'active'
    ORDER BY "employeeId", "updatedAt" DESC
  ) AS keeper
WHERE c."pdiId" = src."id"
  AND src."status" = 'active'
  AND src."employeeId" = keeper."employeeId"
  AND src."id" != keeper."id";

-- Step 4: Mark non-keeper active PDIs as cancelled (idempotent re-run)
UPDATE "PDI" AS p
SET "status" = 'cancelled'
FROM (
    SELECT DISTINCT ON ("employeeId") "id", "employeeId"
    FROM "PDI"
    WHERE "status" = 'active'
    ORDER BY "employeeId", "updatedAt" DESC
  ) AS keeper
WHERE p."status" = 'active'
  AND p."employeeId" = keeper."employeeId"
  AND p."id" != keeper."id";

-- Step 5: Add unique partial index to prevent future duplicates
-- Only one active PDI per employee
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pdi_one_active_per_employee"
  ON "PDI"("employeeId")
  WHERE "status" = 'active';
