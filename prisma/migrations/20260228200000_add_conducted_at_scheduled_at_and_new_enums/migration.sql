-- AlterEnum
ALTER TYPE "FeedbackStatus" ADD VALUE 'scheduled';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'feedback_scheduled';
ALTER TYPE "NotificationType" ADD VALUE 'feedback_submitted_auto';

-- AlterTable
ALTER TABLE "PDI" ADD COLUMN "conductedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "conductedAt" TIMESTAMP(3),
ADD COLUMN "scheduledAt" TIMESTAMP(3);
