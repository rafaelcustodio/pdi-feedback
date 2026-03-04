"use server";

import { getEffectiveAuth } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAccessibleEmployeeIds, canAccessEmployee } from "@/lib/access-control";
import {
  getEffectiveSchedule,
  getBusinessDays,
  distributeEvents,
  calculatePeriods,
} from "@/lib/sector-schedule-utils";
import { formatPeriodLabel } from "@/lib/sector-schedule-pure-utils";
import {
  getUserToken,
  createCalendarEvent,
  listMeetingRooms,
  getRoomScheduleForDateRange,
} from "@/lib/microsoft-graph";
import type { GraphCalendarEvent, MeetingRoom, RoomScheduleMap } from "@/lib/microsoft-graph";

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
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Get accessible employee IDs
  const accessibleIds = await getAccessibleEmployeeIds(userId, role);

  // Get all active employees in the unit, filtered by evaluationMode
  const hierarchies = await prisma.employeeHierarchy.findMany({
    where: {
      organizationalUnitId: unitId,
      endDate: null,
      employee: {
        evaluationMode: type,
      },
    },
    include: {
      employee: {
        select: { id: true, name: true, role: true, admissionDate: true, evaluationMode: true },
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


export interface ProgramEventsResult {
  success: boolean;
  error?: string;
  created: number;
  skipped: number;
  events: Array<{ employeeId: string; employeeName: string; scheduledDate: Date; scheduledTime?: string }>;
}

export interface EventRoomSelection {
  employeeId: string;
  roomEmail: string;
  roomDisplayName: string;
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
  eventRooms?: EventRoomSelection[];
  eventTimes?: Array<{ employeeId: string; scheduledTime: string }>;
  scheduledDates?: Array<{ employeeId: string; scheduledDate: string }>; // explicit dates from wizard preview
}): Promise<ProgramEventsResult> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado", created: 0, skipped: 0, events: [] };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Only manager or admin can program events
  if (role === "employee") {
    return { success: false, error: "Apenas gestores e admins podem programar eventos", created: 0, skipped: 0, events: [] };
  }

  // Look up sector schedule frequency for period formatting
  const sectorSchedule = await prisma.sectorSchedule.findUnique({
    where: {
      organizationalUnitId_type: {
        organizationalUnitId: params.unitId,
        type: params.type,
      },
    },
    select: { frequencyMonths: true, startDate: true },
  });
  const frequencyMonths = sectorSchedule?.frequencyMonths ?? 1;
  const cycleStartMonth = sectorSchedule?.startDate?.getUTCMonth() ?? 0;

  // Verify access to each employee
  const accessibleEmployees: { id: string; name: string; managerId: string }[] = [];
  for (const empId of params.employeeIds) {
    const hasAccess = await canAccessEmployee(userId, role, empId);
    if (!hasAccess) continue;

    // Get the employee's current manager, admission date, and evaluationMode
    const hierarchy = await prisma.employeeHierarchy.findFirst({
      where: { employeeId: empId, endDate: null },
      include: { employee: { select: { name: true, admissionDate: true, evaluationMode: true } } },
    });
    if (!hierarchy) continue;

    // Skip employees whose evaluationMode doesn't match the event type
    if (hierarchy.employee.evaluationMode !== params.type) continue;

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

  // Apply explicit scheduled dates from the wizard preview (overrides server-side redistribution)
  if (params.scheduledDates && params.scheduledDates.length > 0) {
    const dateOverrides = new Map(
      params.scheduledDates.map((d) => [d.employeeId, new Date(`${d.scheduledDate}T12:00:00`)])
    );
    for (const event of eventsToCreate) {
      const override = dateOverrides.get(event.employeeId);
      if (override) event.scheduledDate = override;
    }
  }

  // Build room lookup from eventRooms
  const roomMap = new Map<string, EventRoomSelection>();
  if (params.eventRooms) {
    for (const r of params.eventRooms) {
      roomMap.set(r.employeeId, r);
    }
  }

  // Build time lookup from eventTimes
  const timeMap = new Map<string, string>();
  if (params.eventTimes) {
    for (const t of params.eventTimes) {
      timeMap.set(t.employeeId, t.scheduledTime);
    }
  }

  // Create the events
  for (const event of eventsToCreate) {
    const emp = accessibleEmployees.find((e) => e.id === event.employeeId)!;
    const period = formatPeriodLabel(params.periodStart, params.periodEnd, frequencyMonths, cycleStartMonth);

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
      const feedback = await prisma.feedback.create({
        data: {
          employeeId: event.employeeId,
          managerId: emp.managerId,
          status: "scheduled",
          period,
          scheduledAt: event.scheduledDate,
        },
      });

      // Create Outlook calendar events with room if available
      const employee = await prisma.user.findUnique({
        where: { id: event.employeeId },
        select: { name: true, email: true },
      });

      if (employee) {
        const dateStr = new Date(event.scheduledDate).toISOString().slice(0, 10);
        const eventTime = timeMap.get(event.employeeId) || "09:00";
        const [startH, startM] = eventTime.split(":").map(Number);
        const endH = startH + 1;
        const startDateTime = `${dateStr}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`;
        const endDateTime = `${dateStr}T${String(endH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`;

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const calendarEvent: GraphCalendarEvent = {
          subject: `Feedback — ${employee.name}`,
          start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
          end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
          body: {
            contentType: "text",
            content: `Você tem um feedback agendado com seu gestor.\n\nO feedback é uma ferramenta essencial para o seu desenvolvimento profissional.\n\nAcesse o sistema para mais detalhes: ${baseUrl}`,
          },
          attendees: [
            { emailAddress: { address: employee.email, name: employee.name }, type: "required" },
          ],
        };

        const roomSelection = roomMap.get(event.employeeId);
        if (roomSelection) {
          calendarEvent.attendees.push({
            emailAddress: { address: roomSelection.roomEmail, name: roomSelection.roomDisplayName },
            type: "resource",
          });
          calendarEvent.location = {
            displayName: roomSelection.roomDisplayName,
            locationEmailAddress: roomSelection.roomEmail,
          };
        }

        const [managerToken, employeeToken] = await Promise.allSettled([
          getUserToken(emp.managerId),
          getUserToken(event.employeeId),
        ]);

        const managerAccessToken = managerToken.status === "fulfilled" ? managerToken.value : null;
        const employeeAccessToken = employeeToken.status === "fulfilled" ? employeeToken.value : null;

        const eventPromises: Promise<string | null>[] = [];
        if (managerAccessToken) eventPromises.push(createCalendarEvent(managerAccessToken, calendarEvent));
        if (employeeAccessToken) eventPromises.push(createCalendarEvent(employeeAccessToken, calendarEvent));

        const results = await Promise.allSettled(eventPromises);

        if (managerAccessToken && results.length > 0) {
          const managerResult = results[0];
          if (managerResult.status === "fulfilled" && managerResult.value) {
            await prisma.feedback.update({
              where: { id: feedback.id },
              data: { outlookEventId: managerResult.value },
            });
          }
        }
      }
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
  const session = await getEffectiveAuth();
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
  const session = await getEffectiveAuth();
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

// ============================================================
// Room availability for wizard
// ============================================================

export interface WizardRoom {
  emailAddress: string;
  displayName: string;
  building: string | null;
  capacity: number | null;
}

/** Check if the current user has a Microsoft Graph token */
export async function hasMicrosoftTokenForWizard(): Promise<boolean> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return false;
  const token = await getUserToken(session.user.id);
  return token !== null;
}

/** Fetch all meeting rooms available in the tenant */
export async function fetchRoomsForWizard(): Promise<WizardRoom[]> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return [];

  const token = await getUserToken(session.user.id);
  if (!token) return [];

  const rooms = await listMeetingRooms(token);
  return rooms.map((r) => ({
    emailAddress: r.emailAddress,
    displayName: r.displayName,
    building: r.building,
    capacity: r.capacity,
  }));
}

/**
 * Fetch room schedule for a date range.
 * Returns a serializable object { [date]: availabilityView } instead of Map.
 */
export async function fetchRoomScheduleForPeriod(
  roomEmail: string,
  periodStart: string,
  periodEnd: string
): Promise<Record<string, string>> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return {};

  const token = await getUserToken(session.user.id);
  if (!token) return {};

  const scheduleMap = await getRoomScheduleForDateRange(
    token,
    roomEmail,
    periodStart,
    periodEnd
  );

  // Convert Map to plain object for serialization
  const result: Record<string, string> = {};
  for (const [key, value] of scheduleMap) {
    result[key] = value;
  }
  return result;
}
