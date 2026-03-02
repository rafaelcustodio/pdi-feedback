"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessibleEmployeeIds } from "@/lib/access-control";

export type CalendarEvent = {
  id: string;
  type: "pdi" | "feedback" | "followup";
  employeeName: string;
  scheduledAt: Date;
  status: string;
  href: string;
};

export type CalendarFilters = {
  organizationalUnitId?: string;
  tipo?: "pdi" | "feedback" | "all";
};

/**
 * Fetch calendar events (PDIs and Feedbacks) for a given month/year.
 * Respects access control and supports optional filters.
 */
export async function getCalendarEvents(
  month: number,
  year: number,
  filters?: CalendarFilters
): Promise<CalendarEvent[]> {
  const session = await auth();
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

  const tipo = filters?.tipo || "all";
  const events: CalendarEvent[] = [];

  // Fetch PDI events
  if (tipo === "all" || tipo === "pdi") {
    const pdis = await prisma.pDI.findMany({
      where: {
        ...employeeFilter,
        status: "active",
        OR: [
          { conductedAt: { gte: startOfMonth, lte: endOfMonth } },
          {
            conductedAt: null,
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        ],
      },
      include: {
        employee: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    for (const pdi of pdis) {
      events.push({
        id: pdi.id,
        type: "pdi",
        employeeName: pdi.employee.name,
        scheduledAt: pdi.conductedAt ?? pdi.createdAt,
        status: pdi.status,
        href: `/pdis/${pdi.id}`,
      });
    }
  }

  // Fetch PDI Follow-Up events
  if (tipo === "all" || tipo === "pdi") {
    const followUps = await prisma.pDIFollowUp.findMany({
      where: {
        pdi: { ...employeeFilter, status: "active" },
        scheduledAt: { gte: startOfMonth, lte: endOfMonth },
        status: { not: "cancelled" },
      },
      include: { pdi: { include: { employee: { select: { name: true } } } } },
    });

    for (const fu of followUps) {
      events.push({
        id: fu.id,
        type: "followup",
        employeeName: fu.pdi.employee.name,
        scheduledAt: fu.scheduledAt,
        status: fu.status,
        href: `/pdis/${fu.pdiId}`,
      });
    }
  }

  // Fetch Feedback events
  if (tipo === "all" || tipo === "feedback") {
    // Employees don't see scheduled or draft feedbacks
    const feedbackStatusFilter =
      role === "employee"
        ? { status: "submitted" as const }
        : {};

    const feedbacks = await prisma.feedback.findMany({
      where: {
        ...employeeFilter,
        ...feedbackStatusFilter,
        OR: [
          { scheduledAt: { gte: startOfMonth, lte: endOfMonth } },
          {
            scheduledAt: null,
            conductedAt: { gte: startOfMonth, lte: endOfMonth },
          },
        ],
      },
      include: {
        employee: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    for (const fb of feedbacks) {
      events.push({
        id: fb.id,
        type: "feedback",
        employeeName: fb.employee.name,
        scheduledAt: fb.scheduledAt ?? fb.conductedAt!,
        status: fb.status,
        href: `/feedbacks/${fb.id}`,
      });
    }
  }

  // Sort all events by date
  events.sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  return events;
}

/**
 * Fetch organizational units accessible to the current user for calendar filters.
 * Admin: all units. Manager: units where they have subordinates. Employee: own unit.
 */
export async function getCalendarOrgUnits(): Promise<
  { id: string; name: string }[]
> {
  const session = await auth();
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
