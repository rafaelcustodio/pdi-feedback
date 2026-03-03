"use server";

import { prisma } from "@/lib/prisma";
import { getEffectiveAuth } from "@/lib/impersonation";
import { revalidatePath } from "next/cache";

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

/**
 * Get paginated notifications for the current user.
 */
export async function getNotifications(
  page: number = 1,
  pageSize: number = 20,
  filter: "all" | "unread" | "read" = "all"
): Promise<{ notifications: NotificationListItem[]; total: number }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return { notifications: [], total: 0 };

  const userId = session.user.id;

  const where: Record<string, unknown> = { userId };
  if (filter === "unread") where.isRead = false;
  if (filter === "read") where.isRead = true;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total };
}

/**
 * Get the last N notifications for the dropdown in the header.
 */
export async function getRecentNotifications(
  limit: number = 10
): Promise<NotificationListItem[]> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return [];

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      isRead: true,
      createdAt: true,
    },
  });
}

/**
 * Get the count of unread notifications for the current user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return 0;

  return prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return { success: false, error: "Não autenticado" };

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== session.user.id) {
    return { success: false, error: "Notificação não encontrada" };
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  revalidatePath("/notificacoes");
  return { success: true };
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return { success: false, error: "Não autenticado" };

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notificacoes");
  return { success: true };
}

/**
 * Generate notifications for upcoming and overdue PDI/Feedback schedules.
 * Creates notifications when:
 * - A schedule's nextDueDate is within 7 days (reminder)
 * - A schedule's nextDueDate has passed (overdue)
 *
 * This function is idempotent - it checks for existing notifications
 * to avoid duplicates by looking at recent notifications with matching type and message.
 */
export async function generateScheduleNotifications(): Promise<{
  created: number;
}> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return { created: 0 };

  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  let created = 0;

  // Get all active Feedback schedules with upcoming or overdue dates
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
      created++;
    }
  }

  // Also check PDI goals with upcoming due dates
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

    // Notify both the employee and the manager
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
        created++;
      }
    }
  }

  return { created };
}
