"use server";

import { getEffectiveAuth } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getAccessibleEmployeeIds,
  getPDIAccessFilter,
  canAccessEmployee,
} from "@/lib/access-control";
import {
  getUserToken,
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/microsoft-graph";
import type { GraphCalendarEvent } from "@/lib/microsoft-graph";
import {
  createCalendarEventForFollowUp,
  syncCalendarEventStatus,
} from "@/lib/calendar-event-utils";
export type PDIListItem = {
  id: string;
  status: string;
  conductedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employeeName: string;
  managerName: string;
  goalCount: number;
  completedGoalCount: number;
};

export type EvidenceDetail = {
  id: string;
  authorId: string | null;
  description: string;
  fileUrl: string | null;
  createdAt: Date;
};

export type GoalDetail = {
  id: string;
  developmentObjective: string;
  actions: string | null;
  status: string;
  dueDate: Date | null;
  startDate: Date | null;
  expectedResults: string | null;
  responsibleId: string | null;
  completedAt: Date | null;
  successMetrics: string | null;
  achievedResults: string | null;
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
  status: string;
  conductedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employeeName: string;
  managerName: string;
  goals: GoalDetail[];
  comments: CommentDetail[];
  followUps: FollowUpDetail[];
};

export type SubordinateOption = {
  id: string;
  name: string;
  email: string;
};

export type GoalInput = {
  id?: string;
  developmentObjective: string;
  actions: string;
  status: string;
  dueDate: string;
  startDate?: string;
  expectedResults?: string;
  responsibleId?: string;
  completedAt?: string;
  successMetrics?: string;
  achievedResults?: string;
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
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { pdis: [], total: 0, page: 1, pageSize: 10 };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const accessFilter = await getPDIAccessFilter(userId, role);

  let whereClause: Record<string, unknown> = { ...accessFilter };

  const andConditions: Record<string, unknown>[] = [];

  // Only show PDIs for employees with evaluationMode='pdi'
  andConditions.push({ employee: { evaluationMode: "pdi" } });

  // Default to active-only in continuous model (unless explicitly filtering)
  if (statusFilter.trim()) {
    andConditions.push({ status: statusFilter.trim() });
  } else {
    andConditions.push({ status: "active" });
  }

  if (search.trim()) {
    andConditions.push({
      OR: [
        { employee: { name: { contains: search.trim(), mode: "insensitive" as const } } },
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
      orderBy: [{ conductedAt: "desc" }, { createdAt: "desc" }],
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
      status: p.status,
      conductedAt: p.conductedAt,
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
  const session = await getEffectiveAuth();
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
      followUps: {
        orderBy: { scheduledAt: "asc" },
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
    status: pdi.status,
    conductedAt: pdi.conductedAt,
    createdAt: pdi.createdAt,
    updatedAt: pdi.updatedAt,
    employeeName: pdi.employee.name,
    managerName: pdi.manager.name,
    goals: pdi.goals.map((g) => ({
      id: g.id,
      developmentObjective: g.developmentObjective,
      actions: g.actions,
      status: g.status,
      dueDate: g.dueDate,
      startDate: g.startDate,
      expectedResults: g.expectedResults,
      responsibleId: g.responsibleId,
      completedAt: g.completedAt,
      successMetrics: g.successMetrics,
      achievedResults: g.achievedResults,
      createdAt: g.createdAt,
      evidences: g.evidences.map((e) => ({
        id: e.id,
        authorId: e.authorId,
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
    followUps: (pdi.followUps ?? []).map((f: FollowUpDetail) => ({
      id: f.id,
      pdiId: f.pdiId,
      scheduledAt: f.scheduledAt,
      conductedAt: f.conductedAt,
      notes: f.notes,
      status: f.status,
      createdAt: f.createdAt,
    })),
  };
}

export async function getSubordinatesForPDI(): Promise<SubordinateOption[]> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role === "employee") return [];

  const accessible = await getAccessibleEmployeeIds(userId, role);

  if (accessible === "all") {
    return prisma.user.findMany({
      where: { isActive: true, id: { not: userId }, evaluationMode: "pdi" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  const subordinateIds = accessible.filter((id) => id !== userId);
  if (subordinateIds.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: subordinateIds }, isActive: true, evaluationMode: "pdi" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Get or create the active PDI for an employee (continuous model).
 * In the continuous model, each employee has at most one active PDI.
 * If none exists, one is created automatically.
 */
export async function getOrCreatePDI(
  employeeId: string
): Promise<{ success: boolean; error?: string; pdi?: PDIDetail }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const hasAccess = await canAccessEmployee(userId, role, employeeId);
  if (!hasAccess) {
    return { success: false, error: "Você não tem acesso a este colaborador" };
  }

  const pdiInclude = {
    employee: { select: { name: true } },
    manager: { select: { name: true } },
    goals: {
      orderBy: { createdAt: "asc" as const },
      include: { evidences: { orderBy: { createdAt: "desc" as const } } },
    },
    comments: {
      orderBy: { createdAt: "asc" as const },
      include: { author: { select: { name: true } } },
    },
    followUps: {
      orderBy: { scheduledAt: "asc" as const },
    },
  };

  // Find existing active PDI
  let pdi = await prisma.pDI.findFirst({
    where: { employeeId, status: "active" },
    include: pdiInclude,
  });

  // If none exists, create one
  if (!pdi) {
    if (role === "employee") {
      return { success: false, error: "Apenas gestores podem criar PDIs" };
    }

    // Get manager for this employee from hierarchy
    const hierarchy = await prisma.employeeHierarchy.findFirst({
      where: { employeeId, endDate: null },
    });
    const managerId = hierarchy?.managerId ?? userId;

    try {
      const created = await prisma.pDI.create({
        data: {
          employeeId,
          managerId,
          status: "active",
        },
        include: pdiInclude,
      });
      pdi = created;
      revalidatePath("/pdis");
    } catch (error: unknown) {
      // P2002 = unique constraint violation (race condition: another request created the PDI first)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        pdi = await prisma.pDI.findFirst({
          where: { employeeId, status: "active" },
          include: pdiInclude,
        });
        if (!pdi) {
          return { success: false, error: "Erro ao criar PDI. Tente novamente." };
        }
      } else {
        throw error;
      }
    }
  }

  return {
    success: true,
    pdi: {
      id: pdi.id,
      employeeId: pdi.employeeId,
      managerId: pdi.managerId,
      status: pdi.status,
      conductedAt: pdi.conductedAt,
      createdAt: pdi.createdAt,
      updatedAt: pdi.updatedAt,
      employeeName: pdi.employee.name,
      managerName: pdi.manager.name,
      goals: pdi.goals.map((g) => ({
        id: g.id,
        developmentObjective: g.developmentObjective,
        actions: g.actions,
        status: g.status,
        dueDate: g.dueDate,
        startDate: g.startDate,
        expectedResults: g.expectedResults,
        responsibleId: g.responsibleId,
        completedAt: g.completedAt,
        successMetrics: g.successMetrics,
        achievedResults: g.achievedResults,
        createdAt: g.createdAt,
        evidences: g.evidences.map((e) => ({
          id: e.id,
          authorId: e.authorId,
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
      followUps: (pdi.followUps ?? []).map((f: FollowUpDetail) => ({
        id: f.id,
        pdiId: f.pdiId,
        scheduledAt: f.scheduledAt,
        conductedAt: f.conductedAt,
        notes: f.notes,
        status: f.status,
        createdAt: f.createdAt,
      })),
    },
  };
}

/**
 * Add a single goal to an existing PDI (continuous model).
 */
export async function addGoal(
  pdiId: string,
  data: GoalInput
): Promise<{ success: boolean; error?: string; goalId?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const pdi = await prisma.pDI.findUnique({ where: { id: pdiId } });
  if (!pdi) {
    return { success: false, error: "PDI não encontrado" };
  }

  if (pdi.status === "cancelled") {
    return { success: false, error: "Não é possível adicionar metas a PDIs cancelados" };
  }

  if (role !== "admin" && pdi.managerId !== userId) {
    return { success: false, error: "Apenas o gestor pode adicionar metas" };
  }

  if (!data.developmentObjective.trim()) {
    return { success: false, error: "Objetivo de desenvolvimento é obrigatório" };
  }

  // Validate goal-level constraints
  if (data.completedAt && data.status !== "completed") {
    return { success: false, error: "Término só pode ser preenchido quando status é 'Concluída'" };
  }
  if (data.achievedResults && data.status !== "completed") {
    return { success: false, error: "Resultados Obtidos só pode ser preenchido quando status é 'Concluída'" };
  }
  if (data.responsibleId && data.responsibleId !== pdi.employeeId && data.responsibleId !== userId) {
    return { success: false, error: "Responsável deve ser o colaborador ou o gestor do PDI" };
  }

  const goal = await prisma.pDIGoal.create({
    data: {
      pdiId,
      developmentObjective: data.developmentObjective.trim(),
      actions: data.actions?.trim() || null,
      status: (data.status as "pending" | "in_progress" | "completed") || "pending",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      expectedResults: data.expectedResults?.trim() || null,
      responsibleId: data.responsibleId || null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      successMetrics: data.successMetrics?.trim() || null,
      achievedResults: data.achievedResults?.trim() || null,
    },
  });

  revalidatePath(`/pdis/${pdiId}`);
  revalidatePath("/pdis");
  return { success: true, goalId: goal.id };
}

export async function updatePDI(
  id: string,
  data: {
    conductedAt?: string;
    goals: GoalInput[];
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
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

  if (pdi.status === "cancelled") {
    return { success: false, error: "PDIs cancelados não podem ser editados" };
  }

  // Validate goal-level constraints
  for (const goal of data.goals) {
    if (goal.completedAt && goal.status !== "completed") {
      return { success: false, error: "Término só pode ser preenchido quando status é 'Concluída'" };
    }
    if (goal.achievedResults && goal.status !== "completed") {
      return { success: false, error: "Resultados Obtidos só pode ser preenchido quando status é 'Concluída'" };
    }
    if (goal.responsibleId && goal.responsibleId !== pdi.employeeId && goal.responsibleId !== userId) {
      return { success: false, error: "Responsável deve ser o colaborador ou o gestor do PDI" };
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
          developmentObjective: goal.developmentObjective.trim(),
          actions: goal.actions.trim() || null,
          dueDate: goal.dueDate ? new Date(goal.dueDate) : null,
          startDate: goal.startDate ? new Date(goal.startDate) : null,
          expectedResults: goal.expectedResults?.trim() || null,
          responsibleId: goal.responsibleId || null,
          completedAt: goal.completedAt ? new Date(goal.completedAt) : null,
          successMetrics: goal.successMetrics?.trim() || null,
          achievedResults: goal.achievedResults?.trim() || null,
        },
      });
    }

    // Create new goals
    if (goalsToCreate.length > 0) {
      await tx.pDIGoal.createMany({
        data: goalsToCreate
          .filter((g) => g.developmentObjective.trim())
          .map((g) => ({
            pdiId: id,
            developmentObjective: g.developmentObjective.trim(),
            actions: g.actions.trim() || null,
            status: "pending" as const,
            dueDate: g.dueDate ? new Date(g.dueDate) : null,
            startDate: g.startDate ? new Date(g.startDate) : null,
            expectedResults: g.expectedResults?.trim() || null,
            responsibleId: g.responsibleId || null,
            completedAt: g.completedAt ? new Date(g.completedAt) : null,
            successMetrics: g.successMetrics?.trim() || null,
            achievedResults: g.achievedResults?.trim() || null,
          })),
      });
    }

    // Update PDI
    await tx.pDI.update({
      where: { id },
      data: {
        conductedAt: data.conductedAt ? new Date(data.conductedAt) : null,
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
  const session = await getEffectiveAuth();
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
      authorId: userId,
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
  const session = await getEffectiveAuth();
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

  // Verify user still exists in DB (JWT may carry stale userId after db reset)
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!userExists) {
    return { success: false, error: "Sessão inválida. Faça logout e login novamente." };
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
  const session = await getEffectiveAuth();
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
    revalidatePath(`/pdis/${pdi.id}`);
    return { success: true };
  }

  // Manager who created the PDI or admin can also change status (approve/reject)
  if (role === "admin" || pdi.managerId === userId) {
    await prisma.pDIGoal.update({
      where: { id: goalId },
      data: { status: newStatus },
    });
    revalidatePath(`/pdis/${pdi.id}`);
    return { success: true };
  }

  return { success: false, error: "Acesso não autorizado" };
}


export async function updateGoal(
  goalId: string,
  data: {
    developmentObjective: string;
    actions?: string;
    dueDate?: string;
    startDate?: string;
    expectedResults?: string;
    responsibleId?: string;
    completedAt?: string;
    successMetrics?: string;
    achievedResults?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (!data.developmentObjective.trim()) {
    return { success: false, error: "Objetivo de desenvolvimento é obrigatório" };
  }

  const goal = await prisma.pDIGoal.findUnique({
    where: { id: goalId },
    include: { pdi: true },
  });

  if (!goal) {
    return { success: false, error: "Meta não encontrada" };
  }

  if (role !== "admin" && goal.pdi.managerId !== userId) {
    return { success: false, error: "Apenas o gestor pode editar metas" };
  }

  // Validate completedAt/achievedResults only allowed when completed
  const effectiveStatus = goal.status;
  if (data.completedAt && effectiveStatus !== "completed") {
    return { success: false, error: "Término só pode ser preenchido quando status é 'Concluída'" };
  }
  if (data.achievedResults && effectiveStatus !== "completed") {
    return { success: false, error: "Resultados Obtidos só pode ser preenchido quando status é 'Concluída'" };
  }

  // Validate responsibleId
  if (data.responsibleId && data.responsibleId !== goal.pdi.employeeId && data.responsibleId !== goal.pdi.managerId) {
    return { success: false, error: "Responsável deve ser o colaborador ou o gestor do PDI" };
  }

  await prisma.pDIGoal.update({
    where: { id: goalId },
    data: {
      developmentObjective: data.developmentObjective.trim(),
      actions: data.actions?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      expectedResults: data.expectedResults?.trim() || null,
      responsibleId: data.responsibleId || null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
      successMetrics: data.successMetrics?.trim() || null,
      achievedResults: data.achievedResults?.trim() || null,
    },
  });

  revalidatePath(`/pdis/${goal.pdi.id}`);
  return { success: true };
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;

  if (!content.trim()) {
    return { success: false, error: "Conteúdo é obrigatório" };
  }

  const comment = await prisma.pDIComment.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    return { success: false, error: "Comentário não encontrado" };
  }

  if (comment.authorId !== userId) {
    return { success: false, error: "Você só pode editar seus próprios comentários" };
  }

  await prisma.pDIComment.update({
    where: { id: commentId },
    data: { content: content.trim() },
  });

  revalidatePath(`/pdis/${comment.pdiId}`);
  return { success: true };
}

export async function updateEvidence(
  evidenceId: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;

  if (!description.trim()) {
    return { success: false, error: "Descrição é obrigatória" };
  }

  const evidence = await prisma.pDIEvidence.findUnique({
    where: { id: evidenceId },
    include: { goal: { include: { pdi: true } } },
  });

  if (!evidence) {
    return { success: false, error: "Evidência não encontrada" };
  }

  if (!evidence.authorId || evidence.authorId !== userId) {
    return { success: false, error: "Você só pode editar suas próprias evidências" };
  }

  await prisma.pDIEvidence.update({
    where: { id: evidenceId },
    data: { description: description.trim() },
  });

  revalidatePath(`/pdis/${evidence.goal.pdi.id}`);
  return { success: true };
}

// ============================================================
// PDI Follow-Ups (US-014)
// ============================================================

export type FollowUpDetail = {
  id: string;
  pdiId: string;
  scheduledAt: Date;
  conductedAt: Date | null;
  notes: string | null;
  status: string;
  createdAt: Date;
};

export async function getFollowUps(
  pdiId: string
): Promise<{ success: boolean; error?: string; followUps?: FollowUpDetail[] }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const pdi = await prisma.pDI.findUnique({ where: { id: pdiId } });
  if (!pdi) return { success: false, error: "PDI não encontrado" };

  // Check access
  if (role !== "admin" && pdi.managerId !== userId && pdi.employeeId !== userId) {
    const hasAccess = await canAccessEmployee(userId, role, pdi.employeeId);
    if (!hasAccess) return { success: false, error: "Acesso não autorizado" };
  }

  const followUps = await prisma.pDIFollowUp.findMany({
    where: { pdiId },
    orderBy: { scheduledAt: "asc" },
  });

  return {
    success: true,
    followUps: followUps.map((f: FollowUpDetail) => ({
      id: f.id,
      pdiId: f.pdiId,
      scheduledAt: f.scheduledAt,
      conductedAt: f.conductedAt,
      notes: f.notes,
      status: f.status,
      createdAt: f.createdAt,
    })),
  };
}

export async function scheduleFollowUp(
  pdiId: string,
  scheduledAt: string,
  scheduledTime: string = "09:00",
  roomEmail?: string,
  roomDisplayName?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const pdi = await prisma.pDI.findUnique({ where: { id: pdiId } });
  if (!pdi) return { success: false, error: "PDI não encontrado" };

  // Only manager or admin can schedule follow-ups
  if (role !== "admin" && pdi.managerId !== userId) {
    return { success: false, error: "Apenas o gestor ou admin pode agendar acompanhamentos" };
  }

  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) {
    return { success: false, error: "Data inválida" };
  }

  const followUp = await prisma.pDIFollowUp.create({
    data: {
      pdiId,
      scheduledAt: date,
      status: "scheduled",
    },
  });

  // Create Outlook calendar events for manager and employee
  const employee = await prisma.user.findUnique({
    where: { id: pdi.employeeId },
    select: { name: true, email: true },
  });

  if (employee) {
    const startDateTime = `${scheduledAt}T${scheduledTime}:00`;
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const endHours = hours + 1;
    const endDateTime = `${scheduledAt}T${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

    const calendarEvent: GraphCalendarEvent = {
      subject: `Acompanhamento PDI — ${employee.name}`,
      start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
      body: {
        contentType: "text",
        content: `Acompanhamento de PDI agendado pelo sistema. Acesse: ${process.env.NEXTAUTH_URL}/pdis/${pdiId}`,
      },
      attendees: [
        { emailAddress: { address: employee.email, name: employee.name }, type: "required" },
      ],
    };

    if (roomEmail && roomDisplayName) {
      calendarEvent.attendees.push({
        emailAddress: { address: roomEmail, name: roomDisplayName },
        type: "resource",
      });
      calendarEvent.location = {
        displayName: roomDisplayName,
        locationEmailAddress: roomEmail,
      };
    }

    const [managerToken, employeeToken] = await Promise.allSettled([
      getUserToken(userId),
      getUserToken(pdi.employeeId),
    ]);

    const managerAccessToken = managerToken.status === "fulfilled" ? managerToken.value : null;
    const employeeAccessToken = employeeToken.status === "fulfilled" ? employeeToken.value : null;

    const eventPromises: Promise<string | null>[] = [];
    if (managerAccessToken) eventPromises.push(createCalendarEvent(managerAccessToken, calendarEvent));
    if (employeeAccessToken) eventPromises.push(createCalendarEvent(employeeAccessToken, calendarEvent));

    const results = await Promise.allSettled(eventPromises);

    // Save manager's outlookEventId if available
    let savedOutlookId: string | null = null;
    if (managerAccessToken && results.length > 0) {
      const managerResult = results[0];
      if (managerResult.status === "fulfilled" && managerResult.value) {
        savedOutlookId = managerResult.value;
        await prisma.pDIFollowUp.update({
          where: { id: followUp.id },
          data: { outlookEventId: savedOutlookId },
        });
      }
    }

    // Create CalendarEvent
    await createCalendarEventForFollowUp({
      pdiFollowUpId: followUp.id,
      employeeId: pdi.employeeId,
      managerId: userId,
      employeeName: employee.name,
      scheduledAt: date,
      roomEmail: roomEmail ?? undefined,
      roomDisplayName: roomDisplayName ?? undefined,
      outlookEventId: savedOutlookId ?? undefined,
    });
  } else {
    // No employee found — still create CalendarEvent
    await createCalendarEventForFollowUp({
      pdiFollowUpId: followUp.id,
      employeeId: pdi.employeeId,
      managerId: userId,
      employeeName: "",
      scheduledAt: date,
    });
  }

  revalidatePath(`/pdis/${pdiId}`);
  return { success: true, id: followUp.id };
}

export async function completeFollowUp(
  followUpId: string,
  notes: string,
  conductedAt: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const followUp = await prisma.pDIFollowUp.findUnique({
    where: { id: followUpId },
    include: { pdi: true },
  });

  if (!followUp) return { success: false, error: "Acompanhamento não encontrado" };

  if (role !== "admin" && followUp.pdi.managerId !== userId) {
    return { success: false, error: "Apenas o gestor ou admin pode completar acompanhamentos" };
  }

  if (followUp.status !== "scheduled") {
    return { success: false, error: "Apenas acompanhamentos agendados podem ser completados" };
  }

  const date = conductedAt ? new Date(conductedAt) : new Date();

  await prisma.pDIFollowUp.update({
    where: { id: followUpId },
    data: {
      status: "completed",
      conductedAt: date,
      notes: notes?.trim() || null,
    },
  });

  // Sync CalendarEvent status
  await syncCalendarEventStatus(followUpId, "pdi_followup", "completed");

  revalidatePath(`/pdis/${followUp.pdiId}`);
  return { success: true };
}

export async function cancelFollowUp(
  followUpId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const followUp = await prisma.pDIFollowUp.findUnique({
    where: { id: followUpId },
    include: { pdi: true },
  });

  if (!followUp) return { success: false, error: "Acompanhamento não encontrado" };

  if (role !== "admin" && followUp.pdi.managerId !== userId) {
    return { success: false, error: "Apenas o gestor ou admin pode cancelar acompanhamentos" };
  }

  if (followUp.status !== "scheduled") {
    return { success: false, error: "Apenas acompanhamentos agendados podem ser cancelados" };
  }

  await prisma.pDIFollowUp.update({
    where: { id: followUpId },
    data: { status: "cancelled" },
  });

  // Sync CalendarEvent status
  await syncCalendarEventStatus(followUpId, "pdi_followup", "cancelled");

  // Delete Outlook calendar event if one exists
  if (followUp.outlookEventId) {
    const token = await getUserToken(userId);
    if (token) {
      await deleteCalendarEvent(token, followUp.outlookEventId);
    }
  }

  revalidatePath(`/pdis/${followUp.pdiId}`);
  return { success: true };
}

export type SubordinateWithoutPDI = {
  id: string;
  name: string;
  email: string;
};

export async function getSubordinatesWithoutActivePDI(): Promise<SubordinateWithoutPDI[]> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role === "employee") return [];

  const accessible = await getAccessibleEmployeeIds(userId, role);

  const whereClause: Record<string, unknown> = {
    isActive: true,
    evaluationMode: "pdi",
    pdisAsEmployee: { none: { status: "active" } },
  };

  if (accessible === "all") {
    whereClause.id = { not: userId };
  } else {
    const subordinateIds = accessible.filter((id) => id !== userId);
    if (subordinateIds.length === 0) return [];
    whereClause.id = { in: subordinateIds };
  }

  return prisma.user.findMany({
    where: whereClause,
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function cancelPDI(
  pdiId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const pdi = await prisma.pDI.findUnique({ where: { id: pdiId } });
  if (!pdi) {
    return { success: false, error: "PDI não encontrado" };
  }

  if (role !== "admin" && pdi.managerId !== userId) {
    return { success: false, error: "Apenas o gestor responsável pode cancelar este PDI" };
  }

  if (pdi.status === "cancelled") {
    return { success: false, error: "PDI já está cancelado" };
  }

  await prisma.pDI.update({
    where: { id: pdiId },
    data: { status: "cancelled" },
  });

  revalidatePath(`/pdis/${pdiId}`);
  revalidatePath("/pdis");
  return { success: true };
}
