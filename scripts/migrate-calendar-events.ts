/**
 * Data migration: Populate CalendarEvent from existing Feedback and PDIFollowUp records.
 *
 * Run with: npx tsx scripts/migrate-calendar-events.ts
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("Starting CalendarEvent data migration...");

  // 1. Migrate Feedbacks with scheduledAt
  const feedbacks = await prisma.feedback.findMany({
    where: {
      scheduledAt: { not: null },
      calendarEvent: null, // skip already-migrated
    },
    include: {
      employee: { select: { name: true } },
    },
  });

  let feedbackCount = 0;
  for (const fb of feedbacks) {
    const status =
      fb.status === "submitted"
        ? "completed"
        : fb.status === "cancelled"
          ? "cancelled"
          : "scheduled";

    await prisma.calendarEvent.create({
      data: {
        type: "feedback",
        title: `Feedback — ${fb.employee.name}`,
        scheduledAt: fb.scheduledAt!,
        durationMinutes: 60,
        status: status as "scheduled" | "completed" | "cancelled",
        outlookEventId: fb.outlookEventId,
        employeeId: fb.employeeId,
        managerId: fb.managerId,
        feedbackId: fb.id,
      },
    });
    feedbackCount++;
  }
  console.log(`Migrated ${feedbackCount} feedback(s) → CalendarEvent`);

  // 2. Migrate PDIFollowUps
  const followUps = await prisma.pDIFollowUp.findMany({
    where: {
      calendarEvent: null, // skip already-migrated
    },
    include: {
      pdi: {
        include: {
          employee: { select: { id: true, name: true } },
          manager: { select: { id: true } },
        },
      },
    },
  });

  let followUpCount = 0;
  for (const fu of followUps) {
    const status =
      fu.status === "completed"
        ? "completed"
        : fu.status === "cancelled"
          ? "cancelled"
          : "scheduled";

    await prisma.calendarEvent.create({
      data: {
        type: "pdi_followup",
        title: `Acompanhamento PDI — ${fu.pdi.employee.name}`,
        scheduledAt: fu.scheduledAt,
        durationMinutes: 60,
        status: status as "scheduled" | "completed" | "cancelled",
        outlookEventId: fu.outlookEventId,
        employeeId: fu.pdi.employee.id,
        managerId: fu.pdi.manager.id,
        pdiFollowUpId: fu.id,
      },
    });
    followUpCount++;
  }
  console.log(`Migrated ${followUpCount} PDI follow-up(s) → CalendarEvent`);

  console.log("Data migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
