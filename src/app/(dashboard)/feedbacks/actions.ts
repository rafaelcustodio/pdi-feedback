"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getAccessibleEmployeeIds,
  getFeedbackAccessFilter,
  canAccessEmployee,
} from "@/lib/access-control";

export type FeedbackListItem = {
  id: string;
  period: string;
  status: string;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
  employeeName: string;
  managerName: string;
};

export type FeedbackDetail = {
  id: string;
  employeeId: string;
  managerId: string;
  period: string;
  content: string | null;
  strengths: string | null;
  improvements: string | null;
  rating: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  employeeName: string;
  managerName: string;
};

export type SubordinateOption = {
  id: string;
  name: string;
  email: string;
};

export async function getFeedbacks(
  search: string = "",
  page: number = 1,
  pageSize: number = 10
): Promise<{
  feedbacks: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { feedbacks: [], total: 0, page: 1, pageSize: 10 };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const accessFilter = await getFeedbackAccessFilter(userId, role);

  // For employees, also show submitted feedbacks where they are the employee
  // (they can see feedbacks about themselves once submitted)
  let whereClause: Record<string, unknown>;
  if (role === "employee") {
    whereClause = {
      employeeId: userId,
      OR: [
        { status: "submitted" },
        { managerId: userId },
      ],
    };
  } else {
    whereClause = { ...accessFilter };
  }

  if (search.trim()) {
    whereClause = {
      ...whereClause,
      OR: [
        { employee: { name: { contains: search.trim(), mode: "insensitive" as const } } },
        { period: { contains: search.trim(), mode: "insensitive" as const } },
      ],
    };
  }

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employee: { select: { name: true } },
        manager: { select: { name: true } },
      },
    }),
    prisma.feedback.count({ where: whereClause }),
  ]);

  return {
    feedbacks: feedbacks.map((f) => ({
      id: f.id,
      period: f.period,
      status: f.status,
      rating: f.rating,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      employeeName: f.employee.name,
      managerName: f.manager.name,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getFeedbackById(
  id: string
): Promise<FeedbackDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      employee: { select: { name: true } },
      manager: { select: { name: true } },
    },
  });

  if (!feedback) return null;

  // Access check: admin can see all, manager can see subordinates, employee can see own submitted
  if (role === "admin") {
    // ok
  } else if (feedback.managerId === userId) {
    // Manager who created this feedback can always see it
  } else if (feedback.employeeId === userId && feedback.status === "submitted") {
    // Employee can see their own submitted feedback
  } else {
    const hasAccess = await canAccessEmployee(userId, role, feedback.employeeId);
    if (!hasAccess) return null;
  }

  return {
    id: feedback.id,
    employeeId: feedback.employeeId,
    managerId: feedback.managerId,
    period: feedback.period,
    content: feedback.content,
    strengths: feedback.strengths,
    improvements: feedback.improvements,
    rating: feedback.rating,
    status: feedback.status,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
    employeeName: feedback.employee.name,
    managerName: feedback.manager.name,
  };
}

export async function getSubordinatesForFeedback(): Promise<SubordinateOption[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Only managers and admins can create feedback
  if (role === "employee") return [];

  const accessible = await getAccessibleEmployeeIds(userId, role);

  if (accessible === "all") {
    return prisma.user.findMany({
      where: { isActive: true, id: { not: userId } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  // Exclude self from subordinate list
  const subordinateIds = accessible.filter((id) => id !== userId);
  if (subordinateIds.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: subordinateIds }, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function createFeedback(data: {
  employeeId: string;
  period: string;
  content: string;
  strengths: string;
  improvements: string;
  rating: number;
  submit?: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Only managers and admins can create feedback
  if (role === "employee") {
    return { success: false, error: "Apenas gestores podem criar feedbacks" };
  }

  // Validate that the manager can access this employee
  const hasAccess = await canAccessEmployee(userId, role, data.employeeId);
  if (!hasAccess) {
    return { success: false, error: "Você não tem acesso a este colaborador" };
  }

  if (!data.period.trim()) {
    return { success: false, error: "Período é obrigatório" };
  }

  // If submitting, validate all required fields
  if (data.submit) {
    if (!data.content.trim()) {
      return { success: false, error: "Conteúdo geral é obrigatório para submissão" };
    }
    if (!data.strengths.trim()) {
      return { success: false, error: "Pontos fortes é obrigatório para submissão" };
    }
    if (!data.improvements.trim()) {
      return { success: false, error: "Pontos de melhoria é obrigatório para submissão" };
    }
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      return { success: false, error: "Avaliação (1-5) é obrigatória para submissão" };
    }
  }

  const feedback = await prisma.feedback.create({
    data: {
      employeeId: data.employeeId,
      managerId: userId,
      period: data.period.trim(),
      content: data.content.trim() || null,
      strengths: data.strengths.trim() || null,
      improvements: data.improvements.trim() || null,
      rating: data.rating || null,
      status: data.submit ? "submitted" : "draft",
    },
  });

  revalidatePath("/feedbacks");
  return { success: true, id: feedback.id };
}

export async function updateFeedback(
  id: string,
  data: {
    period: string;
    content: string;
    strengths: string;
    improvements: string;
    rating: number;
    submit?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (!feedback) {
    return { success: false, error: "Feedback não encontrado" };
  }

  // Only the manager who created the feedback (or admin) can edit
  if (role !== "admin" && feedback.managerId !== userId) {
    return { success: false, error: "Apenas o gestor que criou este feedback pode editá-lo" };
  }

  // Can only edit drafts
  if (feedback.status !== "draft") {
    return { success: false, error: "Apenas feedbacks em rascunho podem ser editados" };
  }

  if (!data.period.trim()) {
    return { success: false, error: "Período é obrigatório" };
  }

  // If submitting, validate all required fields
  if (data.submit) {
    if (!data.content.trim()) {
      return { success: false, error: "Conteúdo geral é obrigatório para submissão" };
    }
    if (!data.strengths.trim()) {
      return { success: false, error: "Pontos fortes é obrigatório para submissão" };
    }
    if (!data.improvements.trim()) {
      return { success: false, error: "Pontos de melhoria é obrigatório para submissão" };
    }
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      return { success: false, error: "Avaliação (1-5) é obrigatória para submissão" };
    }
  }

  await prisma.feedback.update({
    where: { id },
    data: {
      period: data.period.trim(),
      content: data.content.trim() || null,
      strengths: data.strengths.trim() || null,
      improvements: data.improvements.trim() || null,
      rating: data.rating || null,
      status: data.submit ? "submitted" : "draft",
    },
  });

  revalidatePath("/feedbacks");
  revalidatePath(`/feedbacks/${id}`);
  return { success: true };
}
