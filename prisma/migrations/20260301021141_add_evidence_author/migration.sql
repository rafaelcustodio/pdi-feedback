-- AlterTable
ALTER TABLE "PDIEvidence" ADD COLUMN     "authorId" TEXT;

-- CreateIndex
CREATE INDEX "PDIEvidence_authorId_idx" ON "PDIEvidence"("authorId");

-- AddForeignKey
ALTER TABLE "PDIEvidence" ADD CONSTRAINT "PDIEvidence_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
