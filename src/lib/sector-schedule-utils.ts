import { prisma } from "@/lib/prisma";

export type { Period, DistributedEvent, EffectiveSchedule } from "./sector-schedule-pure-utils";
export {
  calculatePeriods,
  getCurrentPeriod,
  getBusinessDays,
  snapToBusinessDay,
  distributeEvents,
} from "./sector-schedule-pure-utils";

/**
 * Get the effective schedule configuration for an employee.
 * Returns the individual schedule if it exists and is active, otherwise the sector schedule.
 */
export async function getEffectiveSchedule(
  employeeId: string,
  type: "pdi" | "feedback"
): Promise<import("./sector-schedule-pure-utils").EffectiveSchedule | null> {
  // Check for individual feedback schedule
  if (type === "feedback") {
    const individual = await prisma.feedbackSchedule.findFirst({
      where: { employeeId, isActive: true },
    });
    if (individual) {
      return {
        source: "individual",
        frequencyMonths: individual.frequencyMonths,
        startDate: individual.nextDueDate,
        isActive: true,
      };
    }
  }

  // Fall back to sector schedule via user's organizational unit
  const hierarchy = await prisma.employeeHierarchy.findFirst({
    where: { employeeId, endDate: null },
    select: { organizationalUnitId: true },
  });

  if (!hierarchy) return null;

  const sectorSchedule = await prisma.sectorSchedule.findUnique({
    where: {
      organizationalUnitId_type: {
        organizationalUnitId: hierarchy.organizationalUnitId,
        type,
      },
    },
  });

  if (!sectorSchedule || !sectorSchedule.isActive) return null;

  return {
    source: "sector",
    frequencyMonths: sectorSchedule.frequencyMonths,
    startDate: sectorSchedule.startDate,
    isActive: sectorSchedule.isActive,
  };
}

/**
 * Create onboarding feedbacks at 45 and 90 days after admission.
 * Only creates if no onboarding feedbacks already exist for the employee.
 */
export async function createOnboardingFeedbacks(
  employeeId: string,
  admissionDate: Date,
  managerId: string
): Promise<void> {
  const d45 = new Date(admissionDate);
  d45.setDate(d45.getDate() + 45);
  // Se cair no fim de semana, avança para a próxima segunda-feira
  if (d45.getDay() === 0) d45.setDate(d45.getDate() + 1);
  if (d45.getDay() === 6) d45.setDate(d45.getDate() + 2);

  const d90 = new Date(admissionDate);
  d90.setDate(d90.getDate() + 90);
  if (d90.getDay() === 0) d90.setDate(d90.getDate() + 1);
  if (d90.getDay() === 6) d90.setDate(d90.getDate() + 2);

  // Check if onboarding feedbacks already exist
  const existing = await prisma.feedback.findMany({
    where: { employeeId, isOnboarding: true },
  });

  if (existing.length === 0) {
    await prisma.feedback.createMany({
      data: [
        {
          employeeId,
          managerId,
          status: "scheduled",
          period: "Onboarding 45d",
          scheduledAt: d45,
          isOnboarding: true,
        },
        {
          employeeId,
          managerId,
          status: "scheduled",
          period: "Onboarding 90d",
          scheduledAt: d90,
          isOnboarding: true,
        },
      ],
    });
  }
}

/**
 * Update onboarding feedbacks when admission date changes.
 * Removes pending (scheduled) onboarding feedbacks and recreates with new dates.
 * Already submitted feedbacks are not affected.
 */
export async function updateOnboardingFeedbacks(
  employeeId: string,
  admissionDate: Date,
  managerId: string
): Promise<void> {
  // Delete only scheduled onboarding feedbacks
  await prisma.feedback.deleteMany({
    where: {
      employeeId,
      isOnboarding: true,
      status: "scheduled",
    },
  });

  // Check if any submitted onboarding feedbacks remain
  const remaining = await prisma.feedback.findMany({
    where: { employeeId, isOnboarding: true },
  });

  const has45d = remaining.some((f) => f.period === "Onboarding 45d");
  const has90d = remaining.some((f) => f.period === "Onboarding 90d");

  const d45 = new Date(admissionDate);
  d45.setDate(d45.getDate() + 45);
  const d90 = new Date(admissionDate);
  d90.setDate(d90.getDate() + 90);

  const toCreate: Array<{
    employeeId: string;
    managerId: string;
    status: "scheduled";
    period: string;
    scheduledAt: Date;
    isOnboarding: true;
  }> = [];

  if (!has45d) {
    toCreate.push({
      employeeId,
      managerId,
      status: "scheduled",
      period: "Onboarding 45d",
      scheduledAt: d45,
      isOnboarding: true,
    });
  }
  if (!has90d) {
    toCreate.push({
      employeeId,
      managerId,
      status: "scheduled",
      period: "Onboarding 90d",
      scheduledAt: d90,
      isOnboarding: true,
    });
  }

  if (toCreate.length > 0) {
    await prisma.feedback.createMany({ data: toCreate });
  }
}

/**
 * Handle sector transfer for an employee.
 * Cancels future scheduled PDIs and Feedbacks (except onboarding).
 * Individual schedules (PDISchedule/FeedbackSchedule) are preserved.
 */
export async function handleSectorTransfer(
  employeeId: string,
  _newUnitId: string
): Promise<{ cancelledFeedbacks: number }> {
  const now = new Date();

  // Cancel future scheduled Feedbacks (except onboarding)
  const cancelledFeedbacks = await prisma.feedback.updateMany({
    where: {
      employeeId,
      status: "scheduled",
      scheduledAt: { gt: now },
      isOnboarding: false,
    },
    data: { status: "cancelled" },
  });

  return {
    cancelledFeedbacks: cancelledFeedbacks.count,
  };
}
