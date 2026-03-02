-- CreateEnum
CREATE TYPE "EvaluationMode" AS ENUM ('pdi', 'feedback');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "evaluationMode" "EvaluationMode" NOT NULL DEFAULT 'feedback';

-- CreateIndex
CREATE INDEX "User_evaluationMode_idx" ON "User"("evaluationMode");
