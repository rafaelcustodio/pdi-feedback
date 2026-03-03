-- AlterTable
ALTER TABLE "User" ADD COLUMN "msAccessToken" TEXT,
ADD COLUMN "msRefreshToken" TEXT,
ADD COLUMN "msTokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PDIFollowUp" ADD COLUMN "outlookEventId" TEXT;

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "outlookEventId" TEXT;
