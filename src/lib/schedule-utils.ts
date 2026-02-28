"use server";

import { prisma } from "@/lib/prisma";

const MONTH_ABBR_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/**
 * Format a date into a period string like "Mar/2026".
 */
function formatPeriod(date: Date): string {
  return `${MONTH_ABBR_PT[date.getMonth()]}/${date.getFullYear()}`;
}

/**
 * Generate scheduled PDI or Feedback records for the next 12 months.
 * Removes any existing future `scheduled` records for the employee/type before generating new ones.
 */
export async function generateScheduledEvents(
  employeeId: string,
  type: "pdi" | "feedback",
  frequencyMonths: number,
  managerId: string
): Promise<number> {
  const now = new Date();

  // Remove existing future scheduled records for this employee/type
  if (type === "pdi") {
    await prisma.pDI.deleteMany({
      where: {
        employeeId,
        status: "scheduled",
        scheduledAt: { gte: now },
      },
    });
  } else {
    await prisma.feedback.deleteMany({
      where: {
        employeeId,
        status: "scheduled",
        scheduledAt: { gte: now },
      },
    });
  }

  // Generate dates covering the next 12 months
  const dates: Date[] = [];
  let offset = frequencyMonths;
  while (offset <= 12) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + offset);
    dates.push(d);
    offset += frequencyMonths;
  }

  if (dates.length === 0) return 0;

  // Create scheduled records
  if (type === "pdi") {
    await prisma.pDI.createMany({
      data: dates.map((date) => ({
        employeeId,
        managerId,
        status: "scheduled" as const,
        period: formatPeriod(date),
        scheduledAt: date,
      })),
    });
  } else {
    await prisma.feedback.createMany({
      data: dates.map((date) => ({
        employeeId,
        managerId,
        status: "scheduled" as const,
        period: formatPeriod(date),
        scheduledAt: date,
      })),
    });
  }

  return dates.length;
}

/**
 * Remove all future scheduled records for the employee/type.
 * Called when frequency is set to "Nenhum" (none).
 */
export async function removeScheduledEvents(
  employeeId: string,
  type: "pdi" | "feedback"
): Promise<void> {
  const now = new Date();

  if (type === "pdi") {
    await prisma.pDI.deleteMany({
      where: {
        employeeId,
        status: "scheduled",
        scheduledAt: { gte: now },
      },
    });
  } else {
    await prisma.feedback.deleteMany({
      where: {
        employeeId,
        status: "scheduled",
        scheduledAt: { gte: now },
      },
    });
  }
}

/**
 * Recalculate the next due date for a PDI schedule after a PDI is completed.
 * Also generates the next scheduled slot if needed.
 */
export async function recalculatePDISchedule(
  employeeId: string
): Promise<void> {
  const schedule = await prisma.pDISchedule.findFirst({
    where: { employeeId, isActive: true },
  });

  if (!schedule) return;

  const now = new Date();
  const next = new Date(now);
  next.setMonth(next.getMonth() + schedule.frequencyMonths);

  await prisma.pDISchedule.update({
    where: { id: schedule.id },
    data: { nextDueDate: next },
  });

  // Check if there are future scheduled PDIs; if not, generate the next slot
  const futureScheduled = await prisma.pDI.count({
    where: {
      employeeId,
      status: "scheduled",
      scheduledAt: { gte: now },
    },
  });

  if (futureScheduled === 0) {
    await generateScheduledEvents(
      employeeId,
      "pdi",
      schedule.frequencyMonths,
      schedule.managerId
    );
  }
}

/**
 * Recalculate the next due date for a Feedback schedule after a feedback is submitted.
 * Also generates the next scheduled slot if needed.
 */
export async function recalculateFeedbackSchedule(
  employeeId: string
): Promise<void> {
  const schedule = await prisma.feedbackSchedule.findFirst({
    where: { employeeId, isActive: true },
  });

  if (!schedule) return;

  const now = new Date();
  const next = new Date(now);
  next.setMonth(next.getMonth() + schedule.frequencyMonths);

  await prisma.feedbackSchedule.update({
    where: { id: schedule.id },
    data: { nextDueDate: next },
  });

  // Check if there are future scheduled Feedbacks; if not, generate the next slot
  const futureScheduled = await prisma.feedback.count({
    where: {
      employeeId,
      status: "scheduled",
      scheduledAt: { gte: now },
    },
  });

  if (futureScheduled === 0) {
    await generateScheduledEvents(
      employeeId,
      "feedback",
      schedule.frequencyMonths,
      schedule.managerId
    );
  }
}
