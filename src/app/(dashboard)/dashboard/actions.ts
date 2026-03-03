"use server";

import { prisma } from "@/lib/prisma";
import { getEffectiveAuth } from "@/lib/impersonation";
import {
  getAccessibleEmployeeIds,
  getPDIAccessFilter,
  getFeedbackAccessFilter,
} from "@/lib/access-control";

export type DashboardData = {
  subordinateCount: number;
  pdisPending: number;
  pdisOverdue: number;
  feedbacksPending: number;
  feedbacksOverdue: number;
  upcomingItems: UpcomingItem[];
  upcomingScheduledEvents: ScheduledEvent[];
};


export type UpcomingItem = {
  id: string;
  type: "pdi" | "feedback";
  title: string;
  employeeName: string;
  dueDate: Date;
  href: string;
};

export type ScheduledEvent = {
  id: string;
  type: "pdi" | "feedback";
  employeeName: string;
  scheduledAt: Date;
  status: string;
  href: string;
};

export type NineBoxEvaluationItem = {
  evaluatorId: string;
  evaluateeName: string;
  feedbackPeriod: string;
  createdAt: Date;
};

export type NineBoxEvaluationCompletedItem = NineBoxEvaluationItem & {
  completedAt: Date;
};

export type MyNineBoxEvaluations = {
  pending: NineBoxEvaluationItem[];
  completed: NineBoxEvaluationCompletedItem[];
};

export async function getMyNineBoxEvaluations(): Promise<MyNineBoxEvaluations | null> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  // Pending: evaluator status=pending AND evaluation status=open
  const pendingRecords = await prisma.nineBoxEvaluator.findMany({
    where: {
      evaluatorId: userId,
      status: "pending",
      evaluation: {
        status: "open",
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      evaluation: {
        include: {
          evaluatee: { select: { name: true } },
          feedback: { select: { period: true } },
        },
      },
    },
  });

  const pending: NineBoxEvaluationItem[] = pendingRecords.map((r: typeof pendingRecords[number]) => ({
    evaluatorId: r.id,
    evaluateeName: r.evaluation.evaluatee.name,
    feedbackPeriod: r.evaluation.feedback.period,
    createdAt: r.createdAt,
  }));

  // Completed: evaluator status=completed
  const completedRecords = await prisma.nineBoxEvaluator.findMany({
    where: {
      evaluatorId: userId,
      status: "completed",
    },
    orderBy: { completedAt: "desc" },
    include: {
      evaluation: {
        include: {
          evaluatee: { select: { name: true } },
          feedback: { select: { period: true } },
        },
      },
    },
  });

  const completed: NineBoxEvaluationCompletedItem[] = completedRecords.map((r: typeof completedRecords[number]) => ({
    evaluatorId: r.id,
    evaluateeName: r.evaluation.evaluatee.name,
    feedbackPeriod: r.evaluation.feedback.period,
    createdAt: r.createdAt,
    completedAt: r.completedAt!,
  }));

  return { pending, completed };
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // 1. Subordinate count
  const accessible = await getAccessibleEmployeeIds(userId, role);
  let subordinateCount = 0;
  if (accessible === "all") {
    subordinateCount = await prisma.user.count({
      where: { isActive: true, id: { not: userId } },
    });
  } else {
    // Exclude self from count
    subordinateCount = accessible.filter((id) => id !== userId).length;
  }

  // 2. PDIs pending/overdue
  const now = new Date();
  const pdiFilter = await getPDIAccessFilter(userId, role);

  const pendingPdis = await prisma.pDI.count({
    where: {
      ...pdiFilter,
      status: "active",
    },
  });

  const overduePdis = await prisma.pDI.count({
    where: {
      ...pdiFilter,
      status: "active",
      goals: {
        some: {
          dueDate: { lt: now },
          status: { not: "completed" },
        },
      },
    },
  });

  // 3. Feedbacks pending/overdue
  const feedbackFilter = await getFeedbackAccessFilter(userId, role);

  const pendingFeedbacks = await prisma.feedback.count({
    where: {
      ...feedbackFilter,
      status: "draft",
    },
  });

  const overdueFeedbackSchedules = await prisma.feedbackSchedule.count({
    where: {
      isActive: true,
      nextDueDate: { lt: now },
      ...(accessible === "all"
        ? {}
        : { employeeId: { in: accessible } }),
    },
  });

  // 4. Upcoming items: next 5 PDI goals due + feedback schedules due
  const upcomingPdiGoals = await prisma.pDIGoal.findMany({
    where: {
      dueDate: { gte: now },
      status: { not: "completed" },
      pdi: {
        ...pdiFilter,
        status: "active",
      },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
    include: {
      pdi: {
        include: {
          employee: { select: { name: true } },
        },
      },
    },
  });

  const upcomingFeedbackSchedules = await prisma.feedbackSchedule.findMany({
    where: {
      isActive: true,
      nextDueDate: { gte: now },
      ...(accessible === "all"
        ? {}
        : { employeeId: { in: accessible } }),
    },
    orderBy: { nextDueDate: "asc" },
    take: 5,
    include: {
      employee: { select: { name: true } },
    },
  });

  // Combine and sort upcoming items
  const items: UpcomingItem[] = [];

  for (const goal of upcomingPdiGoals) {
    items.push({
      id: goal.pdi.id,
      type: "pdi",
      title: `PDI: ${goal.developmentObjective}`,
      employeeName: goal.pdi.employee.name,
      dueDate: goal.dueDate!,
      href: `/pdis/${goal.pdi.id}`,
    });
  }

  for (const schedule of upcomingFeedbackSchedules) {
    items.push({
      id: schedule.id,
      type: "feedback",
      title: "Feedback agendado",
      employeeName: schedule.employee.name,
      dueDate: schedule.nextDueDate,
      href: `/feedbacks`,
    });
  }

  // Sort by date, take first 5
  items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const upcomingItems = items.slice(0, 5);

  // 5. Upcoming scheduled events (Feedbacks ordered by scheduledAt)
  const scheduledFeedbacks = await prisma.feedback.findMany({
    where: {
      ...feedbackFilter,
      scheduledAt: { gte: now },
      status: { in: ["scheduled", "draft"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: 7,
    include: {
      employee: { select: { name: true } },
    },
  });

  const scheduledEvents: ScheduledEvent[] = [];

  for (const fb of scheduledFeedbacks) {
    scheduledEvents.push({
      id: fb.id,
      type: "feedback",
      employeeName: fb.employee.name,
      scheduledAt: fb.scheduledAt!,
      status: fb.status,
      href: `/feedbacks/${fb.id}`,
    });
  }

  scheduledEvents.sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
  );
  const upcomingScheduledEvents = scheduledEvents.slice(0, 7);

  return {
    subordinateCount,
    pdisPending: pendingPdis,
    pdisOverdue: overduePdis,
    feedbacksPending: pendingFeedbacks,
    feedbacksOverdue: overdueFeedbackSchedules,
    upcomingItems,
    upcomingScheduledEvents,
  };
}
