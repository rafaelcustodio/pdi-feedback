-- CreateEnum
CREATE TYPE "OnboardingType" AS ENUM ('manager_feedback', 'hr_conversation');

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "onboardingType" "OnboardingType";
