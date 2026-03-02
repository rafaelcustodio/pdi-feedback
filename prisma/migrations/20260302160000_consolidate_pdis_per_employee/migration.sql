-- Migration: Consolidate multiple PDIs per employee into a single active PDI
-- For each employee with multiple active PDIs, the most recently updated one is kept.
-- Goals and comments from other PDIs are reparented to the keeper.
-- Non-keeper PDIs are marked as cancelled.
-- This migration is idempotent: running it multiple times produces the same result.

-- Step 1: Identify the "keeper" PDI per employee (most recent updatedAt among active PDIs)
-- Step 2: Reparent goals from non-keeper active PDIs to the keeper
-- Step 3: Reparent comments from non-keeper active PDIs to the keeper
-- Step 4: Mark non-keeper active PDIs as cancelled

-- Use a CTE to identify keepers: for each employee, the active PDI with the latest updatedAt
-- Then update goals, comments, and status for non-keeper PDIs.

-- Step 2: Reparent goals from non-keeper PDIs to keeper PDIs
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

-- Step 3: Reparent comments from non-keeper PDIs to keeper PDIs
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

-- Step 4: Mark non-keeper active PDIs as cancelled
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
