"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { calculatePeriods, getCurrentPeriod } from "@/lib/sector-schedule-utils";

export type OrgUnitNode = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  children: OrgUnitNode[];
  _count: { employeeHierarchies: number };
};

function buildTree(
  units: {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: Date;
    _count: { employeeHierarchies: number };
  }[]
): OrgUnitNode[] {
  const map = new Map<string, OrgUnitNode>();
  const roots: OrgUnitNode[] = [];

  for (const unit of units) {
    map.set(unit.id, { ...unit, children: [] });
  }

  for (const unit of units) {
    const node = map.get(unit.id)!;
    if (unit.parentId && map.has(unit.parentId)) {
      map.get(unit.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getOrganizationalUnits(): Promise<{
  tree: OrgUnitNode[];
  flat: { id: string; name: string; parentId: string | null }[];
}> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Acesso não autorizado");
  }

  const units = await prisma.organizationalUnit.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { employeeHierarchies: true } },
    },
  });

  return {
    tree: buildTree(units),
    flat: units.map((u) => ({ id: u.id, name: u.name, parentId: u.parentId })),
  };
}

export async function createOrganizationalUnit(
  name: string,
  parentId: string | null
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Acesso não autorizado" };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "Nome é obrigatório" };
  }

  if (parentId) {
    const parent = await prisma.organizationalUnit.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      return { success: false, error: "Unidade-pai não encontrada" };
    }
  }

  await prisma.organizationalUnit.create({
    data: {
      name: trimmedName,
      parentId: parentId || null,
    },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function updateOrganizationalUnit(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Acesso não autorizado" };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "Nome é obrigatório" };
  }

  const unit = await prisma.organizationalUnit.findUnique({
    where: { id },
  });
  if (!unit) {
    return { success: false, error: "Unidade não encontrada" };
  }

  await prisma.organizationalUnit.update({
    where: { id },
    data: { name: trimmedName },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function deleteOrganizationalUnit(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Acesso não autorizado" };
  }

  const unit = await prisma.organizationalUnit.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          children: true,
          employeeHierarchies: true,
        },
      },
    },
  });

  if (!unit) {
    return { success: false, error: "Unidade não encontrada" };
  }

  if (unit._count.children > 0) {
    return {
      success: false,
      error: "Não é possível excluir uma unidade que possui sub-unidades",
    };
  }

  if (unit._count.employeeHierarchies > 0) {
    return {
      success: false,
      error: "Não é possível excluir uma unidade que possui colaboradores vinculados",
    };
  }

  await prisma.organizationalUnit.delete({
    where: { id },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}

// ============================================================
// SectorSchedule CRUD
// ============================================================

export type SectorScheduleData = {
  id: string;
  type: "pdi" | "feedback";
  frequencyMonths: number;
  startDate: Date;
  isActive: boolean;
};

const VALID_FREQUENCIES = [1, 2, 3, 6, 12];

export async function getSectorSchedules(
  unitId: string
): Promise<{ pdi: SectorScheduleData | null; feedback: SectorScheduleData | null }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Acesso não autorizado");
  }

  const schedules = await prisma.sectorSchedule.findMany({
    where: { organizationalUnitId: unitId },
  });

  const pdi = schedules.find((s) => s.type === "pdi");
  const feedback = schedules.find((s) => s.type === "feedback");

  return {
    pdi: pdi
      ? { id: pdi.id, type: "pdi", frequencyMonths: pdi.frequencyMonths, startDate: pdi.startDate, isActive: pdi.isActive }
      : null,
    feedback: feedback
      ? { id: feedback.id, type: "feedback", frequencyMonths: feedback.frequencyMonths, startDate: feedback.startDate, isActive: feedback.isActive }
      : null,
  };
}

export async function saveSectorSchedule(params: {
  unitId: string;
  type: "pdi" | "feedback";
  frequencyMonths: number;
  startDate: Date;
  isActive: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Acesso não autorizado" };
  }

  if (!VALID_FREQUENCIES.includes(params.frequencyMonths)) {
    return { success: false, error: "Frequência inválida. Use 1, 2, 3, 6 ou 12." };
  }

  if (!params.startDate) {
    return { success: false, error: "Data de início é obrigatória." };
  }

  await prisma.sectorSchedule.upsert({
    where: {
      organizationalUnitId_type: {
        organizationalUnitId: params.unitId,
        type: params.type,
      },
    },
    create: {
      organizationalUnitId: params.unitId,
      type: params.type,
      frequencyMonths: params.frequencyMonths,
      startDate: params.startDate,
      isActive: params.isActive,
    },
    update: {
      frequencyMonths: params.frequencyMonths,
      startDate: params.startDate,
      isActive: params.isActive,
    },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}

export type SectorProgressInfo = {
  total: number;
  done: number;
  notScheduled: number;
};

export type SectorScheduleSummary = {
  unitId: string;
  unitName: string;
  pdi: { frequencyMonths: number; startDate: Date; isActive: boolean } | null;
  feedback: { frequencyMonths: number; startDate: Date; isActive: boolean } | null;
  pdiProgress: SectorProgressInfo | null;
  feedbackProgress: SectorProgressInfo | null;
};

const FREQ_LABELS: Record<number, string> = {
  1: "Mensal",
  2: "Bimestral",
  3: "Trimestral",
  6: "Semestral",
  12: "Anual",
};

export function getFrequencyLabel(months: number): string {
  return FREQ_LABELS[months] ?? `${months} meses`;
}

export async function getAllSectorSchedules(): Promise<SectorScheduleSummary[]> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Acesso não autorizado");
  }

  const units = await prisma.organizationalUnit.findMany({
    orderBy: { name: "asc" },
    include: {
      sectorSchedules: true,
      employeeHierarchies: {
        where: { endDate: null },
        select: { employeeId: true },
      },
    },
  });

  const now = new Date();
  const results: SectorScheduleSummary[] = [];

  for (const unit of units) {
    const pdiSched = unit.sectorSchedules.find((s) => s.type === "pdi" && s.isActive);
    const fbSched = unit.sectorSchedules.find((s) => s.type === "feedback" && s.isActive);
    const employeeIds = unit.employeeHierarchies.map((h) => h.employeeId);
    const total = employeeIds.length;

    let pdiProgress: SectorProgressInfo | null = null;
    let feedbackProgress: SectorProgressInfo | null = null;

    if (pdiSched && total > 0) {
      const periods = calculatePeriods(pdiSched.frequencyMonths, pdiSched.startDate);
      const currentP = getCurrentPeriod(periods, now);
      if (currentP) {
        const pdis = await prisma.pDI.findMany({
          where: {
            employeeId: { in: employeeIds },
            OR: [
              { scheduledAt: { gte: currentP.start, lte: currentP.end } },
              { conductedAt: { gte: currentP.start, lte: currentP.end } },
            ],
          },
          select: { employeeId: true, status: true },
        });
        const doneIds = new Set(pdis.filter((p) => p.status === "active" || p.status === "completed").map((p) => p.employeeId));
        const scheduledIds = new Set(pdis.map((p) => p.employeeId));
        pdiProgress = {
          total,
          done: doneIds.size,
          notScheduled: total - scheduledIds.size,
        };
      }
    }

    if (fbSched && total > 0) {
      const periods = calculatePeriods(fbSched.frequencyMonths, fbSched.startDate);
      const currentP = getCurrentPeriod(periods, now);
      if (currentP) {
        const fbs = await prisma.feedback.findMany({
          where: {
            employeeId: { in: employeeIds },
            OR: [
              { scheduledAt: { gte: currentP.start, lte: currentP.end } },
              { conductedAt: { gte: currentP.start, lte: currentP.end } },
            ],
          },
          select: { employeeId: true, status: true },
        });
        const doneIds = new Set(fbs.filter((f) => f.status === "submitted").map((f) => f.employeeId));
        const scheduledIds = new Set(fbs.map((f) => f.employeeId));
        feedbackProgress = {
          total,
          done: doneIds.size,
          notScheduled: total - scheduledIds.size,
        };
      }
    }

    results.push({
      unitId: unit.id,
      unitName: unit.name,
      pdi: pdiSched
        ? { frequencyMonths: pdiSched.frequencyMonths, startDate: pdiSched.startDate, isActive: pdiSched.isActive }
        : null,
      feedback: fbSched
        ? { frequencyMonths: fbSched.frequencyMonths, startDate: fbSched.startDate, isActive: fbSched.isActive }
        : null,
      pdiProgress,
      feedbackProgress,
    });
  }

  return results;
}

export async function deleteSectorSchedule(
  unitId: string,
  type: "pdi" | "feedback"
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Acesso não autorizado" };
  }

  await prisma.sectorSchedule.updateMany({
    where: {
      organizationalUnitId: unitId,
      type,
    },
    data: { isActive: false },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}
