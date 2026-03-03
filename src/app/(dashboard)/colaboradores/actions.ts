"use server";

import { getEffectiveAuth } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { removeScheduledFeedbackEvents } from "@/lib/schedule-utils";
import { createOnboardingFeedbacks, updateOnboardingFeedbacks, handleSectorTransfer } from "@/lib/sector-schedule-utils";
import { canAccessEmployee } from "@/lib/access-control";

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[10]) !== check) return false;
  return true;
}

export type EmployeeListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  orgUnit: string | null;
  managerName: string | null;
  jobTitle: string | null;
  phone: string | null;
  evaluationMode: string;
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
  phone: string | null;
  cpf: string | null;
  birthDate: Date | null;
  jobTitle: string | null;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  personalEmail: string | null;
  rg: string | null;
  ethnicity: string | null;
  gender: string | null;
  maritalStatus: string | null;
  educationLevel: string | null;
  livesWithDescription: string | null;
  hasBradescoAccount: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  hasOtherEmployment: boolean | null;
  healthPlanOption: string | null;
  wantsTransportVoucher: boolean | null;
  contractType: string | null;
  shirtSize: string | null;
  hasChildren: boolean | null;
  childrenAges: string | null;
  hasIRDependents: boolean | null;
  hobbies: string[];
  socialNetworks: unknown;
  favoriteBookMovieGenres: string | null;
  favoriteBooks: string | null;
  favoriteMovies: string | null;
  favoriteMusic: string | null;
  admiredValues: string | null;
  foodAllergies: string | null;
  hasPets: string | null;
  participateInVideos: boolean | null;
  createdAt: Date;
  dependents: DependentData[];
  emergencyContacts: EmergencyContactData[];
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
  const session = await getEffectiveAuth();
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
        jobTitle: (u as Record<string, unknown>).jobTitle as string | null,
        phone: (u as Record<string, unknown>).phone as string | null,
        evaluationMode: ((u as Record<string, unknown>).evaluationMode as string) ?? "feedback",
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
      dependents: {
        select: { id: true, name: true, relationship: true, cpf: true },
        orderBy: { createdAt: "asc" },
      },
      emergencyContacts: {
        select: { id: true, name: true, phone: true, relationship: true },
        orderBy: { createdAt: "asc" },
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
    phone: user.phone ?? null,
    cpf: user.cpf ?? null,
    birthDate: user.birthDate ?? null,
    jobTitle: user.jobTitle ?? null,
    address: user.address ?? null,
    addressNumber: user.addressNumber ?? null,
    addressComplement: user.addressComplement ?? null,
    city: user.city ?? null,
    state: user.state ?? null,
    zipCode: user.zipCode ?? null,
    personalEmail: user.personalEmail ?? null,
    rg: user.rg ?? null,
    ethnicity: user.ethnicity ?? null,
    gender: user.gender ?? null,
    maritalStatus: user.maritalStatus ?? null,
    educationLevel: user.educationLevel ?? null,
    livesWithDescription: user.livesWithDescription ?? null,
    hasBradescoAccount: user.hasBradescoAccount ?? null,
    bankAgency: user.bankAgency ?? null,
    bankAccount: user.bankAccount ?? null,
    hasOtherEmployment: user.hasOtherEmployment ?? null,
    healthPlanOption: user.healthPlanOption ?? null,
    wantsTransportVoucher: user.wantsTransportVoucher ?? null,
    contractType: user.contractType ?? null,
    shirtSize: user.shirtSize ?? null,
    hasChildren: user.hasChildren ?? null,
    childrenAges: user.childrenAges ?? null,
    hasIRDependents: user.hasIRDependents ?? null,
    hobbies: user.hobbies ?? [],
    socialNetworks: user.socialNetworks ?? null,
    favoriteBookMovieGenres: user.favoriteBookMovieGenres ?? null,
    favoriteBooks: user.favoriteBooks ?? null,
    favoriteMovies: user.favoriteMovies ?? null,
    favoriteMusic: user.favoriteMusic ?? null,
    admiredValues: user.admiredValues ?? null,
    foodAllergies: user.foodAllergies ?? null,
    hasPets: user.hasPets ?? null,
    participateInVideos: user.participateInVideos ?? null,
    createdAt: user.createdAt,
    dependents: user.dependents,
    emergencyContacts: user.emergencyContacts,
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

  // Show all active managers/admins — a director in a parent OU must be selectable as manager for sub-units
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

export async function createEmployee(data: {
  name: string;
  email: string;
  role: string;
  evaluationMode?: string;
  password?: string;
  orgUnitId?: string;
  managerId?: string;
  admissionDate?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  jobTitle?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  personalEmail?: string;
  rg?: string;
  gender?: string;
  ethnicity?: string;
  maritalStatus?: string;
  educationLevel?: string;
  livesWithDescription?: string;
  hasBradescoAccount?: string;
  bankAgency?: string;
  bankAccount?: string;
  hasOtherEmployment?: boolean;
  healthPlanOption?: string;
  wantsTransportVoucher?: boolean;
  contractType?: string;
  shirtSize?: string;
  hasChildren?: boolean;
  childrenAges?: string;
  hasIRDependents?: boolean;
  hobbies?: string[];
  socialNetworks?: unknown;
  favoriteBookMovieGenres?: string;
  favoriteBooks?: string;
  favoriteMovies?: string;
  favoriteMusic?: string;
  admiredValues?: string;
  foodAllergies?: string;
  hasPets?: string;
  participateInVideos?: boolean;
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

  // Validate CPF if provided
  if (data.cpf) {
    const cpfDigits = data.cpf.replace(/\D/g, "");
    if (cpfDigits && !validateCPF(cpfDigits)) {
      return { success: false, error: "CPF inválido" };
    }
  }

  // Hash password if provided
  let hashedPassword: string | null = null;
  if (data.password) {
    const { hash } = await import("bcryptjs");
    hashedPassword = await hash(data.password, 10);
  }

  const cpfClean = data.cpf?.replace(/\D/g, "") || null;

  const user = await prisma.user.create({
    data: {
      name: trimmedName,
      email: trimmedEmail,
      role: data.role as "admin" | "manager" | "employee",
      evaluationMode: evaluationMode as "pdi" | "feedback",
      password: hashedPassword,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : null,
      phone: data.phone?.trim() || null,
      cpf: cpfClean || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      jobTitle: data.jobTitle?.trim() || null,
      address: data.address?.trim() || null,
      addressNumber: data.addressNumber?.trim() || null,
      addressComplement: data.addressComplement?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zipCode: data.zipCode?.replace(/\D/g, "") || null,
      personalEmail: data.personalEmail?.trim() || null,
      rg: data.rg?.trim() || null,
      gender: (data.gender as never) || null,
      ethnicity: (data.ethnicity as never) || null,
      maritalStatus: (data.maritalStatus as never) || null,
      educationLevel: (data.educationLevel as never) || null,
      livesWithDescription: data.livesWithDescription?.trim() || null,
      hasBradescoAccount: (data.hasBradescoAccount as never) || null,
      bankAgency: data.bankAgency?.trim() || null,
      bankAccount: data.bankAccount?.trim() || null,
      hasOtherEmployment: data.hasOtherEmployment ?? null,
      healthPlanOption: (data.healthPlanOption as never) || null,
      wantsTransportVoucher: data.wantsTransportVoucher ?? null,
      contractType: (data.contractType as never) || null,
      shirtSize: (data.shirtSize as never) || null,
      hasChildren: data.hasChildren ?? null,
      childrenAges: data.childrenAges?.trim() || null,
      hasIRDependents: data.hasIRDependents ?? null,
      hobbies: data.hobbies ?? [],
      socialNetworks: data.socialNetworks ?? undefined,
      favoriteBookMovieGenres: data.favoriteBookMovieGenres?.trim() || null,
      favoriteBooks: data.favoriteBooks?.trim() || null,
      favoriteMovies: data.favoriteMovies?.trim() || null,
      favoriteMusic: data.favoriteMusic?.trim() || null,
      admiredValues: data.admiredValues?.trim() || null,
      foodAllergies: data.foodAllergies?.trim() || null,
      hasPets: data.hasPets?.trim() || null,
      participateInVideos: data.participateInVideos ?? null,
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
    phone?: string;
    cpf?: string;
    birthDate?: string;
    jobTitle?: string;
    address?: string;
    addressNumber?: string;
    addressComplement?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    personalEmail?: string;
    rg?: string;
    gender?: string;
    ethnicity?: string;
    maritalStatus?: string;
    educationLevel?: string;
    livesWithDescription?: string;
    hasBradescoAccount?: string;
    bankAgency?: string;
    bankAccount?: string;
    hasOtherEmployment?: boolean;
    healthPlanOption?: string;
    wantsTransportVoucher?: boolean;
    contractType?: string;
    shirtSize?: string;
    hasChildren?: boolean;
    childrenAges?: string;
    hasIRDependents?: boolean;
    hobbies?: string[];
    socialNetworks?: unknown;
    favoriteBookMovieGenres?: string;
    favoriteBooks?: string;
    favoriteMovies?: string;
    favoriteMusic?: string;
    admiredValues?: string;
    foodAllergies?: string;
    hasPets?: string;
    participateInVideos?: boolean;
    generateOnboarding?: boolean;
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

  // Validate CPF if provided
  if (data.cpf) {
    const cpfDigits = data.cpf.replace(/\D/g, "");
    if (cpfDigits && !validateCPF(cpfDigits)) {
      return { success: false, error: "CPF inválido" };
    }
  }

  // Update user fields
  const newAdmissionDate = data.admissionDate ? new Date(data.admissionDate) : null;
  const admissionChanged =
    newAdmissionDate?.getTime() !== user.admissionDate?.getTime();

  const cpfClean = data.cpf?.replace(/\D/g, "") || null;

  await prisma.user.update({
    where: { id },
    data: {
      name: trimmedName,
      email: trimmedEmail,
      role: data.role as "admin" | "manager" | "employee",
      evaluationMode: evaluationMode as "pdi" | "feedback",
      admissionDate: newAdmissionDate,
      phone: data.phone?.trim() || null,
      cpf: cpfClean || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      jobTitle: data.jobTitle?.trim() || null,
      address: data.address?.trim() || null,
      addressNumber: data.addressNumber?.trim() || null,
      addressComplement: data.addressComplement?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zipCode: data.zipCode?.replace(/\D/g, "") || null,
      personalEmail: data.personalEmail?.trim() || null,
      rg: data.rg?.trim() || null,
      gender: (data.gender as never) || null,
      ethnicity: (data.ethnicity as never) || null,
      maritalStatus: (data.maritalStatus as never) || null,
      educationLevel: (data.educationLevel as never) || null,
      livesWithDescription: data.livesWithDescription?.trim() || null,
      hasBradescoAccount: (data.hasBradescoAccount as never) || null,
      bankAgency: data.bankAgency?.trim() || null,
      bankAccount: data.bankAccount?.trim() || null,
      hasOtherEmployment: data.hasOtherEmployment ?? null,
      healthPlanOption: (data.healthPlanOption as never) || null,
      wantsTransportVoucher: data.wantsTransportVoucher ?? null,
      contractType: (data.contractType as never) || null,
      shirtSize: (data.shirtSize as never) || null,
      hasChildren: data.hasChildren ?? null,
      childrenAges: data.childrenAges?.trim() || null,
      hasIRDependents: data.hasIRDependents ?? null,
      hobbies: data.hobbies ?? [],
      socialNetworks: data.socialNetworks ?? undefined,
      favoriteBookMovieGenres: data.favoriteBookMovieGenres?.trim() || null,
      favoriteBooks: data.favoriteBooks?.trim() || null,
      favoriteMovies: data.favoriteMovies?.trim() || null,
      favoriteMusic: data.favoriteMusic?.trim() || null,
      admiredValues: data.admiredValues?.trim() || null,
      foodAllergies: data.foodAllergies?.trim() || null,
      hasPets: data.hasPets?.trim() || null,
      participateInVideos: data.participateInVideos ?? null,
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

  // Generate onboarding feedbacks for newly assigned pending employees
  if (data.generateOnboarding && newAdmissionDate && data.managerId) {
    await createOnboardingFeedbacks(id, newAdmissionDate, data.managerId);
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
// PDI status for collaborator page
// ============================================================

export async function getEmployeeActivePDI(
  employeeId: string
): Promise<{ id: string } | null> {
  const session = await getEffectiveAuth();
  if (!session?.user) return null;
  return prisma.pDI.findFirst({
    where: { employeeId, status: "active" },
    select: { id: true },
  });
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

// ============================================================
// Pending employees (SSO users without active hierarchy)
// ============================================================

export async function getPendingEmployees(
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

  const searchFilter = search.trim()
    ? {
        OR: [
          { name: { contains: search.trim(), mode: "insensitive" as const } },
          { email: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      }
    : {};

  const where = {
    ...searchFilter,
    ssoProvider: { not: null },
    isActive: true,
    employeeHierarchies: {
      none: { endDate: null },
    },
  };

  const [employees, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    employees: employees.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      orgUnit: null,
      managerName: null,
      jobTitle: u.jobTitle ?? null,
      phone: u.phone ?? null,
      evaluationMode: u.evaluationMode ?? "feedback",
    })),
    total,
    page,
    pageSize,
  };
}

export async function getPendingEmployeesCount(): Promise<number> {
  const session = await requireAdmin();
  if (!session) return 0;

  return prisma.user.count({
    where: {
      ssoProvider: { not: null },
      isActive: true,
      employeeHierarchies: {
        none: { endDate: null },
      },
    },
  });
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

// ============================================================
// US-005: Full profile read/write with role-based field filtering
// ============================================================

export type DependentData = {
  id: string;
  name: string;
  relationship: string;
  cpf: string | null;
};

export type EmergencyContactData = {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
};

export type EmployeeFullProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  evaluationMode: string;
  isActive: boolean;
  avatarUrl: string | null;
  admissionDate: Date | null;
  phone: string | null;
  jobTitle: string | null;
  createdAt: Date;
  // Personal data
  cpf: string | null;
  rg: string | null;
  birthDate: Date | null;
  ethnicity: string | null;
  gender: string | null;
  maritalStatus: string | null;
  educationLevel: string | null;
  livesWithDescription: string | null;
  // Address & Contact
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  personalEmail: string | null;
  // Financial & Benefits
  hasBradescoAccount: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  hasOtherEmployment: boolean | null;
  healthPlanOption: string | null;
  wantsTransportVoucher: boolean | null;
  contractType: string | null;
  shirtSize: string | null;
  // Family
  hasChildren: boolean | null;
  childrenAges: string | null;
  hasIRDependents: boolean | null;
  // About Me
  hobbies: string[];
  socialNetworks: unknown;
  favoriteBookMovieGenres: string | null;
  favoriteBooks: string | null;
  favoriteMovies: string | null;
  favoriteMusic: string | null;
  admiredValues: string | null;
  foodAllergies: string | null;
  hasPets: string | null;
  participateInVideos: boolean | null;
  // Related data
  dependents: DependentData[];
  emergencyContacts: EmergencyContactData[];
  // Hierarchy
  hierarchy: {
    id: string;
    managerId: string;
    organizationalUnitId: string;
    startDate: Date;
    endDate: Date | null;
  } | null;
};

/**
 * Returns the full profile for an employee with role-based field filtering.
 * - Admin: all fields of any employee
 * - Manager: only name, email, phone, jobTitle, emergency contacts of subordinates
 * - Employee: all own fields
 */
export async function getEmployeeFullProfile(
  employeeId: string
): Promise<EmployeeFullProfile | null> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Check access
  const hasAccess = await canAccessEmployee(userId, role, employeeId);
  if (!hasAccess) return null;

  const user = await prisma.user.findUnique({
    where: { id: employeeId },
    include: {
      dependents: {
        select: { id: true, name: true, relationship: true, cpf: true },
        orderBy: { createdAt: "asc" },
      },
      emergencyContacts: {
        select: { id: true, name: true, phone: true, relationship: true },
        orderBy: { createdAt: "asc" },
      },
      employeeHierarchies: {
        where: { endDate: null },
        take: 1,
      },
    },
  });

  if (!user) return null;

  const activeHierarchy = user.employeeHierarchies[0] ?? null;
  const isOwnProfile = userId === employeeId;

  // Manager viewing subordinate: restricted fields
  const isRestricted = role === "manager" && !isOwnProfile;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    evaluationMode: user.evaluationMode,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    admissionDate: user.admissionDate,
    phone: user.phone ?? null,
    jobTitle: user.jobTitle ?? null,
    createdAt: user.createdAt,
    // Personal data — restricted from managers
    cpf: isRestricted ? null : (user.cpf ?? null),
    rg: isRestricted ? null : (user.rg ?? null),
    birthDate: isRestricted ? null : (user.birthDate ?? null),
    ethnicity: isRestricted ? null : (user.ethnicity ?? null),
    gender: isRestricted ? null : (user.gender ?? null),
    maritalStatus: isRestricted ? null : (user.maritalStatus ?? null),
    educationLevel: isRestricted ? null : (user.educationLevel ?? null),
    livesWithDescription: isRestricted ? null : (user.livesWithDescription ?? null),
    // Address & Contact — restricted from managers
    address: isRestricted ? null : (user.address ?? null),
    addressNumber: isRestricted ? null : (user.addressNumber ?? null),
    addressComplement: isRestricted ? null : (user.addressComplement ?? null),
    city: isRestricted ? null : (user.city ?? null),
    state: isRestricted ? null : (user.state ?? null),
    zipCode: isRestricted ? null : (user.zipCode ?? null),
    personalEmail: isRestricted ? null : (user.personalEmail ?? null),
    // Financial & Benefits — restricted from managers
    hasBradescoAccount: isRestricted ? null : (user.hasBradescoAccount ?? null),
    bankAgency: isRestricted ? null : (user.bankAgency ?? null),
    bankAccount: isRestricted ? null : (user.bankAccount ?? null),
    hasOtherEmployment: isRestricted ? null : (user.hasOtherEmployment ?? null),
    healthPlanOption: isRestricted ? null : (user.healthPlanOption ?? null),
    wantsTransportVoucher: isRestricted ? null : (user.wantsTransportVoucher ?? null),
    contractType: isRestricted ? null : (user.contractType ?? null),
    shirtSize: isRestricted ? null : (user.shirtSize ?? null),
    // Family — restricted from managers
    hasChildren: isRestricted ? null : (user.hasChildren ?? null),
    childrenAges: isRestricted ? null : (user.childrenAges ?? null),
    hasIRDependents: isRestricted ? null : (user.hasIRDependents ?? null),
    // About Me — visible to all with access
    hobbies: user.hobbies,
    socialNetworks: isRestricted ? null : user.socialNetworks,
    favoriteBookMovieGenres: isRestricted ? null : (user.favoriteBookMovieGenres ?? null),
    favoriteBooks: isRestricted ? null : (user.favoriteBooks ?? null),
    favoriteMovies: isRestricted ? null : (user.favoriteMovies ?? null),
    favoriteMusic: isRestricted ? null : (user.favoriteMusic ?? null),
    admiredValues: isRestricted ? null : (user.admiredValues ?? null),
    foodAllergies: isRestricted ? null : (user.foodAllergies ?? null),
    hasPets: isRestricted ? null : (user.hasPets ?? null),
    participateInVideos: isRestricted ? null : (user.participateInVideos ?? null),
    // Related data — dependents restricted from managers
    dependents: isRestricted ? [] : user.dependents,
    emergencyContacts: user.emergencyContacts,
    // Hierarchy
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

/**
 * Updates employee profile fields directly (admin only for sensitive fields,
 * employee can update own About Me fields).
 */
export async function updateEmployeeProfile(
  employeeId: string,
  data: {
    // Personal data
    rg?: string | null;
    ethnicity?: string | null;
    gender?: string | null;
    maritalStatus?: string | null;
    educationLevel?: string | null;
    livesWithDescription?: string | null;
    birthDate?: string | null;
    cpf?: string | null;
    // Address & Contact
    personalEmail?: string | null;
    addressNumber?: string | null;
    addressComplement?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    phone?: string | null;
    // Financial & Benefits
    hasBradescoAccount?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    hasOtherEmployment?: boolean | null;
    healthPlanOption?: string | null;
    wantsTransportVoucher?: boolean | null;
    contractType?: string | null;
    shirtSize?: string | null;
    // Family
    hasChildren?: boolean | null;
    childrenAges?: string | null;
    hasIRDependents?: boolean | null;
    // About Me
    hobbies?: string[];
    socialNetworks?: unknown;
    favoriteBookMovieGenres?: string | null;
    favoriteBooks?: string | null;
    favoriteMovies?: string | null;
    favoriteMusic?: string | null;
    admiredValues?: string | null;
    foodAllergies?: string | null;
    hasPets?: string | null;
    participateInVideos?: boolean | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Não autenticado" };
  }

  const role = (session.user as { role?: string }).role || "employee";
  const userId = session.user.id;
  const isAdmin = role === "admin";
  const isOwnProfile = userId === employeeId;

  // Admin can update anyone; employees can update their own "About Me" fields only
  if (!isAdmin && !isOwnProfile) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const user = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!user) {
    return { success: false, error: "Colaborador não encontrado" };
  }

  // Validate CPF if provided
  if (data.cpf !== undefined && data.cpf !== null) {
    const cpfDigits = data.cpf.replace(/\D/g, "");
    if (cpfDigits && !validateCPF(cpfDigits)) {
      return { success: false, error: "CPF inválido" };
    }
  }

  // Build update payload — only include fields that were explicitly provided
  const updateData: Record<string, unknown> = {};

  // For non-admin (employee editing own profile), only allow "About Me" fields
  if (!isAdmin) {
    const aboutMeFields = [
      "hobbies", "socialNetworks", "favoriteBookMovieGenres", "favoriteBooks",
      "favoriteMovies", "favoriteMusic", "admiredValues", "foodAllergies",
      "hasPets", "participateInVideos",
    ] as const;
    for (const field of aboutMeFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
  } else {
    // Admin can update all fields
    const stringFields = [
      "rg", "livesWithDescription", "personalEmail", "addressNumber",
      "addressComplement", "address", "city", "state", "phone",
      "bankAgency", "bankAccount", "childrenAges",
      "favoriteBookMovieGenres", "favoriteBooks", "favoriteMovies",
      "favoriteMusic", "admiredValues", "foodAllergies", "hasPets",
    ] as const;
    for (const field of stringFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]?.trim() || null;
      }
    }

    // Enum fields
    const enumFields = [
      "ethnicity", "gender", "maritalStatus", "educationLevel",
      "hasBradescoAccount", "healthPlanOption", "contractType", "shirtSize",
    ] as const;
    for (const field of enumFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field] || null;
      }
    }

    // Boolean fields
    const boolFields = [
      "hasOtherEmployment", "wantsTransportVoucher", "hasChildren",
      "hasIRDependents", "participateInVideos",
    ] as const;
    for (const field of boolFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // Special fields
    if (data.cpf !== undefined) {
      updateData.cpf = data.cpf ? data.cpf.replace(/\D/g, "") : null;
    }
    if (data.zipCode !== undefined) {
      updateData.zipCode = data.zipCode ? data.zipCode.replace(/\D/g, "") : null;
    }
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }
    if (data.hobbies !== undefined) {
      updateData.hobbies = data.hobbies;
    }
    if (data.socialNetworks !== undefined) {
      updateData.socialNetworks = data.socialNetworks ?? null;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true };
  }

  await prisma.user.update({
    where: { id: employeeId },
    data: updateData,
  });

  revalidatePath(`/colaboradores/${employeeId}`);
  revalidatePath("/perfil");
  return { success: true };
}

/**
 * Manages the list of dependents for an employee (create/update/delete).
 * Admin can manage any employee's dependents.
 * Employee can manage their own dependents (via profile).
 */
export async function updateEmployeeDependents(
  employeeId: string,
  dependents: { id?: string; name: string; relationship: string; cpf?: string | null }[]
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Não autenticado" };
  }

  const role = (session.user as { role?: string }).role || "employee";
  const userId = session.user.id;
  const isAdmin = role === "admin";
  const isOwnProfile = userId === employeeId;

  if (!isAdmin && !isOwnProfile) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const user = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!user) {
    return { success: false, error: "Colaborador não encontrado" };
  }

  // Get existing dependents
  const existing = await prisma.dependent.findMany({
    where: { userId: employeeId },
  });
  const existingIds = new Set(existing.map((d) => d.id));
  const incomingIds = new Set(dependents.filter((d) => d.id).map((d) => d.id!));

  // Delete removed dependents
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    await prisma.dependent.deleteMany({
      where: { id: { in: toDelete }, userId: employeeId },
    });
  }

  // Update existing and create new
  for (const dep of dependents) {
    const cpfClean = dep.cpf ? dep.cpf.replace(/\D/g, "") : null;
    if (dep.id && existingIds.has(dep.id)) {
      await prisma.dependent.update({
        where: { id: dep.id },
        data: {
          name: dep.name.trim(),
          relationship: dep.relationship.trim(),
          cpf: cpfClean || null,
        },
      });
    } else {
      await prisma.dependent.create({
        data: {
          userId: employeeId,
          name: dep.name.trim(),
          relationship: dep.relationship.trim(),
          cpf: cpfClean || null,
        },
      });
    }
  }

  revalidatePath(`/colaboradores/${employeeId}`);
  revalidatePath("/perfil");
  return { success: true };
}

/**
 * Manages the list of emergency contacts for an employee (create/update/delete).
 * Admin can manage any employee's contacts.
 * Employee can manage their own contacts (via profile).
 */
export async function updateEmployeeEmergencyContacts(
  employeeId: string,
  contacts: { id?: string; name: string; phone: string; relationship?: string | null }[]
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Não autenticado" };
  }

  const role = (session.user as { role?: string }).role || "employee";
  const userId = session.user.id;
  const isAdmin = role === "admin";
  const isOwnProfile = userId === employeeId;

  if (!isAdmin && !isOwnProfile) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const user = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!user) {
    return { success: false, error: "Colaborador não encontrado" };
  }

  // Get existing contacts
  const existing = await prisma.emergencyContact.findMany({
    where: { userId: employeeId },
  });
  const existingIds = new Set(existing.map((c) => c.id));
  const incomingIds = new Set(contacts.filter((c) => c.id).map((c) => c.id!));

  // Delete removed contacts
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    await prisma.emergencyContact.deleteMany({
      where: { id: { in: toDelete }, userId: employeeId },
    });
  }

  // Update existing and create new
  for (const contact of contacts) {
    if (contact.id && existingIds.has(contact.id)) {
      await prisma.emergencyContact.update({
        where: { id: contact.id },
        data: {
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          relationship: contact.relationship?.trim() || null,
        },
      });
    } else {
      await prisma.emergencyContact.create({
        data: {
          userId: employeeId,
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          relationship: contact.relationship?.trim() || null,
        },
      });
    }
  }

  revalidatePath(`/colaboradores/${employeeId}`);
  revalidatePath("/perfil");
  return { success: true };
}
