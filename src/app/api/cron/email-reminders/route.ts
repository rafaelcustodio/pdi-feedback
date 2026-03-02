import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  buildReminderEmailHtml,
  buildReminderEmailSubject,
  type ReminderItem,
} from "@/lib/email-templates";
import {
  calculatePeriods,
  getCurrentPeriod,
} from "@/lib/sector-schedule-utils";

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

    // Feedback Schedules
    const feedbackSchedules = await prisma.feedbackSchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: sevenDaysFromNow },
        employee: { evaluationMode: "feedback" },
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
        pdi: { status: "active", employee: { evaluationMode: "pdi" } },
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
            ? `A meta "${goal.developmentObjective}" ${isEmployee ? "do seu PDI" : `do PDI de ${employeeName}`} estava prevista para ${dueDateStr} e está atrasada. [${messageKey}]`
            : `A meta "${goal.developmentObjective}" ${isEmployee ? "do seu PDI" : `do PDI de ${employeeName}`} vence em ${dueDateStr}. [${messageKey}]`;

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

    // Draft feedbacks with scheduledAt (future feedback fill-in reminders)
    const draftFeedbacksWithSchedule = await prisma.feedback.findMany({
      where: {
        status: "draft",
        scheduledAt: { not: null, lte: sevenDaysFromNow },
        employee: { evaluationMode: "feedback" },
      },
      include: {
        manager: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    for (const feedback of draftFeedbacksWithSchedule) {
      if (!feedback.scheduledAt) continue;
      const isOnOrPastDate = feedback.scheduledAt <= now;
      const dueDateStr = feedback.scheduledAt.toLocaleDateString("pt-BR");
      const messageKey = `feedback_fill_${feedback.id}_${dueDateStr}`;

      const existing = await prisma.notification.findFirst({
        where: {
          userId: feedback.managerId,
          type: "feedback_reminder",
          message: { contains: messageKey },
        },
      });

      if (!existing) {
        const title = isOnOrPastDate
          ? `Feedback para preencher hoje - ${feedback.employee.name}`
          : `Feedback agendado próximo - ${feedback.employee.name}`;
        const message = isOnOrPastDate
          ? `O feedback agendado para ${feedback.employee.name} está previsto para ${dueDateStr}. Preencha-o agora. [${messageKey}]`
          : `O feedback agendado para ${feedback.employee.name} está previsto para ${dueDateStr}. [${messageKey}]`;

        await prisma.notification.create({
          data: {
            userId: feedback.managerId,
            type: "feedback_reminder",
            title,
            message,
          },
        });
        notificationsCreated++;
      }
    }

    // PDI Follow-Up reminders (scheduled within next 2 days)
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const upcomingFollowUps = await prisma.pDIFollowUp.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { gte: now, lte: twoDaysFromNow },
      },
      include: {
        pdi: {
          select: {
            managerId: true,
            employeeId: true,
            employee: { select: { name: true } },
          },
        },
      },
    });

    for (const followUp of upcomingFollowUps) {
      const scheduledStr = new Date(followUp.scheduledAt).toLocaleDateString("pt-BR");
      const messageKey = `pdi_followup_${followUp.id}_${scheduledStr}`;

      const existing = await prisma.notification.findFirst({
        where: {
          userId: followUp.pdi.managerId,
          type: "pdi_reminder",
          message: { contains: messageKey },
        },
      });

      if (!existing) {
        const employeeName = followUp.pdi.employee.name;
        await prisma.notification.create({
          data: {
            userId: followUp.pdi.managerId,
            type: "pdi_reminder",
            title: `Acompanhamento de PDI agendado - ${employeeName}`,
            message: `O acompanhamento de PDI de ${employeeName} está agendado para ${scheduledStr}. [${messageKey}]`,
          },
        });
        notificationsCreated++;
      }
    }

    // -------------------------------------------------------
    // Step 1.5: Sector cycle notifications
    // -------------------------------------------------------

    const activeSectorSchedules = await prisma.sectorSchedule.findMany({
      where: { isActive: true },
      include: { organizationalUnit: { select: { id: true, name: true } } },
    });

    for (const schedule of activeSectorSchedules) {
      const type = schedule.type as "pdi" | "feedback";
      const unitId = schedule.organizationalUnitId;
      const unitName = schedule.organizationalUnit.name;
      const typeLabel = type === "pdi" ? "PDI" : "Feedback";
      const notifType = type === "pdi" ? "pdi_reminder" : "feedback_reminder";

      const periods = calculatePeriods(schedule.frequencyMonths, schedule.startDate);
      const currentPeriod = getCurrentPeriod(periods);

      // Get active employees in this unit filtered by evaluationMode
      const hierarchies = await prisma.employeeHierarchy.findMany({
        where: {
          organizationalUnitId: unitId,
          endDate: null,
          employee: { evaluationMode: type },
        },
        select: {
          employeeId: true,
          managerId: true,
          employee: { select: { admissionDate: true } },
        },
      });

      // Helper: filter eligible employees for a given period start
      const getEligible = (periodStart: Date) =>
        hierarchies.filter((h) => {
          if (type === "feedback" && h.employee.admissionDate) {
            const onboardingEnd = new Date(h.employee.admissionDate);
            onboardingEnd.setDate(onboardingEnd.getDate() + 90);
            if (periodStart < onboardingEnd) return false;
          }
          return true;
        });

      // Helper: count compliance statuses for a period
      const countCompliance = async (
        eligible: typeof hierarchies,
        periodStart: Date,
        periodEnd: Date
      ) => {
        let notScheduled = 0;
        let scheduled = 0;
        let done = 0;

        for (const h of eligible) {
          if (type === "pdi") {
            const pdi = await prisma.pDI.findFirst({
              where: {
                employeeId: h.employeeId,
                OR: [
                  { createdAt: { gte: periodStart, lte: periodEnd } },
                  { conductedAt: { gte: periodStart, lte: periodEnd } },
                ],
              },
              orderBy: { createdAt: "desc" },
            });
            if (!pdi) notScheduled++;
            else if (pdi.status === "active" && pdi.conductedAt) done++;
            else scheduled++;
          } else {
            const feedback = await prisma.feedback.findFirst({
              where: {
                employeeId: h.employeeId,
                OR: [
                  { scheduledAt: { gte: periodStart, lte: periodEnd } },
                  { conductedAt: { gte: periodStart, lte: periodEnd } },
                ],
              },
              orderBy: { scheduledAt: "desc" },
            });
            if (!feedback) notScheduled++;
            else if (feedback.status === "submitted") done++;
            else scheduled++;
          }
        }

        return { notScheduled, scheduled, done };
      };

      // --- Phase 1: Period start (first 7 days) ---
      if (currentPeriod) {
        const daysSinceStart = Math.floor(
          (now.getTime() - currentPeriod.start.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysUntilEnd = Math.floor(
          (currentPeriod.end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const eligible = getEligible(currentPeriod.start);
        const managerIds = [...new Set(eligible.map((h) => h.managerId))];

        if (daysSinceStart >= 0 && daysSinceStart <= 7 && eligible.length > 0) {
          const counts = await countCompliance(eligible, currentPeriod.start, currentPeriod.end);
          if (counts.notScheduled > 0) {
            for (const managerId of managerIds) {
              const messageKey = `sector_reminder_${unitId}_${currentPeriod.label}_${type}_period_start`;
              const existing = await prisma.notification.findFirst({
                where: { userId: managerId, message: { contains: messageKey } },
              });
              if (!existing) {
                await prisma.notification.create({
                  data: {
                    userId: managerId,
                    type: notifType,
                    title: `${counts.notScheduled} colaboradores aguardam programação de ${typeLabel}`,
                    message: `${counts.notScheduled} colaboradores aguardam programação de ${typeLabel} no período ${currentPeriod.label} (${unitName}). [${messageKey}]`,
                  },
                });
                notificationsCreated++;
              }
            }
          }
        }

        // --- Phase 2: Approaching end (7 days before) ---
        if (daysUntilEnd >= 0 && daysUntilEnd <= 7 && eligible.length > 0) {
          const counts = await countCompliance(eligible, currentPeriod.start, currentPeriod.end);
          const pendingCount = counts.notScheduled + counts.scheduled;
          if (pendingCount > 0) {
            for (const managerId of managerIds) {
              const messageKey = `sector_reminder_${unitId}_${currentPeriod.label}_${type}_approaching_end`;
              const existing = await prisma.notification.findFirst({
                where: { userId: managerId, message: { contains: messageKey } },
              });
              if (!existing) {
                let msgBody = `Faltam ${daysUntilEnd} dias para o fim do período ${currentPeriod.label} (${unitName}).`;
                if (counts.notScheduled > 0) msgBody += ` ${counts.notScheduled} não programados.`;
                if (counts.scheduled > 0) msgBody += ` ${counts.scheduled} programados mas não realizados.`;
                await prisma.notification.create({
                  data: {
                    userId: managerId,
                    type: notifType,
                    title: `${typeLabel}: ${pendingCount} pendências antes do fim do período — ${unitName}`,
                    message: `${msgBody} [${messageKey}]`,
                  },
                });
                notificationsCreated++;
              }
            }
          }
        }
      }

      // --- Phase 3: Previous period ended with pending items ---
      const endedPeriods = periods.filter((p) => p.end < now);
      const previousPeriod = endedPeriods.length > 0 ? endedPeriods[endedPeriods.length - 1] : null;

      if (previousPeriod) {
        const daysSinceEnd = Math.floor(
          (now.getTime() - previousPeriod.end.getTime()) / (1000 * 60 * 60 * 24)
        );
        // Only check recently ended periods (within 7 days)
        if (daysSinceEnd >= 0 && daysSinceEnd <= 7) {
          const eligible = getEligible(previousPeriod.start);
          const managerIds = [...new Set(eligible.map((h) => h.managerId))];

          if (eligible.length > 0) {
            const counts = await countCompliance(eligible, previousPeriod.start, previousPeriod.end);
            const pendingCount = counts.notScheduled + counts.scheduled;
            if (pendingCount > 0) {
              for (const managerId of managerIds) {
                const messageKey = `sector_reminder_${unitId}_${previousPeriod.label}_${type}_period_ended`;
                const existing = await prisma.notification.findFirst({
                  where: { userId: managerId, message: { contains: messageKey } },
                });
                if (!existing) {
                  await prisma.notification.create({
                    data: {
                      userId: managerId,
                      type: notifType,
                      title: `Período ${previousPeriod.label} encerrado com pendências — ${unitName}`,
                      message: `Período ${previousPeriod.label} encerrado com ${pendingCount} pendências de ${typeLabel} em ${unitName}. [${messageKey}]`,
                    },
                  });
                  notificationsCreated++;
                }
              }
            }
          }
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
