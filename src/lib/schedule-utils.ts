"use server";

import { prisma } from "@/lib/prisma";

/**
 * Recalculate the next due date for a PDI schedule after a PDI is completed.
 * Called when all goals of a PDI are marked as completed.
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
}

/**
 * Recalculate the next due date for a Feedback schedule after a feedback is submitted.
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
}
