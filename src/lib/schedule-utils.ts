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
 * Generate scheduled Feedback records for the next 12 months.
 * Removes any existing future `scheduled` records for the employee before generating new ones.
 */
export async function generateScheduledFeedbackEvents(
  employeeId: string,
  frequencyMonths: number,
  managerId: string
): Promise<number> {
  const now = new Date();

  // Remove existing future scheduled records for this employee
  await prisma.feedback.deleteMany({
    where: {
      employeeId,
      status: "scheduled",
      scheduledAt: { gte: now },
    },
  });

  // Generate dates covering the next 12 months
  const dates: Date[] = [];
  let offset = frequencyMonths;
  while (offset <= 12) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + offset);
    // Se cair no fim de semana, avança para a próxima segunda-feira
    const dow = d.getDay();
    if (dow === 0) d.setDate(d.getDate() + 1);
    if (dow === 6) d.setDate(d.getDate() + 2);
    dates.push(d);
    offset += frequencyMonths;
  }

  if (dates.length === 0) return 0;

  await prisma.feedback.createMany({
    data: dates.map((date) => ({
      employeeId,
      managerId,
      status: "scheduled" as const,
      period: formatPeriod(date),
      scheduledAt: date,
    })),
  });

  return dates.length;
}

/**
 * Remove all future scheduled Feedback records for the employee.
 * Called when frequency is set to "Nenhum" (none).
 */
export async function removeScheduledFeedbackEvents(
  employeeId: string
): Promise<void> {
  const now = new Date();

  await prisma.feedback.deleteMany({
    where: {
      employeeId,
      status: "scheduled",
      scheduledAt: { gte: now },
    },
  });
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
    await generateScheduledFeedbackEvents(
      employeeId,
      schedule.frequencyMonths,
      schedule.managerId
    );
  }
}
