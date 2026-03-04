-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('feedback', 'pdi_followup');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('required', 'optional');

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "roomEmail" TEXT,
    "roomDisplayName" TEXT,
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'scheduled',
    "outlookEventId" TEXT,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "feedbackId" TEXT,
    "pdiFollowUpId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEventParticipant" (
    "id" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "userId" TEXT,
    "externalEmail" TEXT,
    "role" "ParticipantRole" NOT NULL DEFAULT 'required',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEventParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_feedbackId_key" ON "CalendarEvent"("feedbackId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_pdiFollowUpId_key" ON "CalendarEvent"("pdiFollowUpId");

-- CreateIndex
CREATE INDEX "CalendarEvent_employeeId_idx" ON "CalendarEvent"("employeeId");

-- CreateIndex
CREATE INDEX "CalendarEvent_managerId_idx" ON "CalendarEvent"("managerId");

-- CreateIndex
CREATE INDEX "CalendarEvent_scheduledAt_idx" ON "CalendarEvent"("scheduledAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_status_idx" ON "CalendarEvent"("status");

-- CreateIndex
CREATE INDEX "CalendarEventParticipant_calendarEventId_idx" ON "CalendarEventParticipant"("calendarEventId");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_pdiFollowUpId_fkey" FOREIGN KEY ("pdiFollowUpId") REFERENCES "PDIFollowUp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventParticipant" ADD CONSTRAINT "CalendarEventParticipant_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEventParticipant" ADD CONSTRAINT "CalendarEventParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
