"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateScheduledFeedbackEvents, removeScheduledFeedbackEvents } from "@/lib/schedule-utils";
import { createOnboardingFeedbacks, updateOnboardingFeedbacks, handleSectorTransfer } from "@/lib/sector-schedule-utils";

export type EmployeeListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  orgUnit: string | null;
  managerName: string | null;
};

export type EmployeeDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  evaluationMode: string;
  isActive: boolean;
  avatarUrl: string | null;
  admissionDate: Date | null;
  createdAt: Date;
  hierarchy: {
    id: string;
    managerId: string;
    organizationalUnitId: string;
    startDate: Date;
    endDate: Date | null;
  } | null;
};

export type HierarchyNode = {
  id: string;
  name: string;
  role: string;
  orgUnit: string | null;
  children: HierarchyNode[];
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function getEmployees(
  search: string = "",
  page: number = 1,
  pageSize: number = 10
): Promise<{
  employees: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const session = await requireAdmin();
  if (!session) {
    return { employees: [], total: 0, page: 1, pageSize: 10 };
  }

  const where = search.trim()
    ? {
        OR: [
          { name: { contains: search.trim(), mode: "insensitive" as const } },
          { email: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      }
    : {};

  const [employees, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employeeHierarchies: {
          where: { endDate: null },
          take: 1,
          include: {
            manager: { select: { name: true } },
            organizationalUnit: { select: { name: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    employees: employees.map((u) => {
      const activeHierarchy = u.employeeHierarchies[0] ?? null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        orgUnit: activeHierarchy?.organizationalUnit.name ?? null,
        managerName: activeHierarchy?.manager.name ?? null,
      };
    }),
    total,
    page,
    pageSize,
  };
}

export async function getEmployeeById(
  id: string
): Promise<EmployeeDetail | null> {
  const session = await requireAdmin();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      employeeHierarchies: {
        where: { endDate: null },
        take: 1,
      },
    },
  });

  if (!user) return null;

  const activeHierarchy = user.employeeHierarchies[0] ?? null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    evaluationMode: user.evaluationMode,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    admissionDate: user.admissionDate,
    createdAt: user.createdAt,
    hierarchy: activeHierarchy
      ? {
          id: activeHierarchy.id,
          managerId: activeHierarchy.managerId,
          organizationalUnitId: activeHierarchy.organizationalUnitId,
          startDate: activeHierarchy.startDate,
          endDate: activeHierarchy.endDate,
        }
      : null,
  };
}

export async function getOrgUnitsFlat(): Promise<
  { id: string; name: string }[]
> {
  const session = await requireAdmin();
  if (!session) return [];

  return prisma.organizationalUnit.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getManagerCandidates(
  orgUnitId: string | null,
  excludeUserId?: string
): Promise<{ id: string; name: string; email: string }[]> {
  const session = await requireAdmin();
  if (!session) return [];

  if (!orgUnitId) {
    // Show all managers/admins when no org unit selected
    return prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["admin", "manager"] },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  // Show users linked to the selected org unit + admins
  const usersInUnit = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      OR: [
        {
          employeeHierarchies: {
            some: {
              organizationalUnitId: orgUnitId,
              endDate: null,
            },
          },
        },
        { role: "admin" },
      ],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return usersInUnit;
}

export async function createEmployee(data: {
  name: string;
  email: string;
  role: string;
  evaluationMode?: string;
  password?: string;
  orgUnitId?: string;
  managerId?: string;
  admissionDate?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const trimmedName = data.name.trim();
  const trimmedEmail = data.email.trim().toLowerCase();

  if (!trimmedName) {
    return { success: false, error: "Nome é obrigatório" };
  }
  if (!trimmedEmail) {
    return { success: false, error: "E-mail é obrigatório" };
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({
    where: { email: trimmedEmail },
  });
  if (existing) {
    return { success: false, error: "Já existe um colaborador com este e-mail" };
  }

  // Validate role
  const validRoles = ["admin", "manager", "employee"];
  if (!validRoles.includes(data.role)) {
    return { success: false, error: "Papel inválido" };
  }

  // Validate evaluationMode
  const validEvaluationModes = ["pdi", "feedback"];
  const evaluationMode = data.evaluationMode ?? "feedback";
  if (!validEvaluationModes.includes(evaluationMode)) {
    return { success: false, error: "Modo de avaliação inválido" };
  }

  // Hash password if provided
  let hashedPassword: string | null = null;
  if (data.password) {
    const { hash } = await import("bcryptjs");
    hashedPassword = await hash(data.password, 10);
  }

  const user = await prisma.user.create({
    data: {
      name: trimmedName,
      email: trimmedEmail,
      role: data.role as "admin" | "manager" | "employee",
      evaluationMode: evaluationMode as "pdi" | "feedback",
      password: hashedPassword,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
    },
  });

  // Create hierarchy link if org unit and manager provided
  if (data.orgUnitId && data.managerId) {
    await prisma.employeeHierarchy.create({
      data: {
        employeeId: user.id,
        managerId: data.managerId,
        organizationalUnitId: data.orgUnitId,
      },
    });

    // Create onboarding feedbacks if admission date provided
    if (data.admissionDate) {
      await createOnboardingFeedbacks(
        user.id,
        new Date(data.admissionDate),
        data.managerId
      );
    }
  }

  revalidatePath("/colaboradores");
  return { success: true, id: user.id };
}

export async function updateEmployee(
  id: string,
  data: {
    name: string;
    email: string;
    role: string;
    evaluationMode?: string;
    orgUnitId?: string;
    managerId?: string;
    admissionDate?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const trimmedName = data.name.trim();
  const trimmedEmail = data.email.trim().toLowerCase();

  if (!trimmedName) {
    return { success: false, error: "Nome é obrigatório" };
  }
  if (!trimmedEmail) {
    return { success: false, error: "E-mail é obrigatório" };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return { success: false, error: "Colaborador não encontrado" };
  }

  // Check email uniqueness (excluding current user)
  const existing = await prisma.user.findUnique({
    where: { email: trimmedEmail },
  });
  if (existing && existing.id !== id) {
    return { success: false, error: "Já existe um colaborador com este e-mail" };
  }

  const validRoles = ["admin", "manager", "employee"];
  if (!validRoles.includes(data.role)) {
    return { success: false, error: "Papel inválido" };
  }

  // Validate evaluationMode
  const validEvaluationModes = ["pdi", "feedback"];
  const evaluationMode = data.evaluationMode ?? "feedback";
  if (!validEvaluationModes.includes(evaluationMode)) {
    return { success: false, error: "Modo de avaliação inválido" };
  }

  // Update user fields
  const newAdmissionDate = data.admissionDate ? new Date(data.admissionDate) : null;
  const admissionChanged =
    newAdmissionDate?.getTime() !== user.admissionDate?.getTime();

  await prisma.user.update({
    where: { id },
    data: {
      name: trimmedName,
      email: trimmedEmail,
      role: data.role as "admin" | "manager" | "employee",
      evaluationMode: evaluationMode as "pdi" | "feedback",
      admissionDate: newAdmissionDate,
    },
  });

  // Update hierarchy: close old, create new if changed
  if (data.orgUnitId && data.managerId) {
    const currentHierarchy = await prisma.employeeHierarchy.findFirst({
      where: { employeeId: id, endDate: null },
    });

    const needsUpdate =
      !currentHierarchy ||
      currentHierarchy.managerId !== data.managerId ||
      currentHierarchy.organizationalUnitId !== data.orgUnitId;

    if (needsUpdate) {
      // If organizational unit changed, handle sector transfer (cancel future scheduled events)
      if (currentHierarchy && currentHierarchy.organizationalUnitId !== data.orgUnitId) {
        await handleSectorTransfer(id, data.orgUnitId);
      }

      // Close current hierarchy
      if (currentHierarchy) {
        await prisma.employeeHierarchy.update({
          where: { id: currentHierarchy.id },
          data: { endDate: new Date() },
        });
      }
      // Create new hierarchy
      await prisma.employeeHierarchy.create({
        data: {
          employeeId: id,
          managerId: data.managerId,
          organizationalUnitId: data.orgUnitId,
        },
      });
    }
  } else {
    // If org unit or manager removed, close current hierarchy
    const currentHierarchy = await prisma.employeeHierarchy.findFirst({
      where: { employeeId: id, endDate: null },
    });
    if (currentHierarchy) {
      await prisma.employeeHierarchy.update({
        where: { id: currentHierarchy.id },
        data: { endDate: new Date() },
      });
    }
  }

  // Handle onboarding feedbacks when admission date changes
  if (admissionChanged && newAdmissionDate && data.managerId) {
    await updateOnboardingFeedbacks(id, newAdmissionDate, data.managerId);
  }

  revalidatePath("/colaboradores");
  revalidatePath(`/colaboradores/${id}`);
  return { success: true };
}

export async function deactivateEmployee(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return { success: false, error: "Colaborador não encontrado" };
  }

  if (!user.isActive) {
    return { success: false, error: "Colaborador já está desativado" };
  }

  // Soft delete: set isActive = false and close active hierarchy
  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  // Close any active hierarchy entries
  await prisma.employeeHierarchy.updateMany({
    where: { employeeId: id, endDate: null },
    data: { endDate: new Date() },
  });

  revalidatePath("/colaboradores");
  return { success: true };
}

export async function reactivateEmployee(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return { success: false, error: "Colaborador não encontrado" };
  }

  if (user.isActive) {
    return { success: false, error: "Colaborador já está ativo" };
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: true },
  });

  revalidatePath("/colaboradores");
  return { success: true };
}

// ============================================================
// US-012: Schedule management (PDI & Feedback frequency)
// ============================================================

export type EmployeeSchedules = {
  feedbackFrequency: number | null;
  feedbackNextDueDate: Date | null;
  feedbackScheduleId: string | null;
};

export async function getEmployeeSchedules(
  employeeId: string
): Promise<EmployeeSchedules> {
  const session = await requireAdmin();
  if (!session) {
    return {
      feedbackFrequency: null,
      feedbackNextDueDate: null,
      feedbackScheduleId: null,
    };
  }

  const feedbackSchedule = await prisma.feedbackSchedule.findFirst({
    where: { employeeId, isActive: true },
    orderBy: { nextDueDate: "asc" },
  });

  return {
    feedbackFrequency: feedbackSchedule?.frequencyMonths ?? null,
    feedbackNextDueDate: feedbackSchedule?.nextDueDate ?? null,
    feedbackScheduleId: feedbackSchedule?.id ?? null,
  };
}

function calculateNextDueDate(frequencyMonths: number): Date {
  const now = new Date();
  const next = new Date(now);
  next.setMonth(next.getMonth() + frequencyMonths);
  return next;
}

export async function saveEmployeeSchedules(
  employeeId: string,
  data: {
    feedbackFrequency: number | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const validFrequencies = [1, 2, 3, 6, 12];

  if (data.feedbackFrequency !== null && !validFrequencies.includes(data.feedbackFrequency)) {
    return { success: false, error: "Frequência de feedback inválida" };
  }

  // Find the employee's current manager
  const hierarchy = await prisma.employeeHierarchy.findFirst({
    where: { employeeId, endDate: null },
  });

  if (!hierarchy) {
    return { success: false, error: "Colaborador não possui gestor vinculado. Configure a hierarquia antes do agendamento." };
  }

  const managerId = hierarchy.managerId;

  // Handle Feedback schedule
  const existingFeedbackSchedule = await prisma.feedbackSchedule.findFirst({
    where: { employeeId, isActive: true },
  });

  if (data.feedbackFrequency !== null) {
    if (existingFeedbackSchedule) {
      await prisma.feedbackSchedule.update({
        where: { id: existingFeedbackSchedule.id },
        data: {
          frequencyMonths: data.feedbackFrequency,
          managerId,
          nextDueDate:
            existingFeedbackSchedule.frequencyMonths !== data.feedbackFrequency
              ? calculateNextDueDate(data.feedbackFrequency)
              : existingFeedbackSchedule.nextDueDate,
        },
      });
    } else {
      await prisma.feedbackSchedule.create({
        data: {
          employeeId,
          managerId,
          frequencyMonths: data.feedbackFrequency,
          nextDueDate: calculateNextDueDate(data.feedbackFrequency),
        },
      });
    }
    // Generate scheduled Feedback events for the next 12 months
    await generateScheduledFeedbackEvents(employeeId, data.feedbackFrequency, managerId);
  } else if (existingFeedbackSchedule) {
    await prisma.feedbackSchedule.update({
      where: { id: existingFeedbackSchedule.id },
      data: { isActive: false },
    });
    // Remove future scheduled Feedback events
    await removeScheduledFeedbackEvents(employeeId);
  }

  revalidatePath(`/colaboradores/${employeeId}`);
  return { success: true };
}

export async function getEmployeeHierarchyTree(
  employeeId: string
): Promise<HierarchyNode[]> {
  const session = await requireAdmin();
  if (!session) return [];

  // Build upward chain: employee → manager → manager's manager → ...
  const chain: {
    id: string;
    name: string;
    role: string;
    orgUnit: string | null;
  }[] = [];

  let currentId: string | null = employeeId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const foundUser = await prisma.user.findUnique({
      where: { id: currentId },
      include: {
        employeeHierarchies: {
          where: { endDate: null },
          take: 1,
          include: {
            organizationalUnit: { select: { name: true } },
          },
        },
      },
    });

    if (!foundUser) break;

    const activeHierarchy = foundUser.employeeHierarchies[0] as
      | { managerId: string; organizationalUnit: { name: string } }
      | undefined;
    chain.push({
      id: foundUser.id,
      name: foundUser.name,
      role: foundUser.role,
      orgUnit: activeHierarchy?.organizationalUnit.name ?? null,
    });

    currentId = activeHierarchy?.managerId ?? null;
  }

  // Build nested tree from top (highest manager) down to the employee
  chain.reverse();

  if (chain.length === 0) return [];

  const root: HierarchyNode = { ...chain[0], children: [] };
  let current = root;
  for (let i = 1; i < chain.length; i++) {
    const child: HierarchyNode = { ...chain[i], children: [] };
    current.children.push(child);
    current = child;
  }

  // Add direct reports of the target employee
  const directReports = await prisma.employeeHierarchy.findMany({
    where: { managerId: employeeId, endDate: null },
    include: {
      employee: { select: { id: true, name: true, role: true } },
      organizationalUnit: { select: { name: true } },
    },
  });

  for (const report of directReports) {
    current.children.push({
      id: report.employee.id,
      name: report.employee.name,
      role: report.employee.role,
      orgUnit: report.organizationalUnit.name,
      children: [],
    });
  }

  return [root];
}

// ============================================================
// US-010: Sector schedule info for individual override toggle
// ============================================================

export type SectorScheduleInfo = {
  pdi: { frequencyMonths: number; startDate: Date } | null;
  feedback: { frequencyMonths: number; startDate: Date } | null;
};

export async function getEmployeeSectorSchedule(
  employeeId: string
): Promise<SectorScheduleInfo> {
  const session = await requireAdmin();
  if (!session) return { pdi: null, feedback: null };

  const hierarchy = await prisma.employeeHierarchy.findFirst({
    where: { employeeId, endDate: null },
    select: { organizationalUnitId: true },
  });

  if (!hierarchy) return { pdi: null, feedback: null };

  const schedules = await prisma.sectorSchedule.findMany({
    where: {
      organizationalUnitId: hierarchy.organizationalUnitId,
      isActive: true,
    },
  });

  const pdi = schedules.find((s) => s.type === "pdi");
  const feedback = schedules.find((s) => s.type === "feedback");

  return {
    pdi: pdi ? { frequencyMonths: pdi.frequencyMonths, startDate: pdi.startDate } : null,
    feedback: feedback ? { frequencyMonths: feedback.frequencyMonths, startDate: feedback.startDate } : null,
  };
}

export async function toggleIndividualSchedule(
  employeeId: string,
  useIndividual: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await requireAdmin();
  if (!session) {
    return { success: false, error: "Acesso não autorizado" };
  }

  if (!useIndividual) {
    // Deactivate individual feedback schedules
    await prisma.feedbackSchedule.updateMany({
      where: { employeeId, isActive: true },
      data: { isActive: false },
    });
    // Remove future scheduled feedback events
    await removeScheduledFeedbackEvents(employeeId);
  }
  // When toggling ON, user will use the existing save flow to configure

  revalidatePath(`/colaboradores/${employeeId}`);
  return { success: true };
}
