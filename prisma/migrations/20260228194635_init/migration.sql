-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'employee');

-- CreateEnum
CREATE TYPE "PDIStatus" AS ENUM ('draft', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('draft', 'submitted');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('pdi_reminder', 'feedback_reminder', 'general');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'employee',
    "avatarUrl" TEXT,
    "ssoProvider" TEXT,
    "ssoId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationalUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeHierarchy" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "organizationalUnitId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "EmployeeHierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDI" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "status" "PDIStatus" NOT NULL DEFAULT 'draft',
    "period" TEXT NOT NULL,
    "frequencyMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PDI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDIGoal" (
    "id" TEXT NOT NULL,
    "pdiId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "competency" TEXT NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'pending',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PDIGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDIEvidence" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PDIEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDIComment" (
    "id" TEXT NOT NULL,
    "pdiId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PDIComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "content" TEXT,
    "strengths" TEXT,
    "improvements" TEXT,
    "rating" INTEGER,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'draft',
    "frequencyMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackSchedule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "frequencyMonths" INTEGER NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FeedbackSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDISchedule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "frequencyMonths" INTEGER NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PDISchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "OrganizationalUnit_parentId_idx" ON "OrganizationalUnit"("parentId");

-- CreateIndex
CREATE INDEX "EmployeeHierarchy_employeeId_idx" ON "EmployeeHierarchy"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeHierarchy_managerId_idx" ON "EmployeeHierarchy"("managerId");

-- CreateIndex
CREATE INDEX "EmployeeHierarchy_organizationalUnitId_idx" ON "EmployeeHierarchy"("organizationalUnitId");

-- CreateIndex
CREATE INDEX "PDI_employeeId_idx" ON "PDI"("employeeId");

-- CreateIndex
CREATE INDEX "PDI_managerId_idx" ON "PDI"("managerId");

-- CreateIndex
CREATE INDEX "PDI_status_idx" ON "PDI"("status");

-- CreateIndex
CREATE INDEX "PDIGoal_pdiId_idx" ON "PDIGoal"("pdiId");

-- CreateIndex
CREATE INDEX "PDIGoal_status_idx" ON "PDIGoal"("status");

-- CreateIndex
CREATE INDEX "PDIEvidence_goalId_idx" ON "PDIEvidence"("goalId");

-- CreateIndex
CREATE INDEX "PDIComment_pdiId_idx" ON "PDIComment"("pdiId");

-- CreateIndex
CREATE INDEX "PDIComment_authorId_idx" ON "PDIComment"("authorId");

-- CreateIndex
CREATE INDEX "Feedback_employeeId_idx" ON "Feedback"("employeeId");

-- CreateIndex
CREATE INDEX "Feedback_managerId_idx" ON "Feedback"("managerId");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "FeedbackSchedule_employeeId_idx" ON "FeedbackSchedule"("employeeId");

-- CreateIndex
CREATE INDEX "FeedbackSchedule_managerId_idx" ON "FeedbackSchedule"("managerId");

-- CreateIndex
CREATE INDEX "FeedbackSchedule_nextDueDate_idx" ON "FeedbackSchedule"("nextDueDate");

-- CreateIndex
CREATE INDEX "PDISchedule_employeeId_idx" ON "PDISchedule"("employeeId");

-- CreateIndex
CREATE INDEX "PDISchedule_managerId_idx" ON "PDISchedule"("managerId");

-- CreateIndex
CREATE INDEX "PDISchedule_nextDueDate_idx" ON "PDISchedule"("nextDueDate");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- AddForeignKey
ALTER TABLE "OrganizationalUnit" ADD CONSTRAINT "OrganizationalUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrganizationalUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHierarchy" ADD CONSTRAINT "EmployeeHierarchy_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHierarchy" ADD CONSTRAINT "EmployeeHierarchy_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeHierarchy" ADD CONSTRAINT "EmployeeHierarchy_organizationalUnitId_fkey" FOREIGN KEY ("organizationalUnitId") REFERENCES "OrganizationalUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDI" ADD CONSTRAINT "PDI_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDI" ADD CONSTRAINT "PDI_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDIGoal" ADD CONSTRAINT "PDIGoal_pdiId_fkey" FOREIGN KEY ("pdiId") REFERENCES "PDI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDIEvidence" ADD CONSTRAINT "PDIEvidence_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PDIGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDIComment" ADD CONSTRAINT "PDIComment_pdiId_fkey" FOREIGN KEY ("pdiId") REFERENCES "PDI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDIComment" ADD CONSTRAINT "PDIComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackSchedule" ADD CONSTRAINT "FeedbackSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackSchedule" ADD CONSTRAINT "FeedbackSchedule_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDISchedule" ADD CONSTRAINT "PDISchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDISchedule" ADD CONSTRAINT "PDISchedule_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
