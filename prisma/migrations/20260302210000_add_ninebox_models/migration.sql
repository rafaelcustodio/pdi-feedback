-- CreateEnum
CREATE TYPE "NineBoxStatus" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "NineBoxEvaluatorStatus" AS ENUM ('pending', 'completed');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ninebox_invite';

-- CreateTable
CREATE TABLE "NineBoxEvaluation" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "evaluateeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "NineBoxStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NineBoxEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NineBoxEvaluator" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "status" "NineBoxEvaluatorStatus" NOT NULL DEFAULT 'pending',
    "q1" INTEGER,
    "q2" INTEGER,
    "q3" INTEGER,
    "q4" INTEGER,
    "q5" INTEGER,
    "q6" INTEGER,
    "q7" INTEGER,
    "q8" INTEGER,
    "q9" INTEGER,
    "q10" INTEGER,
    "q11" INTEGER,
    "q12" INTEGER,
    "q13PontosFortes" TEXT,
    "q14Oportunidade" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NineBoxEvaluator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NineBoxEvaluation_feedbackId_key" ON "NineBoxEvaluation"("feedbackId");

-- CreateIndex
CREATE INDEX "NineBoxEvaluation_feedbackId_idx" ON "NineBoxEvaluation"("feedbackId");

-- CreateIndex
CREATE INDEX "NineBoxEvaluation_evaluateeId_idx" ON "NineBoxEvaluation"("evaluateeId");

-- CreateIndex
CREATE INDEX "NineBoxEvaluation_createdById_idx" ON "NineBoxEvaluation"("createdById");

-- CreateIndex
CREATE INDEX "NineBoxEvaluation_status_idx" ON "NineBoxEvaluation"("status");

-- CreateIndex
CREATE INDEX "NineBoxEvaluator_evaluationId_idx" ON "NineBoxEvaluator"("evaluationId");

-- CreateIndex
CREATE INDEX "NineBoxEvaluator_evaluatorId_idx" ON "NineBoxEvaluator"("evaluatorId");

-- CreateIndex
CREATE UNIQUE INDEX "NineBoxEvaluator_evaluationId_evaluatorId_key" ON "NineBoxEvaluator"("evaluationId", "evaluatorId");

-- AddForeignKey
ALTER TABLE "NineBoxEvaluation" ADD CONSTRAINT "NineBoxEvaluation_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NineBoxEvaluation" ADD CONSTRAINT "NineBoxEvaluation_evaluateeId_fkey" FOREIGN KEY ("evaluateeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NineBoxEvaluation" ADD CONSTRAINT "NineBoxEvaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NineBoxEvaluator" ADD CONSTRAINT "NineBoxEvaluator_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "NineBoxEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NineBoxEvaluator" ADD CONSTRAINT "NineBoxEvaluator_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
