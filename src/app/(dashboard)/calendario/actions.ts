"use server";

import { getEffectiveAuth } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { getAccessibleEmployeeIds } from "@/lib/access-control";
import type { CalendarEventType } from "@/generated/prisma/client";

export type CalendarEvent = {
  id: string;
  type: "pdi" | "feedback" | "followup";
  employeeName: string;
  managerName: string;
  scheduledAt: Date;
  status: string;
  href: string;
  outlookEventId: string | null;
};

export type CalendarFilters = {
  organizationalUnitId?: string;
  tipo?: "pdi" | "feedback" | "all";
};

/**
 * Fetch calendar events from CalendarEvent table for a given month/year.
 * Respects access control and supports optional filters.
 */
export async function getCalendarEvents(
  month: number,
  year: number,
  filters?: CalendarFilters
): Promise<CalendarEvent[]> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return [];
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Build date range for the requested month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Determine accessible employee IDs
  let accessibleIds = await getAccessibleEmployeeIds(userId, role);

  // If filtering by organizational unit, intersect with employees in that unit
  if (filters?.organizationalUnitId) {
    const hierarchies = await prisma.employeeHierarchy.findMany({
      where: {
        organizationalUnitId: filters.organizationalUnitId,
        endDate: null,
      },
      select: { employeeId: true },
    });
    const unitEmployeeIds = hierarchies.map((h) => h.employeeId);

    if (accessibleIds === "all") {
      accessibleIds = unitEmployeeIds;
    } else {
      const accessibleSet = new Set(accessibleIds);
      accessibleIds = unitEmployeeIds.filter((id) => accessibleSet.has(id));
    }

    // No accessible employees in this unit
    if (accessibleIds.length === 0) return [];
  }

  // Build employee filter for Prisma queries
  const employeeFilter =
    accessibleIds === "all" ? {} : { employeeId: { in: accessibleIds } };

  // Map tipo filter to CalendarEventType
  const tipo = filters?.tipo || "all";
  const typeFilter: { type?: CalendarEventType | { in: CalendarEventType[] } } = {};
  if (tipo === "feedback") {
    typeFilter.type = "feedback";
  } else if (tipo === "pdi") {
    typeFilter.type = "pdi_followup";
  }

  // For employees, exclude non-submitted feedback events
  // We need to filter via the linked feedback status
  const calendarEvents = await prisma.calendarEvent.findMany({
    where: {
      ...employeeFilter,
      ...typeFilter,
      scheduledAt: { gte: startOfMonth, lte: endOfMonth },
      status: { not: "cancelled" },
    },
    include: {
      employee: { select: { name: true } },
      manager: { select: { name: true } },
      feedback: role === "employee" ? { select: { status: true } } : false,
    },
    orderBy: { scheduledAt: "asc" },
  });

  const events: CalendarEvent[] = [];

  for (const ce of calendarEvents) {
    // Employees can't see non-submitted feedback events (unless they are the manager)
    if (
      role === "employee" &&
      ce.type === "feedback" &&
      ce.feedback &&
      typeof ce.feedback === "object" &&
      "status" in ce.feedback &&
      ce.feedback.status !== "submitted" &&
      ce.managerId !== userId
    ) {
      continue;
    }

    events.push({
      id: ce.id,
      type: ce.type === "pdi_followup" ? "followup" : "feedback",
      employeeName: ce.employee.name,
      managerName: ce.manager.name,
      scheduledAt: ce.scheduledAt,
      status: ce.status,
      href: `/calendario/${ce.id}`,
      outlookEventId: ce.outlookEventId,
    });
  }

  return events;
}

/**
 * Fetch organizational units accessible to the current user for calendar filters.
 * Admin: all units. Manager: units where they have subordinates. Employee: own unit.
 */
export async function getCalendarOrgUnits(): Promise<
  { id: string; name: string }[]
> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return [];

  const role = (session.user as { role?: string }).role || "employee";

  if (role === "admin") {
    const units = await prisma.organizationalUnit.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return units;
  }

  // For managers and employees: get units from their accessible employees' hierarchies
  const accessibleIds = await getAccessibleEmployeeIds(session.user.id, role);
  if (accessibleIds === "all") {
    const units = await prisma.organizationalUnit.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return units;
  }

  const hierarchies = await prisma.employeeHierarchy.findMany({
    where: {
      employeeId: { in: accessibleIds },
      endDate: null,
    },
    include: { organizationalUnit: { select: { id: true, name: true } } },
    distinct: ["organizationalUnitId"],
  });

  // Deduplicate and sort
  const seen = new Set<string>();
  const unique: { id: string; name: string }[] = [];
  for (const h of hierarchies) {
    const u = h.organizationalUnit;
    if (!seen.has(u.id)) {
      seen.add(u.id);
      unique.push({ id: u.id, name: u.name });
    }
  }
  unique.sort((a, b) => a.name.localeCompare(b.name));

  return unique;
}
