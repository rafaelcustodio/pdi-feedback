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
    let skippedBySector = 0;
    const errors: string[] = [];

    // Pre-load employee→unit mapping for active hierarchies
    const activeHierarchies = await prisma.employeeHierarchy.findMany({
      where: { endDate: null },
      select: { employeeId: true, organizationalUnitId: true },
    });
    const employeeUnitMap = new Map<string, string>();
    for (const h of activeHierarchies) {
      employeeUnitMap.set(h.employeeId, h.organizationalUnitId);
    }

    // Pre-load active sector schedules by unit+type
    const activeSectorSchedules = await prisma.sectorSchedule.findMany({
      where: { isActive: true },
      select: { organizationalUnitId: true, type: true },
    });
    const sectorScheduleSet = new Set(
      activeSectorSchedules.map((s) => `${s.organizationalUnitId}_${s.type}`)
    );

    // Helper: check if employee's unit has active sector schedule for the type
    const hasSectorSchedule = (employeeId: string, type: string): boolean => {
      const unitId = employeeUnitMap.get(employeeId);
      if (!unitId) return false;
      return sectorScheduleSet.has(`${unitId}_${type}`);
    };

    // -------------------------------------------------------
    // Process Feedback Schedules
    // -------------------------------------------------------
    const feedbackSchedules = await prisma.feedbackSchedule.findMany({
      where: { isActive: true, employee: { evaluationMode: "feedback" } },
      include: {
        employee: { select: { id: true, name: true, isActive: true } },
      },
    });

    for (const schedule of feedbackSchedules) {
      checked++;
      try {
        if (!schedule.employee.isActive) continue;

        // Skip employees under sector config — manager programs manually
        if (hasSectorSchedule(schedule.employeeId, "feedback")) {
          skippedBySector++;
          continue;
        }

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
      `[Cron] generate-events completed: checked=${checked}, generated=${generated}, skippedBySector=${skippedBySector}, errors=${errors.length}`
    );

    return NextResponse.json({
      generated,
      checked,
      skippedBySector,
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
