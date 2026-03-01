"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessibleEmployeeIds } from "@/lib/access-control";
import { getEffectiveSchedule } from "@/lib/sector-schedule-utils";

export interface ComplianceEmployee {
  employeeId: string;
  employeeName: string;
  position: string;
  status: "not_scheduled" | "scheduled" | "done";
  eventDate?: Date;
  eventId?: string;
  eventHref?: string;
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
        select: { id: true, name: true, role: true },
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
            { scheduledAt: { gte: periodStart, lte: periodEnd } },
            { conductedAt: { gte: periodStart, lte: periodEnd } },
          ],
        },
        orderBy: { scheduledAt: "desc" },
      });

      if (pdi) {
        const isDone = pdi.status === "active" || pdi.status === "completed";
        result.push({
          employeeId: employee.id,
          employeeName: employee.name,
          position: employee.role,
          status: isDone ? "done" : "scheduled",
          eventDate: pdi.conductedAt ?? pdi.scheduledAt ?? undefined,
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
