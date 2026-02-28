"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getAccessibleEmployeeIds,
  getPDIAccessFilter,
  canAccessEmployee,
} from "@/lib/access-control";
import { recalculatePDISchedule } from "@/lib/schedule-utils";

export type PDIListItem = {
  id: string;
  period: string;
  status: string;
  conductedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employeeName: string;
  managerName: string;
  goalCount: number;
  completedGoalCount: number;
};

export type EvidenceDetail = {
  id: string;
  description: string;
  fileUrl: string | null;
  createdAt: Date;
};

export type GoalDetail = {
  id: string;
  title: string;
  description: string | null;
  competency: string;
  status: string;
  dueDate: Date | null;
  createdAt: Date;
  evidences: EvidenceDetail[];
};

export type CommentDetail = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
};

export type PDIDetail = {
  id: string;
  employeeId: string;
  managerId: string;
  period: string;
  status: string;
  conductedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employeeName: string;
  managerName: string;
  goals: GoalDetail[];
  comments: CommentDetail[];
};

export type SubordinateOption = {
  id: string;
  name: string;
  email: string;
};

export type GoalInput = {
  id?: string;
  title: string;
  description: string;
  competency: string;
  status: string;
  dueDate: string;
};

export async function getPDIs(
  search: string = "",
  page: number = 1,
  pageSize: number = 10,
  conductedAtFrom: string = "",
  conductedAtTo: string = "",
  statusFilter: string = ""
): Promise<{
  pdis: PDIListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { pdis: [], total: 0, page: 1, pageSize: 10 };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const accessFilter = await getPDIAccessFilter(userId, role);

  let whereClause: Record<string, unknown> = { ...accessFilter };

  const andConditions: Record<string, unknown>[] = [];

  // Employees should NOT see scheduled PDIs
  if (role === "employee") {
    andConditions.push({ status: { not: "scheduled" } });
  }

  // Status filter
  if (statusFilter.trim()) {
    andConditions.push({ status: statusFilter.trim() });
  }

  if (search.trim()) {
    andConditions.push({
      OR: [
        { employee: { name: { contains: search.trim(), mode: "insensitive" as const } } },
        { period: { contains: search.trim(), mode: "insensitive" as const } },
      ],
    });
  }

  // Filter by conductedAt date range
  if (conductedAtFrom.trim()) {
    const fromDate = new Date(conductedAtFrom.trim());
    if (!isNaN(fromDate.getTime())) {
      andConditions.push({ conductedAt: { gte: fromDate } });
    }
  }
  if (conductedAtTo.trim()) {
    const toDate = new Date(conductedAtTo.trim());
    if (!isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      andConditions.push({ conductedAt: { lte: toDate } });
    }
  }

  if (andConditions.length > 0) {
    whereClause = {
      AND: [whereClause, ...andConditions],
    };
  }

  const [pdis, total] = await Promise.all([
    prisma.pDI.findMany({
      where: whereClause,
      orderBy: [{ scheduledAt: "desc" }, { conductedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employee: { select: { name: true } },
        manager: { select: { name: true } },
        goals: { select: { status: true } },
      },
    }),
    prisma.pDI.count({ where: whereClause }),
  ]);

  return {
    pdis: pdis.map((p) => ({
      id: p.id,
      period: p.period,
      status: p.status,
      conductedAt: p.conductedAt,
      scheduledAt: p.scheduledAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      employeeName: p.employee.name,
      managerName: p.manager.name,
      goalCount: p.goals.length,
      completedGoalCount: p.goals.filter((g) => g.status === "completed").length,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getPDIById(id: string): Promise<PDIDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const pdi = await prisma.pDI.findUnique({
    where: { id },
    include: {
      employee: { select: { name: true } },
      manager: { select: { name: true } },
      goals: {
        orderBy: { createdAt: "asc" },
        include: {
          evidences: { orderBy: { createdAt: "desc" } },
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!pdi) return null;

  // Access check
  if (role === "admin") {
    // ok
  } else if (pdi.managerId === userId) {
    // Manager who created this PDI
  } else if (pdi.employeeId === userId) {
    // Employee can see their own PDIs
  } else {
    const hasAccess = await canAccessEmployee(userId, role, pdi.employeeId);
    if (!hasAccess) return null;
  }

  return {
    id: pdi.id,
    employeeId: pdi.employeeId,
    managerId: pdi.managerId,
    period: pdi.period,
    status: pdi.status,
    conductedAt: pdi.conductedAt,
    scheduledAt: pdi.scheduledAt,
    createdAt: pdi.createdAt,
    updatedAt: pdi.updatedAt,
    employeeName: pdi.employee.name,
    managerName: pdi.manager.name,
    goals: pdi.goals.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      competency: g.competency,
      status: g.status,
      dueDate: g.dueDate,
      createdAt: g.createdAt,
      evidences: g.evidences.map((e) => ({
        id: e.id,
        description: e.description,
        fileUrl: e.fileUrl,
        createdAt: e.createdAt,
      })),
    })),
    comments: pdi.comments.map((c) => ({
      id: c.id,
      authorId: c.authorId,
      authorName: c.author.name,
      content: c.content,
      createdAt: c.createdAt,
    })),
  };
}

export async function getSubordinatesForPDI(): Promise<SubordinateOption[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role === "employee") return [];

  const accessible = await getAccessibleEmployeeIds(userId, role);

  if (accessible === "all") {
    return prisma.user.findMany({
      where: { isActive: true, id: { not: userId } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  const subordinateIds = accessible.filter((id) => id !== userId);
  if (subordinateIds.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: subordinateIds }, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function createPDI(data: {
  employeeId: string;
  period: string;
  conductedAt: string;
  goals: GoalInput[];
  activate?: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role === "employee") {
    return { success: false, error: "Apenas gestores podem criar PDIs" };
  }

  const hasAccess = await canAccessEmployee(userId, role, data.employeeId);
  if (!hasAccess) {
    return { success: false, error: "Você não tem acesso a este colaborador" };
  }

  if (!data.period.trim()) {
    return { success: false, error: "Período é obrigatório" };
  }

  if (!data.conductedAt) {
    return { success: false, error: "Data de realização é obrigatória" };
  }

  if (data.activate && data.goals.length === 0) {
    return { success: false, error: "Adicione pelo menos uma meta para ativar o PDI" };
  }

  if (data.activate) {
    for (const goal of data.goals) {
      if (!goal.title.trim()) {
        return { success: false, error: "Todas as metas devem ter um título" };
      }
      if (!goal.competency.trim()) {
        return { success: false, error: "Todas as metas devem ter uma competência" };
      }
    }
  }

  const pdi = await prisma.pDI.create({
    data: {
      employeeId: data.employeeId,
      managerId: userId,
      period: data.period.trim(),
      conductedAt: new Date(data.conductedAt),
      status: data.activate ? "active" : "draft",
      goals: {
        create: data.goals
          .filter((g) => g.title.trim())
          .map((g) => ({
            title: g.title.trim(),
            description: g.description.trim() || null,
            competency: g.competency.trim(),
            status: "pending" as const,
            dueDate: g.dueDate ? new Date(g.dueDate) : null,
          })),
      },
    },
  });

  revalidatePath("/pdis");
  return { success: true, id: pdi.id };
}

export async function updatePDI(
  id: string,
  data: {
    period: string;
    conductedAt: string;
    goals: GoalInput[];
    activate?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const pdi = await prisma.pDI.findUnique({
    where: { id },
    include: { goals: true },
  });
  if (!pdi) {
    return { success: false, error: "PDI não encontrado" };
  }

  if (role !== "admin" && pdi.managerId !== userId) {
    return { success: false, error: "Apenas o gestor que criou este PDI pode editá-lo" };
  }

  if (pdi.status !== "draft" && pdi.status !== "scheduled") {
    return { success: false, error: "Apenas PDIs em rascunho ou agendados podem ser editados" };
  }

  if (!data.period.trim()) {
    return { success: false, error: "Período é obrigatório" };
  }

  if (!data.conductedAt) {
    return { success: false, error: "Data de realização é obrigatória" };
  }

  if (data.activate && data.goals.length === 0) {
    return { success: false, error: "Adicione pelo menos uma meta para ativar o PDI" };
  }

  if (data.activate) {
    for (const goal of data.goals) {
      if (!goal.title.trim()) {
        return { success: false, error: "Todas as metas devem ter um título" };
      }
      if (!goal.competency.trim()) {
        return { success: false, error: "Todas as metas devem ter uma competência" };
      }
    }
  }

  // Determine which goals to keep, update, create, or delete
  const existingGoalIds = pdi.goals.map((g) => g.id);
  const incomingGoalIds = data.goals.filter((g) => g.id).map((g) => g.id as string);
  const goalsToDelete = existingGoalIds.filter((id) => !incomingGoalIds.includes(id));
  const goalsToUpdate = data.goals.filter((g) => g.id && existingGoalIds.includes(g.id));
  const goalsToCreate = data.goals.filter((g) => !g.id);

  // Execute all operations in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete removed goals
    if (goalsToDelete.length > 0) {
      await tx.pDIGoal.deleteMany({
        where: { id: { in: goalsToDelete } },
      });
    }

    // Update existing goals
    for (const goal of goalsToUpdate) {
      await tx.pDIGoal.update({
        where: { id: goal.id },
        data: {
          title: goal.title.trim(),
          description: goal.description.trim() || null,
          competency: goal.competency.trim(),
          dueDate: goal.dueDate ? new Date(goal.dueDate) : null,
        },
      });
    }

    // Create new goals
    if (goalsToCreate.length > 0) {
      await tx.pDIGoal.createMany({
        data: goalsToCreate
          .filter((g) => g.title.trim())
          .map((g) => ({
            pdiId: id,
            title: g.title.trim(),
            description: g.description.trim() || null,
            competency: g.competency.trim(),
            status: "pending" as const,
            dueDate: g.dueDate ? new Date(g.dueDate) : null,
          })),
      });
    }

    // Update PDI
    await tx.pDI.update({
      where: { id },
      data: {
        period: data.period.trim(),
        conductedAt: new Date(data.conductedAt),
        status: data.activate ? "active" : (pdi.status === "scheduled" ? "draft" : pdi.status),
      },
    });
  });

  revalidatePath("/pdis");
  revalidatePath(`/pdis/${id}`);
  return { success: true };
}

// ============================================================
// US-011: Evidence, Comments, Goal Status
// ============================================================

export async function addEvidence(
  goalId: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (!description.trim()) {
    return { success: false, error: "Descrição é obrigatória" };
  }

  // Find the goal and its PDI to check access
  const goal = await prisma.pDIGoal.findUnique({
    where: { id: goalId },
    include: { pdi: true },
  });

  if (!goal) {
    return { success: false, error: "Meta não encontrada" };
  }

  // Only the employee or the manager/admin can add evidence
  const pdi = goal.pdi;
  if (role !== "admin" && pdi.managerId !== userId && pdi.employeeId !== userId) {
    const hasAccess = await canAccessEmployee(userId, role, pdi.employeeId);
    if (!hasAccess) {
      return { success: false, error: "Acesso não autorizado" };
    }
  }

  await prisma.pDIEvidence.create({
    data: {
      goalId,
      description: description.trim(),
    },
  });

  revalidatePath(`/pdis/${pdi.id}`);
  return { success: true };
}

export async function addComment(
  pdiId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (!content.trim()) {
    return { success: false, error: "Conteúdo é obrigatório" };
  }

  const pdi = await prisma.pDI.findUnique({ where: { id: pdiId } });
  if (!pdi) {
    return { success: false, error: "PDI não encontrado" };
  }

  // Only employee, manager, or admin can comment
  if (role !== "admin" && pdi.managerId !== userId && pdi.employeeId !== userId) {
    const hasAccess = await canAccessEmployee(userId, role, pdi.employeeId);
    if (!hasAccess) {
      return { success: false, error: "Acesso não autorizado" };
    }
  }

  await prisma.pDIComment.create({
    data: {
      pdiId,
      authorId: userId,
      content: content.trim(),
    },
  });

  revalidatePath(`/pdis/${pdiId}`);
  return { success: true };
}

export async function updateGoalStatus(
  goalId: string,
  newStatus: "pending" | "in_progress" | "completed"
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const goal = await prisma.pDIGoal.findUnique({
    where: { id: goalId },
    include: { pdi: true },
  });

  if (!goal) {
    return { success: false, error: "Meta não encontrada" };
  }

  const pdi = goal.pdi;

  // Employee can change their own goal status
  if (pdi.employeeId === userId) {
    await prisma.pDIGoal.update({
      where: { id: goalId },
      data: { status: newStatus },
    });
    await checkAndCompletePDI(pdi.id, pdi.employeeId, goalId, newStatus);
    revalidatePath(`/pdis/${pdi.id}`);
    return { success: true };
  }

  // Manager who created the PDI or admin can also change status (approve/reject)
  if (role === "admin" || pdi.managerId === userId) {
    await prisma.pDIGoal.update({
      where: { id: goalId },
      data: { status: newStatus },
    });
    await checkAndCompletePDI(pdi.id, pdi.employeeId, goalId, newStatus);
    revalidatePath(`/pdis/${pdi.id}`);
    return { success: true };
  }

  return { success: false, error: "Acesso não autorizado" };
}

/**
 * After updating a goal status, check if ALL goals of the PDI are completed.
 * If so, mark the PDI as completed and recalculate the PDI schedule.
 */
async function checkAndCompletePDI(
  pdiId: string,
  employeeId: string,
  updatedGoalId: string,
  updatedGoalStatus: string
): Promise<void> {
  // Only check if the goal was just marked as completed
  if (updatedGoalStatus !== "completed") return;

  const allGoals = await prisma.pDIGoal.findMany({
    where: { pdiId },
    select: { id: true, status: true },
  });

  const allCompleted = allGoals.every(
    (g) => g.id === updatedGoalId ? true : g.status === "completed"
  );

  if (allCompleted) {
    await prisma.pDI.update({
      where: { id: pdiId },
      data: { status: "completed" },
    });
    await recalculatePDISchedule(employeeId);
  }
}
