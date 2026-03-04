"use server";

import { getEffectiveAuth } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { canAccessEmployee } from "@/lib/access-control";
import { syncCalendarEventStatus } from "@/lib/calendar-event-utils";
import { revalidatePath } from "next/cache";

export type CalendarEventDetail = {
  id: string;
  type: "feedback" | "pdi_followup";
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  roomEmail: string | null;
  roomDisplayName: string | null;
  status: string;
  outlookEventId: string | null;
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  feedbackId: string | null;
  pdiFollowUpId: string | null;
  pdiId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: {
    id: string;
    userId: string | null;
    userName: string | null;
    externalEmail: string | null;
    role: string;
  }[];
};

export async function getCalendarEventById(
  eventId: string
): Promise<CalendarEventDetail | null> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    include: {
      employee: { select: { name: true } },
      manager: { select: { name: true } },
      pdiFollowUp: { select: { pdiId: true } },
      participants: {
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!event) return null;

  // Access control: can the user see events for this employee?
  const hasAccess = await canAccessEmployee(userId, role, event.employeeId);
  if (!hasAccess) return null;

  // Employees cannot see non-submitted feedback events
  if (
    role === "employee" &&
    event.type === "feedback" &&
    event.status === "scheduled" &&
    event.employeeId === userId &&
    event.managerId !== userId
  ) {
    // Check if linked feedback is submitted
    if (event.feedbackId) {
      const feedback = await prisma.feedback.findUnique({
        where: { id: event.feedbackId },
        select: { status: true },
      });
      if (feedback && feedback.status !== "submitted") return null;
    }
  }

  return {
    id: event.id,
    type: event.type,
    title: event.title,
    scheduledAt: event.scheduledAt.toISOString(),
    durationMinutes: event.durationMinutes,
    roomEmail: event.roomEmail,
    roomDisplayName: event.roomDisplayName,
    status: event.status,
    outlookEventId: event.outlookEventId,
    employeeId: event.employeeId,
    employeeName: event.employee.name,
    managerId: event.managerId,
    managerName: event.manager.name,
    feedbackId: event.feedbackId,
    pdiFollowUpId: event.pdiFollowUpId,
    pdiId: event.pdiFollowUp?.pdiId ?? null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    participants: event.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user?.name ?? null,
      externalEmail: p.externalEmail,
      role: p.role,
    })),
  };
}

export async function updateCalendarEvent(
  eventId: string,
  data: {
    scheduledAt?: string;
    durationMinutes?: number;
    roomEmail?: string | null;
    roomDisplayName?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role === "employee") {
    return { success: false, error: "Apenas gestores e admins podem editar eventos" };
  }

  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return { success: false, error: "Evento não encontrado" };
  }

  if (role !== "admin" && event.managerId !== userId) {
    return { success: false, error: "Apenas o gestor responsável ou admin pode editar este evento" };
  }

  if (event.status !== "scheduled") {
    return { success: false, error: "Apenas eventos agendados podem ser editados" };
  }

  const updateData: Record<string, unknown> = {};

  if (data.scheduledAt !== undefined) {
    const date = new Date(data.scheduledAt);
    if (isNaN(date.getTime())) {
      return { success: false, error: "Data inválida" };
    }
    updateData.scheduledAt = date;
  }
  if (data.durationMinutes !== undefined) {
    updateData.durationMinutes = data.durationMinutes;
  }
  if (data.roomEmail !== undefined) {
    updateData.roomEmail = data.roomEmail;
  }
  if (data.roomDisplayName !== undefined) {
    updateData.roomDisplayName = data.roomDisplayName;
  }

  const updated = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: updateData,
  });

  // Propagate scheduledAt to linked record
  if (data.scheduledAt !== undefined) {
    const date = new Date(data.scheduledAt);
    if (updated.feedbackId) {
      await prisma.feedback.update({
        where: { id: updated.feedbackId },
        data: { scheduledAt: date },
      });
    }
    if (updated.pdiFollowUpId) {
      await prisma.pDIFollowUp.update({
        where: { id: updated.pdiFollowUpId },
        data: { scheduledAt: date },
      });
    }
  }

  revalidatePath("/calendario");
  revalidatePath(`/calendario/${eventId}`);
  return { success: true };
}

export async function addParticipant(
  eventId: string,
  data: { userId?: string; externalEmail?: string; role?: "required" | "optional" }
): Promise<{ success: boolean; error?: string; id?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role === "employee") {
    return { success: false, error: "Apenas gestores e admins podem adicionar participantes" };
  }

  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return { success: false, error: "Evento não encontrado" };
  }

  if (role !== "admin" && event.managerId !== userId) {
    return { success: false, error: "Acesso não autorizado" };
  }

  if (!data.userId && !data.externalEmail) {
    return { success: false, error: "Informe um usuário ou e-mail externo" };
  }

  const participant = await prisma.calendarEventParticipant.create({
    data: {
      calendarEventId: eventId,
      userId: data.userId ?? null,
      externalEmail: data.externalEmail ?? null,
      role: data.role ?? "required",
    },
  });

  revalidatePath(`/calendario/${eventId}`);
  return { success: true, id: participant.id };
}

export async function removeParticipant(
  eventId: string,
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role === "employee") {
    return { success: false, error: "Apenas gestores e admins podem remover participantes" };
  }

  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return { success: false, error: "Evento não encontrado" };
  }

  if (role !== "admin" && event.managerId !== userId) {
    return { success: false, error: "Acesso não autorizado" };
  }

  await prisma.calendarEventParticipant.delete({
    where: { id: participantId },
  });

  revalidatePath(`/calendario/${eventId}`);
  return { success: true };
}

export async function cancelCalendarEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role === "employee") {
    return { success: false, error: "Apenas gestores e admins podem cancelar eventos" };
  }

  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) {
    return { success: false, error: "Evento não encontrado" };
  }

  if (role !== "admin" && event.managerId !== userId) {
    return { success: false, error: "Acesso não autorizado" };
  }

  if (event.status !== "scheduled") {
    return { success: false, error: "Apenas eventos agendados podem ser cancelados" };
  }

  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { status: "cancelled" },
  });

  // Cancel linked records
  if (event.feedbackId) {
    const feedback = await prisma.feedback.findUnique({
      where: { id: event.feedbackId },
      select: { status: true },
    });
    if (feedback && (feedback.status === "scheduled" || feedback.status === "draft")) {
      await prisma.feedback.update({
        where: { id: event.feedbackId },
        data: { status: "cancelled" },
      });
    }
  }

  if (event.pdiFollowUpId) {
    const followUp = await prisma.pDIFollowUp.findUnique({
      where: { id: event.pdiFollowUpId },
      select: { status: true },
    });
    if (followUp && followUp.status === "scheduled") {
      await prisma.pDIFollowUp.update({
        where: { id: event.pdiFollowUpId },
        data: { status: "cancelled" },
      });
    }
  }

  revalidatePath("/calendario");
  revalidatePath(`/calendario/${eventId}`);
  return { success: true };
}

export type SystemUser = {
  id: string;
  name: string;
  email: string;
};

/**
 * Fetch active users for participant search (excludes already-added participants).
 */
export async function searchUsersForParticipant(
  eventId: string,
  search: string
): Promise<SystemUser[]> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return [];

  const role = (session.user as { role?: string }).role || "employee";
  if (role === "employee") return [];

  // Get existing participant userIds to exclude them
  const existing = await prisma.calendarEventParticipant.findMany({
    where: { calendarEventId: eventId },
    select: { userId: true },
  });
  const excludeIds = existing
    .map((p) => p.userId)
    .filter((id): id is string => id !== null);

  // Also get the event's employee and manager to exclude
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { employeeId: true, managerId: true },
  });
  if (event) {
    excludeIds.push(event.employeeId, event.managerId);
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { notIn: excludeIds },
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 10,
  });

  return users;
}
