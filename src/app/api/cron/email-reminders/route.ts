import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  buildReminderEmailHtml,
  buildReminderEmailSubject,
  type ReminderItem,
} from "@/lib/email-templates";

/**
 * GET /api/cron/email-reminders
 *
 * Daily cron job that:
 * 1. Checks PDI and Feedback schedules due within 7 days or overdue
 * 2. Creates notifications for managers (idempotent via messageKey)
 * 3. Sends consolidated reminder emails to managers
 * 4. Updates emailSent=true on sent notifications
 *
 * Protected by CRON_SECRET header to prevent unauthorized access.
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    let notificationsCreated = 0;

    // -------------------------------------------------------
    // Step 1: Generate notifications for upcoming/overdue schedules
    // (same logic as generateScheduleNotifications but without auth)
    // -------------------------------------------------------

    // PDI Schedules
    const pdiSchedules = await prisma.pDISchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: sevenDaysFromNow },
      },
      include: {
        manager: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    for (const schedule of pdiSchedules) {
      const isOverdue = schedule.nextDueDate <= now;
      const dueDateStr = schedule.nextDueDate.toLocaleDateString("pt-BR");
      const messageKey = `pdi_schedule_${schedule.id}_${dueDateStr}`;

      const existing = await prisma.notification.findFirst({
        where: {
          userId: schedule.managerId,
          type: "pdi_reminder",
          message: { contains: messageKey },
        },
      });

      if (!existing) {
        const title = isOverdue
          ? `PDI atrasado - ${schedule.employee.name}`
          : `PDI próximo do vencimento - ${schedule.employee.name}`;
        const message = isOverdue
          ? `O PDI de ${schedule.employee.name} estava previsto para ${dueDateStr} e está atrasado. [${messageKey}]`
          : `O PDI de ${schedule.employee.name} vence em ${dueDateStr}. [${messageKey}]`;

        await prisma.notification.create({
          data: {
            userId: schedule.managerId,
            type: "pdi_reminder",
            title,
            message,
          },
        });
        notificationsCreated++;
      }
    }

    // Feedback Schedules
    const feedbackSchedules = await prisma.feedbackSchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: sevenDaysFromNow },
      },
      include: {
        manager: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    for (const schedule of feedbackSchedules) {
      const isOverdue = schedule.nextDueDate <= now;
      const dueDateStr = schedule.nextDueDate.toLocaleDateString("pt-BR");
      const messageKey = `feedback_schedule_${schedule.id}_${dueDateStr}`;

      const existing = await prisma.notification.findFirst({
        where: {
          userId: schedule.managerId,
          type: "feedback_reminder",
          message: { contains: messageKey },
        },
      });

      if (!existing) {
        const title = isOverdue
          ? `Feedback atrasado - ${schedule.employee.name}`
          : `Feedback próximo do vencimento - ${schedule.employee.name}`;
        const message = isOverdue
          ? `O feedback de ${schedule.employee.name} estava previsto para ${dueDateStr} e está atrasado. [${messageKey}]`
          : `O feedback de ${schedule.employee.name} vence em ${dueDateStr}. [${messageKey}]`;

        await prisma.notification.create({
          data: {
            userId: schedule.managerId,
            type: "feedback_reminder",
            title,
            message,
          },
        });
        notificationsCreated++;
      }
    }

    // PDI Goals
    const pdiGoals = await prisma.pDIGoal.findMany({
      where: {
        status: { not: "completed" },
        dueDate: { not: null, lte: sevenDaysFromNow },
        pdi: { status: "active" },
      },
      include: {
        pdi: {
          select: {
            employeeId: true,
            managerId: true,
            employee: { select: { name: true } },
          },
        },
      },
    });

    for (const goal of pdiGoals) {
      if (!goal.dueDate) continue;
      const isOverdue = goal.dueDate <= now;
      const dueDateStr = goal.dueDate.toLocaleDateString("pt-BR");
      const messageKey = `pdi_goal_${goal.id}_${dueDateStr}`;

      const userIds = [goal.pdi.employeeId, goal.pdi.managerId].filter(
        (id, i, arr) => arr.indexOf(id) === i
      );

      for (const userId of userIds) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: "pdi_reminder",
            message: { contains: messageKey },
          },
        });

        if (!existing) {
          const employeeName = goal.pdi.employee.name;
          const isEmployee = userId === goal.pdi.employeeId;
          const title = isOverdue
            ? `Meta de PDI atrasada${isEmployee ? "" : ` - ${employeeName}`}`
            : `Meta de PDI próxima do vencimento${isEmployee ? "" : ` - ${employeeName}`}`;
          const message = isOverdue
            ? `A meta "${goal.title}" ${isEmployee ? "do seu PDI" : `do PDI de ${employeeName}`} estava prevista para ${dueDateStr} e está atrasada. [${messageKey}]`
            : `A meta "${goal.title}" ${isEmployee ? "do seu PDI" : `do PDI de ${employeeName}`} vence em ${dueDateStr}. [${messageKey}]`;

          await prisma.notification.create({
            data: {
              userId,
              type: "pdi_reminder",
              title,
              message,
            },
          });
          notificationsCreated++;
        }
      }
    }

    // -------------------------------------------------------
    // Step 2: Find unsent notifications and group by manager
    // -------------------------------------------------------

    const unsentNotifications = await prisma.notification.findMany({
      where: {
        emailSent: false,
        type: { in: ["pdi_reminder", "feedback_reminder"] },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group notifications by manager (userId)
    const byManager = new Map<
      string,
      {
        name: string;
        email: string;
        notificationIds: string[];
        items: ReminderItem[];
      }
    >();

    for (const notif of unsentNotifications) {
      if (!byManager.has(notif.userId)) {
        byManager.set(notif.userId, {
          name: notif.user.name,
          email: notif.user.email,
          notificationIds: [],
          items: [],
        });
      }

      const group = byManager.get(notif.userId)!;
      group.notificationIds.push(notif.id);

      // Parse notification to build the ReminderItem
      const isOverdue =
        notif.title.includes("atrasad") || notif.message.includes("atrasad");
      const isPDI = notif.type === "pdi_reminder";

      // Extract employee name from title (after " - ")
      const titleParts = notif.title.split(" - ");
      const employeeName =
        titleParts.length > 1 ? titleParts[titleParts.length - 1] : "";

      // Extract due date from message - look for dd/mm/yyyy pattern
      const dateMatch = notif.message.match(/(\d{2}\/\d{2}\/\d{4})/);
      const dueDate = dateMatch ? dateMatch[1] : "";

      // Build link URL - link to PDIs or Feedbacks list page
      const linkUrl = isPDI ? `${baseUrl}/pdis` : `${baseUrl}/feedbacks`;

      group.items.push({
        employeeName: employeeName || notif.user.name,
        type: isPDI ? "PDI" : "Feedback",
        dueDate,
        isOverdue,
        linkUrl,
      });
    }

    // -------------------------------------------------------
    // Step 3: Send consolidated email per manager
    // -------------------------------------------------------

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const [, group] of byManager) {
      if (group.items.length === 0) continue;

      const overdueCount = group.items.filter((i) => i.isOverdue).length;
      const upcomingCount = group.items.length - overdueCount;

      const subject = buildReminderEmailSubject(overdueCount, upcomingCount);
      const html = buildReminderEmailHtml(group.name, group.items, baseUrl);

      const sent = await sendEmail({
        to: group.email,
        subject,
        html,
      });

      if (sent) {
        // Step 4: Update emailSent = true for all notifications in this group
        await prisma.notification.updateMany({
          where: { id: { in: group.notificationIds } },
          data: { emailSent: true },
        });
        emailsSent++;
      } else {
        emailsFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      notificationsCreated,
      emailsSent,
      emailsFailed,
      managersNotified: byManager.size,
    });
  } catch (error) {
    console.error("[Cron] Email reminders failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
