import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MONTH_ABBR_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatPeriod(date: Date): string {
  return `${MONTH_ABBR_PT[date.getMonth()]}/${date.getFullYear()}`;
}

/**
 * GET /api/cron/generate-events
 *
 * Weekly cron job that maintains the 12-month horizon of scheduled events.
 * For each active PDISchedule and FeedbackSchedule:
 *   1. Checks existing future `scheduled` records
 *   2. Fills gaps to ensure coverage for the next 12 months
 *   3. Updates `nextDueDate` on the schedule
 *
 * Protected by CRON_SECRET header to prevent unauthorized access.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setMonth(horizon.getMonth() + 12);

    let generated = 0;
    let checked = 0;
    const errors: string[] = [];

    // -------------------------------------------------------
    // Process PDI Schedules
    // -------------------------------------------------------
    const pdiSchedules = await prisma.pDISchedule.findMany({
      where: { isActive: true },
      include: {
        employee: { select: { id: true, name: true, isActive: true } },
      },
    });

    for (const schedule of pdiSchedules) {
      checked++;
      try {
        if (!schedule.employee.isActive) continue;

        // Find all future scheduled PDIs for this employee
        const futureScheduled = await prisma.pDI.findMany({
          where: {
            employeeId: schedule.employeeId,
            status: "scheduled",
            scheduledAt: { gte: now },
          },
          orderBy: { scheduledAt: "asc" },
          select: { scheduledAt: true },
        });

        // Determine the last covered date
        const existingDates = new Set(
          futureScheduled
            .filter((r) => r.scheduledAt)
            .map((r) => {
              const d = r.scheduledAt!;
              return `${d.getFullYear()}-${d.getMonth()}`;
            })
        );

        const lastScheduledDate =
          futureScheduled.length > 0 && futureScheduled[futureScheduled.length - 1].scheduledAt
            ? futureScheduled[futureScheduled.length - 1].scheduledAt!
            : now;

        // Generate dates from the next slot after lastScheduledDate up to horizon
        const newDates: Date[] = [];
        let cursor: Date;

        if (futureScheduled.length > 0) {
          // Start from last scheduled date + frequency
          cursor = new Date(lastScheduledDate);
          cursor.setMonth(cursor.getMonth() + schedule.frequencyMonths);
        } else {
          // No future records — start from now + frequency
          cursor = new Date(now);
          cursor.setMonth(cursor.getMonth() + schedule.frequencyMonths);
        }

        while (cursor <= horizon) {
          const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
          if (!existingDates.has(key)) {
            newDates.push(new Date(cursor));
            existingDates.add(key);
          }
          cursor.setMonth(cursor.getMonth() + schedule.frequencyMonths);
        }

        if (newDates.length > 0) {
          await prisma.pDI.createMany({
            data: newDates.map((date) => ({
              employeeId: schedule.employeeId,
              managerId: schedule.managerId,
              status: "scheduled" as const,
              period: formatPeriod(date),
              scheduledAt: date,
            })),
          });
          generated += newDates.length;
        }

        // Update nextDueDate to earliest future scheduled record
        const earliestFuture = await prisma.pDI.findFirst({
          where: {
            employeeId: schedule.employeeId,
            status: "scheduled",
            scheduledAt: { gte: now },
          },
          orderBy: { scheduledAt: "asc" },
          select: { scheduledAt: true },
        });

        if (earliestFuture?.scheduledAt) {
          await prisma.pDISchedule.update({
            where: { id: schedule.id },
            data: { nextDueDate: earliestFuture.scheduledAt },
          });
        }
      } catch (err) {
        const msg = `PDISchedule ${schedule.id} (employee ${schedule.employee.name}): ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[Cron] generate-events error:`, msg);
        errors.push(msg);
      }
    }

    // -------------------------------------------------------
    // Process Feedback Schedules
    // -------------------------------------------------------
    const feedbackSchedules = await prisma.feedbackSchedule.findMany({
      where: { isActive: true },
      include: {
        employee: { select: { id: true, name: true, isActive: true } },
      },
    });

    for (const schedule of feedbackSchedules) {
      checked++;
      try {
        if (!schedule.employee.isActive) continue;

        // Find all future scheduled Feedbacks for this employee
        const futureScheduled = await prisma.feedback.findMany({
          where: {
            employeeId: schedule.employeeId,
            status: "scheduled",
            scheduledAt: { gte: now },
          },
          orderBy: { scheduledAt: "asc" },
          select: { scheduledAt: true },
        });

        // Determine existing date slots to avoid duplicates
        const existingDates = new Set(
          futureScheduled
            .filter((r) => r.scheduledAt)
            .map((r) => {
              const d = r.scheduledAt!;
              return `${d.getFullYear()}-${d.getMonth()}`;
            })
        );

        const lastScheduledDate =
          futureScheduled.length > 0 && futureScheduled[futureScheduled.length - 1].scheduledAt
            ? futureScheduled[futureScheduled.length - 1].scheduledAt!
            : now;

        // Generate dates to fill the gap up to horizon
        const newDates: Date[] = [];
        let cursor: Date;

        if (futureScheduled.length > 0) {
          cursor = new Date(lastScheduledDate);
          cursor.setMonth(cursor.getMonth() + schedule.frequencyMonths);
        } else {
          cursor = new Date(now);
          cursor.setMonth(cursor.getMonth() + schedule.frequencyMonths);
        }

        while (cursor <= horizon) {
          const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
          if (!existingDates.has(key)) {
            newDates.push(new Date(cursor));
            existingDates.add(key);
          }
          cursor.setMonth(cursor.getMonth() + schedule.frequencyMonths);
        }

        if (newDates.length > 0) {
          await prisma.feedback.createMany({
            data: newDates.map((date) => ({
              employeeId: schedule.employeeId,
              managerId: schedule.managerId,
              status: "scheduled" as const,
              period: formatPeriod(date),
              scheduledAt: date,
            })),
          });
          generated += newDates.length;
        }

        // Update nextDueDate to earliest future scheduled record
        const earliestFuture = await prisma.feedback.findFirst({
          where: {
            employeeId: schedule.employeeId,
            status: "scheduled",
            scheduledAt: { gte: now },
          },
          orderBy: { scheduledAt: "asc" },
          select: { scheduledAt: true },
        });

        if (earliestFuture?.scheduledAt) {
          await prisma.feedbackSchedule.update({
            where: { id: schedule.id },
            data: { nextDueDate: earliestFuture.scheduledAt },
          });
        }
      } catch (err) {
        const msg = `FeedbackSchedule ${schedule.id} (employee ${schedule.employee.name}): ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[Cron] generate-events error:`, msg);
        errors.push(msg);
      }
    }

    console.log(
      `[Cron] generate-events completed: checked=${checked}, generated=${generated}, errors=${errors.length}`
    );

    return NextResponse.json({
      generated,
      checked,
      errors,
    });
  } catch (error) {
    console.error("[Cron] generate-events failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
