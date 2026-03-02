"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAccessibleEmployeeIds, canAccessEmployee } from "@/lib/access-control";
import {
  getEffectiveSchedule,
  getBusinessDays,
  distributeEvents,
  calculatePeriods,
} from "@/lib/sector-schedule-utils";

export interface ComplianceEmployee {
  employeeId: string;
  employeeName: string;
  position: string;
  status: "not_scheduled" | "scheduled" | "done";
  eventDate?: Date;
  eventId?: string;
  eventHref?: string;
  isOnboarding?: boolean;
  onboardingLabel?: string;
}

export async function getSectorComplianceStatus(
  unitId: string,
  periodStart: Date,
  periodEnd: Date,
  type: "pdi" | "feedback"
): Promise<{ success: boolean; error?: string; data?: ComplianceEmployee[] }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Get accessible employee IDs
  const accessibleIds = await getAccessibleEmployeeIds(userId, role);

  // Get all active employees in the unit
  const hierarchies = await prisma.employeeHierarchy.findMany({
    where: {
      organizationalUnitId: unitId,
      endDate: null,
    },
    include: {
      employee: {
        select: { id: true, name: true, role: true, admissionDate: true },
      },
    },
  });

  // Filter by access control
  const employees = hierarchies.filter((h) =>
    accessibleIds === "all" || accessibleIds.includes(h.employeeId)
  );

  // Filter only employees with active effective schedule
  const employeesWithSchedule: typeof employees = [];
  for (const emp of employees) {
    const schedule = await getEffectiveSchedule(emp.employeeId, type);
    if (schedule && schedule.isActive) {
      // For feedback: exclude employees still in onboarding period
      // Employee only enters regular sector feedback cycle from the first
      // complete period that starts after admissionDate + 90 days
      if (type === "feedback" && emp.employee.admissionDate) {
        const onboardingEnd = new Date(emp.employee.admissionDate);
        onboardingEnd.setDate(onboardingEnd.getDate() + 90);
        if (periodStart < onboardingEnd) {
          continue; // Still in onboarding, skip regular cycle
        }
      }
      employeesWithSchedule.push(emp);
    }
  }

  // Build compliance status for each employee
  const result: ComplianceEmployee[] = [];

  for (const emp of employeesWithSchedule) {
    const employee = emp.employee;

    if (type === "pdi") {
      // Check for PDIs in the period
      const pdi = await prisma.pDI.findFirst({
        where: {
          employeeId: employee.id,
          OR: [
            { createdAt: { gte: periodStart, lte: periodEnd } },
            { conductedAt: { gte: periodStart, lte: periodEnd } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      if (pdi) {
        const isDone = pdi.status === "active" && pdi.conductedAt != null;
        result.push({
          employeeId: employee.id,
          employeeName: employee.name,
          position: employee.role,
          status: isDone ? "done" : "scheduled",
          eventDate: pdi.conductedAt ?? pdi.createdAt ?? undefined,
          eventId: pdi.id,
          eventHref: `/pdis/${pdi.id}`,
        });
      } else {
        result.push({
          employeeId: employee.id,
          employeeName: employee.name,
          position: employee.role,
          status: "not_scheduled",
        });
      }
    } else {
      // Check for Feedbacks in the period
      const feedback = await prisma.feedback.findFirst({
        where: {
          employeeId: employee.id,
          OR: [
            { scheduledAt: { gte: periodStart, lte: periodEnd } },
            { conductedAt: { gte: periodStart, lte: periodEnd } },
          ],
        },
        orderBy: { scheduledAt: "desc" },
      });

      if (feedback) {
        const isDone = feedback.status === "submitted";
        result.push({
          employeeId: employee.id,
          employeeName: employee.name,
          position: employee.role,
          status: isDone ? "done" : "scheduled",
          eventDate: feedback.conductedAt ?? feedback.scheduledAt ?? undefined,
          eventId: feedback.id,
          eventHref: `/feedbacks/${feedback.id}`,
          isOnboarding: feedback.isOnboarding,
          onboardingLabel: feedback.isOnboarding ? feedback.period : undefined,
        });
      } else {
        result.push({
          employeeId: employee.id,
          employeeName: employee.name,
          position: employee.role,
          status: "not_scheduled",
        });
      }
    }
  }

  return { success: true, data: result };
}

const MONTH_ABBR_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatPeriod(date: Date): string {
  return `${MONTH_ABBR_PT[date.getMonth()]}/${date.getFullYear()}`;
}

export interface ProgramEventsResult {
  success: boolean;
  error?: string;
  created: number;
  skipped: number;
  events: Array<{ employeeId: string; employeeName: string; scheduledDate: Date }>;
}

export async function programEvents(params: {
  unitId: string;
  type: "pdi" | "feedback";
  periodStart: Date;
  periodEnd: Date;
  employeeIds: string[];
  perDay: 1 | 2;
  direction: "end-to-start" | "last-month-start";
  dryRun?: boolean;
}): Promise<ProgramEventsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado", created: 0, skipped: 0, events: [] };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Only manager or admin can program events
  if (role === "employee") {
    return { success: false, error: "Apenas gestores e admins podem programar eventos", created: 0, skipped: 0, events: [] };
  }

  // Verify access to each employee
  const accessibleEmployees: { id: string; name: string; managerId: string }[] = [];
  for (const empId of params.employeeIds) {
    const hasAccess = await canAccessEmployee(userId, role, empId);
    if (!hasAccess) continue;

    // Get the employee's current manager and admission date
    const hierarchy = await prisma.employeeHierarchy.findFirst({
      where: { employeeId: empId, endDate: null },
      include: { employee: { select: { name: true, admissionDate: true } } },
    });
    if (!hierarchy) continue;

    // For feedback: skip employees still in onboarding (admissionDate + 90d > periodStart)
    if (params.type === "feedback" && hierarchy.employee.admissionDate) {
      const onboardingEnd = new Date(hierarchy.employee.admissionDate);
      onboardingEnd.setDate(onboardingEnd.getDate() + 90);
      if (params.periodStart < onboardingEnd) continue;
    }

    accessibleEmployees.push({
      id: empId,
      name: hierarchy.employee.name,
      managerId: hierarchy.managerId,
    });
  }

  // Calculate business days in the period
  const businessDays = getBusinessDays(params.periodStart, params.periodEnd);

  // Distribute events
  const distributed = distributeEvents(
    accessibleEmployees.map((e) => ({ id: e.id, name: e.name })),
    businessDays,
    params.perDay,
    params.direction
  );

  // Check for existing events and skip duplicates
  const eventsToCreate: typeof distributed = [];
  let skipped = 0;

  for (const event of distributed) {
    const emp = accessibleEmployees.find((e) => e.id === event.employeeId)!;

    if (params.type === "pdi") {
      // Continuous model: only one active PDI per employee, regardless of dates
      const existing = await prisma.pDI.findFirst({
        where: {
          employeeId: event.employeeId,
          status: "active",
        },
      });
      if (existing) {
        skipped++;
        continue;
      }
    } else {
      const existing = await prisma.feedback.findFirst({
        where: {
          employeeId: event.employeeId,
          OR: [
            { scheduledAt: { gte: params.periodStart, lte: params.periodEnd } },
            { conductedAt: { gte: params.periodStart, lte: params.periodEnd } },
          ],
          status: { in: ["scheduled", "draft", "submitted"] },
        },
      });
      if (existing) {
        skipped++;
        continue;
      }
    }

    eventsToCreate.push(event);
  }

  // If dry run, return preview without creating
  if (params.dryRun) {
    return {
      success: true,
      created: eventsToCreate.length,
      skipped,
      events: eventsToCreate,
    };
  }

  // Create the events
  for (const event of eventsToCreate) {
    const emp = accessibleEmployees.find((e) => e.id === event.employeeId)!;
    const period = formatPeriod(event.scheduledDate);

    if (params.type === "pdi") {
      try {
        await prisma.pDI.create({
          data: {
            employeeId: event.employeeId,
            managerId: emp.managerId,
            status: "active",
          },
        });
      } catch (error: unknown) {
        // P2002 = unique constraint violation (employee already has active PDI)
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code: string }).code === "P2002"
        ) {
          skipped++;
          continue;
        }
        throw error;
      }
    } else {
      await prisma.feedback.create({
        data: {
          employeeId: event.employeeId,
          managerId: emp.managerId,
          status: "scheduled",
          period,
          scheduledAt: event.scheduledDate,
        },
      });
    }
  }

  revalidatePath("/programacao");
  revalidatePath("/pdis");
  revalidatePath("/feedbacks");
  revalidatePath("/calendario");

  return {
    success: true,
    created: eventsToCreate.length,
    skipped,
    events: eventsToCreate,
  };
}

// ============================================================
// US-011: Accessible org units and periods for the scheduling panel
// ============================================================

export interface AccessibleUnit {
  id: string;
  name: string;
  hasPdiSchedule: boolean;
  hasFeedbackSchedule: boolean;
}

export async function getAccessibleUnits(): Promise<AccessibleUnit[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const role = (session.user as { role?: string }).role || "employee";
  if (role === "employee") return [];

  let units: { id: string; name: string; sectorSchedules: { type: string; isActive: boolean }[] }[];

  if (role === "admin") {
    units = await prisma.organizationalUnit.findMany({
      orderBy: { name: "asc" },
      include: { sectorSchedules: { where: { isActive: true } } },
    });
  } else {
    // Manager: get units where they manage employees
    const managedHierarchies = await prisma.employeeHierarchy.findMany({
      where: { managerId: session.user.id, endDate: null },
      select: { organizationalUnitId: true },
    });
    const unitIds = [...new Set(managedHierarchies.map((h) => h.organizationalUnitId))];
    units = await prisma.organizationalUnit.findMany({
      where: { id: { in: unitIds } },
      orderBy: { name: "asc" },
      include: { sectorSchedules: { where: { isActive: true } } },
    });
  }

  return units.map((u) => ({
    id: u.id,
    name: u.name,
    hasPdiSchedule: u.sectorSchedules.some((s) => s.type === "pdi"),
    hasFeedbackSchedule: u.sectorSchedules.some((s) => s.type === "feedback"),
  }));
}

export interface PeriodOption {
  label: string;
  start: string; // ISO string for URL serialization
  end: string;
}

export async function getUnitPeriods(
  unitId: string,
  type: "pdi" | "feedback"
): Promise<PeriodOption[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const sectorSchedule = await prisma.sectorSchedule.findUnique({
    where: {
      organizationalUnitId_type: {
        organizationalUnitId: unitId,
        type,
      },
    },
  });

  if (!sectorSchedule || !sectorSchedule.isActive) return [];

  const periods = calculatePeriods(sectorSchedule.frequencyMonths, sectorSchedule.startDate);

  return periods.map((p) => ({
    label: p.label,
    start: p.start.toISOString(),
    end: p.end.toISOString(),
  }));
}
