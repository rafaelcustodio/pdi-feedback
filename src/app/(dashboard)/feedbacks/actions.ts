"use server";

import { getEffectiveAuth } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getAccessibleEmployeeIds,
  getFeedbackAccessFilter,
  canAccessEmployee,
} from "@/lib/access-control";
import { recalculateFeedbackSchedule } from "@/lib/schedule-utils";
import { sendEmail } from "@/lib/email";
import { buildFeedbackSubmittedEmployeeHtml } from "@/lib/email-templates";
import {
  getUserToken,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  listMeetingRooms,
  getRoomsAvailability,
} from "@/lib/microsoft-graph";
import type { GraphCalendarEvent, RoomAvailability } from "@/lib/microsoft-graph";
export type { RoomAvailability, MeetingRoom } from "@/lib/microsoft-graph";

export type FeedbackListItem = {
  id: string;
  period: string;
  status: string;
  rating: number | null;
  conductedAt: Date | null;
  scheduledAt: Date | null;
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
  conductedAt: Date | null;
  scheduledAt: Date | null;
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
  pageSize: number = 10,
  year: string = "",
  conductedAtFrom: string = "",
  conductedAtTo: string = "",
  statusFilter: string = ""
): Promise<{
  feedbacks: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { feedbacks: [], total: 0, page: 1, pageSize: 10 };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const accessFilter = await getFeedbackAccessFilter(userId, role);

  // For employees, only show submitted feedbacks where they are the employee
  // (draft and scheduled are NOT visible to employees)
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

  // Build additional filters as AND conditions
  const andConditions: Record<string, unknown>[] = [];

  // Only show feedbacks for employees with evaluationMode='feedback'
  andConditions.push({ employee: { evaluationMode: "feedback" } });

  // Filter by year (on period field or createdAt year)
  if (year.trim()) {
    const yearNum = parseInt(year.trim(), 10);
    if (!isNaN(yearNum)) {
      andConditions.push({
        OR: [
          { period: { contains: year.trim() } },
          {
            createdAt: {
              gte: new Date(`${yearNum}-01-01`),
              lt: new Date(`${yearNum + 1}-01-01`),
            },
          },
        ],
      });
    }
  }

  // Filter by conductedAt date range
  if (conductedAtFrom.trim()) {
    const fromDate = new Date(conductedAtFrom.trim());
    if (!isNaN(fromDate.getTime())) {
      andConditions.push({ conductedAt: { gte: fromDate } });
    }
  }
  if (conductedAtTo.trim()) {
    const toDate = new Date(conductedAtTo.trim());
    if (!isNaN(toDate.getTime())) {
      // Set to end of day
      toDate.setHours(23, 59, 59, 999);
      andConditions.push({ conductedAt: { lte: toDate } });
    }
  }

  // Filter by search text
  if (search.trim()) {
    andConditions.push({
      OR: [
        { employee: { name: { contains: search.trim(), mode: "insensitive" as const } } },
        { period: { contains: search.trim(), mode: "insensitive" as const } },
      ],
    });
  }

  // Status filter
  if (statusFilter.trim()) {
    andConditions.push({ status: statusFilter.trim() });
  }

  if (andConditions.length > 0) {
    whereClause = {
      AND: [whereClause, ...andConditions],
    };
  }

  // Employees: order by conductedAt (most recent first), fallback to createdAt
  // Managers/admins: order by createdAt (most recent first)
  const orderBy = role === "employee"
    ? [{ conductedAt: "desc" as const }, { createdAt: "desc" as const }]
    : [{ createdAt: "desc" as const }];

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where: whereClause,
      orderBy,
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
      conductedAt: f.conductedAt,
      scheduledAt: f.scheduledAt,
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
  const session = await getEffectiveAuth();
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
    conductedAt: feedback.conductedAt,
    scheduledAt: feedback.scheduledAt,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
    employeeName: feedback.employee.name,
    managerName: feedback.manager.name,
  };
}

export async function getSubordinatesForFeedback(): Promise<SubordinateOption[]> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  // Only managers and admins can create feedback
  if (role === "employee") return [];

  const accessible = await getAccessibleEmployeeIds(userId, role);

  if (accessible === "all") {
    return prisma.user.findMany({
      where: { isActive: true, id: { not: userId }, evaluationMode: "feedback" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  }

  // Exclude self from subordinate list
  const subordinateIds = accessible.filter((id) => id !== userId);
  if (subordinateIds.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: subordinateIds }, isActive: true, evaluationMode: "feedback" },
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
  scheduledAt: string;
  submit?: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const session = await getEffectiveAuth();
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

  if (!data.scheduledAt.trim()) {
    return { success: false, error: "Data da programação é obrigatória" };
  }

  const scheduledAtDate = new Date(data.scheduledAt);
  if (isNaN(scheduledAtDate.getTime())) {
    return { success: false, error: "Data da programação inválida" };
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
      scheduledAt: scheduledAtDate,
      status: data.submit ? "submitted" : "draft",
    },
  });

  // Recalculate feedback schedule and notify employee after submission
  if (data.submit) {
    await recalculateFeedbackSchedule(data.employeeId);

    const [employee, manager] = await Promise.all([
      prisma.user.findUnique({ where: { id: data.employeeId }, select: { name: true, email: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);

    if (employee && manager) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const feedbackUrl = `${baseUrl}/feedbacks/${feedback.id}`;

      // Create notification for the employee
      await prisma.notification.create({
        data: {
          userId: data.employeeId,
          type: "feedback_submitted_auto",
          title: `Novo feedback recebido - ${manager.name}`,
          message: `Você recebeu um novo feedback de ${manager.name} referente ao período ${data.period.trim()}. [feedback_${feedback.id}]`,
          emailSent: true,
        },
      });

      // Send email to the employee
      const html = buildFeedbackSubmittedEmployeeHtml(
        employee.name,
        manager.name,
        data.period.trim(),
        baseUrl
      );
      await sendEmail({
        to: employee.email,
        subject: `[Feedback] Novo feedback de ${manager.name}`,
        html,
      });
    }
  }

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
    scheduledAt: string;
    submit?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
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

  // Can only edit drafts and scheduled
  if (feedback.status !== "draft" && feedback.status !== "scheduled") {
    return { success: false, error: "Apenas feedbacks em rascunho ou agendados podem ser editados" };
  }

  if (!data.period.trim()) {
    return { success: false, error: "Período é obrigatório" };
  }

  if (!data.scheduledAt.trim()) {
    return { success: false, error: "Data da programação é obrigatória" };
  }

  const scheduledAtDate = new Date(data.scheduledAt);
  if (isNaN(scheduledAtDate.getTime())) {
    return { success: false, error: "Data da programação inválida" };
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
      scheduledAt: scheduledAtDate,
      status: data.submit ? "submitted" : (feedback.status === "scheduled" ? "draft" : feedback.status),
    },
  });

  // Recalculate feedback schedule and notify employee after submission
  if (data.submit) {
    await recalculateFeedbackSchedule(feedback.employeeId);

    const [employee, manager] = await Promise.all([
      prisma.user.findUnique({ where: { id: feedback.employeeId }, select: { name: true, email: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);

    if (employee && manager) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const feedbackUrl = `${baseUrl}/feedbacks/${id}`;

      await prisma.notification.create({
        data: {
          userId: feedback.employeeId,
          type: "feedback_submitted_auto",
          title: `Novo feedback recebido - ${manager.name}`,
          message: `Você recebeu um novo feedback de ${manager.name} referente ao período ${data.period.trim()}. [feedback_${id}]`,
          emailSent: true,
        },
      });

      const html = buildFeedbackSubmittedEmployeeHtml(
        employee.name,
        manager.name,
        data.period.trim(),
        baseUrl
      );
      await sendEmail({
        to: employee.email,
        subject: `[Feedback] Novo feedback de ${manager.name}`,
        html,
      });
    }
  }

  revalidatePath("/feedbacks");
  revalidatePath(`/feedbacks/${id}`);
  return { success: true };
}

export async function getAvailableYears(): Promise<number[]> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const accessFilter = await getFeedbackAccessFilter(userId, role);

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

  const feedbacks = await prisma.feedback.findMany({
    where: {
      AND: [whereClause, { employee: { evaluationMode: "feedback" } }],
    },
    select: { createdAt: true, period: true },
    orderBy: { createdAt: "desc" },
  });

  const years = new Set<number>();
  for (const fb of feedbacks) {
    years.add(fb.createdAt.getFullYear());
    // Also extract year from period string if present (e.g., "Q1 2026", "2026-01")
    const match = fb.period.match(/\b(20\d{2})\b/);
    if (match) {
      years.add(parseInt(match[1], 10));
    }
  }

  return Array.from(years).sort((a, b) => b - a);
}

export async function hasMicrosoftToken(): Promise<boolean> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return false;
  const token = await getUserToken(session.user.id);
  return token !== null;
}

export async function fetchRoomsWithAvailability(
  date: string,
  startTime: string,
  endTime: string
): Promise<RoomAvailability[]> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return [];

  const token = await getUserToken(session.user.id);
  if (!token) return [];

  const rooms = await listMeetingRooms(token);
  if (rooms.length === 0) return [];

  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = `${date}T${endTime}:00`;

  const availabilityMap = await getRoomsAvailability(
    token,
    rooms.map((r) => r.emailAddress),
    startDateTime,
    endDateTime
  );

  const result: RoomAvailability[] = rooms.map((room) => ({
    room,
    available: availabilityMap.get(room.emailAddress.toLowerCase()) ?? true,
  }));

  // Sort: available first, then by name
  result.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.room.displayName.localeCompare(b.room.displayName);
  });

  return result;
}

export async function scheduleFeedback(
  id: string,
  scheduledAt: string,
  scheduledTime?: string,
  roomEmail?: string,
  roomDisplayName?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (!feedback) {
    return { success: false, error: "Feedback não encontrado" };
  }

  // Only the manager who created the feedback (or admin) can schedule
  if (role !== "admin" && feedback.managerId !== userId) {
    return { success: false, error: "Apenas o gestor que criou este feedback pode agendá-lo" };
  }

  // Can only schedule drafts and already-scheduled feedbacks
  if (feedback.status !== "draft" && feedback.status !== "scheduled") {
    return { success: false, error: "Apenas feedbacks em rascunho ou agendados podem ser agendados" };
  }

  // Validate all required fields for scheduling (same as submit)
  if (!feedback.content?.trim()) {
    return { success: false, error: "Conteúdo geral é obrigatório para agendar submissão" };
  }
  if (!feedback.strengths?.trim()) {
    return { success: false, error: "Pontos fortes é obrigatório para agendar submissão" };
  }
  if (!feedback.improvements?.trim()) {
    return { success: false, error: "Pontos de melhoria é obrigatório para agendar submissão" };
  }
  if (!feedback.rating || feedback.rating < 1 || feedback.rating > 5) {
    return { success: false, error: "Avaliação (1-5) é obrigatória para agendar submissão" };
  }
  if (!feedback.scheduledAt) {
    return { success: false, error: "Data da programação é obrigatória para agendar submissão" };
  }

  // Validate scheduledAt is a future date
  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return { success: false, error: "Data de agendamento inválida" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduleDay = new Date(scheduledDate);
  scheduleDay.setHours(0, 0, 0, 0);

  if (scheduleDay <= today) {
    return { success: false, error: "A data de agendamento deve ser uma data futura" };
  }

  await prisma.feedback.update({
    where: { id },
    data: {
      status: "scheduled",
      scheduledAt: scheduledDate,
    },
  });

  // Create Outlook calendar event for the manager
  const [employee, manager] = await Promise.all([
    prisma.user.findUnique({ where: { id: feedback.employeeId }, select: { name: true, email: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  if (employee && manager) {
    const time = scheduledTime || "09:00";
    const dateStr = scheduledAt.split("T")[0];
    const startDateTime = `${dateStr}T${time}:00`;
    const [h, m] = time.split(":").map(Number);
    const endDateTime = `${dateStr}T${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const calendarEvent: GraphCalendarEvent = {
      subject: `Feedback — ${employee.name}`,
      start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
      body: {
        contentType: "text",
        content: `Você tem um feedback agendado com seu gestor ${manager.name}.\n\nO feedback é uma ferramenta essencial para o seu desenvolvimento profissional. Aproveite este momento para refletir sobre sua atuação, seus pontos fortes e oportunidades de melhoria.\n\nAcesse o sistema para mais detalhes: ${baseUrl}`,
      },
      attendees: [
        { emailAddress: { address: employee.email, name: employee.name }, type: "required" },
      ],
    };

    if (roomEmail && roomDisplayName) {
      calendarEvent.attendees.push({
        emailAddress: { address: roomEmail, name: roomDisplayName },
        type: "resource",
      });
      calendarEvent.location = {
        displayName: roomDisplayName,
        locationEmailAddress: roomEmail,
      };
    }

    const [managerToken, employeeToken] = await Promise.allSettled([
      getUserToken(userId),
      getUserToken(feedback.employeeId),
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
          where: { id },
          data: { outlookEventId: managerResult.value },
        });
      }
    }
  }

  revalidatePath("/feedbacks");
  revalidatePath(`/feedbacks/${id}`);
  return { success: true };
}

export async function createFutureFeedback(data: {
  employeeId: string;
  scheduledAt: string;
  scheduledTime?: string;
  roomEmail?: string;
  roomDisplayName?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role === "employee") {
    return { success: false, error: "Apenas gestores podem agendar feedbacks" };
  }

  const hasAccess = await canAccessEmployee(userId, role, data.employeeId);
  if (!hasAccess) {
    return { success: false, error: "Você não tem acesso a este colaborador" };
  }

  // data.scheduledAt comes as "YYYY-MM-DD" from the date input
  const [year, month, day] = data.scheduledAt.split("-").map(Number);
  if (!year || !month || !day) {
    return { success: false, error: "Data de agendamento inválida" };
  }
  const scheduledDate = new Date(year, month - 1, day);
  if (isNaN(scheduledDate.getTime())) {
    return { success: false, error: "Data de agendamento inválida" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (scheduledDate <= today) {
    return { success: false, error: "A data de agendamento deve ser uma data futura" };
  }

  // Get employee and manager names for notifications and calendar events
  const [employee, manager] = await Promise.all([
    prisma.user.findUnique({ where: { id: data.employeeId }, select: { name: true, email: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  if (!employee || !manager) {
    console.error("[createFutureFeedback] NOT FOUND — employeeId:", data.employeeId, "employee:", employee, "userId:", userId, "manager:", manager);
    return { success: false, error: "Colaborador ou gestor não encontrado" };
  }

  // Create an empty draft feedback with scheduledAt set to the future date
  const feedback = await prisma.feedback.create({
    data: {
      employeeId: data.employeeId,
      managerId: userId,
      period: "",
      status: "draft",
      scheduledAt: scheduledDate,
    },
  });

  // Notify the employee that a feedback has been scheduled (without content)
  const scheduledDateStr = scheduledDate.toLocaleDateString("pt-BR");
  await prisma.notification.create({
    data: {
      userId: data.employeeId,
      type: "feedback_scheduled",
      title: `Feedback agendado - ${manager.name}`,
      message: `Seu gestor ${manager.name} agendou um feedback para ${scheduledDateStr}. [feedback_future_${feedback.id}]`,
    },
  });

  // Create Outlook calendar events for manager and employee
  const scheduledTime = data.scheduledTime || "09:00";
  const startDateTime = `${data.scheduledAt}T${scheduledTime}:00`;
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const endHours = hours + 1;
  const endDateTime = `${data.scheduledAt}T${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const calendarEvent: GraphCalendarEvent = {
    subject: `Feedback — ${employee.name}`,
    start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
    end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
    body: {
      contentType: "text",
      content: `Você tem um feedback agendado com seu gestor ${manager.name}.\n\nO feedback é uma ferramenta essencial para o seu desenvolvimento profissional. Aproveite este momento para refletir sobre sua atuação, seus pontos fortes e oportunidades de melhoria.\n\nAcesse o sistema para mais detalhes: ${baseUrl}`,
    },
    attendees: [
      { emailAddress: { address: employee.email, name: employee.name }, type: "required" },
    ],
  };

  if (data.roomEmail && data.roomDisplayName) {
    calendarEvent.attendees.push({
      emailAddress: { address: data.roomEmail, name: data.roomDisplayName },
      type: "resource",
    });
    calendarEvent.location = {
      displayName: data.roomDisplayName,
      locationEmailAddress: data.roomEmail,
    };
  }

  const [managerToken, employeeToken] = await Promise.allSettled([
    getUserToken(userId),
    getUserToken(data.employeeId),
  ]);

  const managerAccessToken = managerToken.status === "fulfilled" ? managerToken.value : null;
  const employeeAccessToken = employeeToken.status === "fulfilled" ? employeeToken.value : null;

  const eventPromises: Promise<string | null>[] = [];
  if (managerAccessToken) eventPromises.push(createCalendarEvent(managerAccessToken, calendarEvent));
  if (employeeAccessToken) eventPromises.push(createCalendarEvent(employeeAccessToken, calendarEvent));

  const results = await Promise.allSettled(eventPromises);

  // Save manager's outlookEventId if available
  if (managerAccessToken && results.length > 0) {
    const managerResult = results[0];
    if (managerResult.status === "fulfilled" && managerResult.value) {
      await prisma.feedback.update({
        where: { id: feedback.id },
        data: { outlookEventId: managerResult.value },
      });
    }
  }

  revalidatePath("/feedbacks");
  return { success: true, id: feedback.id };
}

export async function getScheduledFeedbackCountForEmployee(): Promise<number> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) return 0;

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  if (role !== "employee") return 0;

  // Count feedbacks where the employee has upcoming scheduled feedbacks
  // (either draft+scheduledAt for future fill-in, or scheduled for auto-submit)
  const count = await prisma.feedback.count({
    where: {
      employeeId: userId,
      OR: [
        { status: "scheduled" },
        { status: "draft", scheduledAt: { not: null } },
      ],
    },
  });

  return count;
}

export async function rescheduleFeedback(
  id: string,
  newDate: string,
  newTime?: string,
  roomEmail?: string,
  roomDisplayName?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { employee: { select: { name: true } }, manager: { select: { name: true } } },
  });
  if (!feedback) {
    return { success: false, error: "Feedback não encontrado" };
  }

  if (role !== "admin" && feedback.managerId !== userId) {
    return { success: false, error: "Acesso não autorizado" };
  }

  if (feedback.status !== "scheduled" && feedback.status !== "draft") {
    return { success: false, error: "Apenas feedbacks agendados ou em rascunho podem ser reagendados" };
  }

  const scheduledDate = new Date(newDate);
  if (isNaN(scheduledDate.getTime())) {
    return { success: false, error: "Data inválida" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduleDay = new Date(scheduledDate);
  scheduleDay.setHours(0, 0, 0, 0);

  if (scheduleDay <= today) {
    return { success: false, error: "A data deve ser uma data futura" };
  }

  await prisma.feedback.update({
    where: { id },
    data: { scheduledAt: scheduledDate },
  });

  // Update Outlook calendar event if one exists
  if (feedback.outlookEventId) {
    const token = await getUserToken(userId);
    if (token) {
      const time = newTime || "09:00";
      const [rh, rm] = time.split(":").map(Number);
      const startDateTime = `${newDate}T${time}:00`;
      const endDateTime = `${newDate}T${String(rh + 1).padStart(2, "0")}:${String(rm).padStart(2, "0")}:00`;
      const updatePayload: Partial<GraphCalendarEvent> = {
        start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
        end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
      };
      if (roomEmail && roomDisplayName) {
        updatePayload.location = {
          displayName: roomDisplayName,
          locationEmailAddress: roomEmail,
        };
      }
      await updateCalendarEvent(token, feedback.outlookEventId, updatePayload);
    }
  }

  // Notify employee
  const dateStr = scheduledDate.toLocaleDateString("pt-BR");
  await prisma.notification.create({
    data: {
      userId: feedback.employeeId,
      type: "general",
      title: "Feedback reagendado",
      message: `Seu feedback com ${feedback.manager.name} foi reagendado para ${dateStr}. [feedback_reschedule_${id}]`,
    },
  });

  revalidatePath("/feedbacks");
  revalidatePath(`/feedbacks/${id}`);
  revalidatePath("/calendario");
  return { success: true };
}

export async function cancelScheduledFeedback(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { employee: { select: { name: true } }, manager: { select: { name: true } } },
  });
  if (!feedback) {
    return { success: false, error: "Feedback não encontrado" };
  }

  if (role !== "admin" && feedback.managerId !== userId) {
    return { success: false, error: "Acesso não autorizado" };
  }

  if (feedback.status !== "scheduled" && feedback.status !== "draft") {
    return { success: false, error: "Apenas feedbacks agendados ou em rascunho podem ser cancelados" };
  }

  const hasContent = !!(feedback.content?.trim() || feedback.strengths?.trim() || feedback.improvements?.trim());

  if (feedback.status === "scheduled" && !hasContent) {
    // Delete the record entirely if scheduled with no content
    await prisma.feedback.delete({ where: { id } });
  } else {
    // Has content — remove scheduledAt and revert to draft
    await prisma.feedback.update({
      where: { id },
      data: { scheduledAt: null, status: "draft" },
    });
  }

  // Delete Outlook calendar event if one exists
  if (feedback.outlookEventId) {
    const token = await getUserToken(userId);
    if (token) {
      await deleteCalendarEvent(token, feedback.outlookEventId);
    }
  }

  // Notify employee
  const dateStr = feedback.scheduledAt
    ? feedback.scheduledAt.toLocaleDateString("pt-BR")
    : "";
  await prisma.notification.create({
    data: {
      userId: feedback.employeeId,
      type: "general",
      title: "Feedback cancelado",
      message: `O feedback${dateStr ? ` agendado para ${dateStr}` : ""} com ${feedback.manager.name} foi cancelado. [feedback_cancel_${id}]`,
    },
  });

  revalidatePath("/feedbacks");
  revalidatePath(`/feedbacks/${id}`);
  revalidatePath("/calendario");
  return { success: true };
}

export async function cancelScheduleFeedback(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getEffectiveAuth();
  if (!session?.user?.id) {
    return { success: false, error: "Acesso não autorizado" };
  }

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  const feedback = await prisma.feedback.findUnique({ where: { id } });
  if (!feedback) {
    return { success: false, error: "Feedback não encontrado" };
  }

  // Only the manager who created the feedback (or admin) can cancel schedule
  if (role !== "admin" && feedback.managerId !== userId) {
    return { success: false, error: "Apenas o gestor que criou este feedback pode cancelar o agendamento" };
  }

  if (feedback.status !== "scheduled") {
    return { success: false, error: "Apenas feedbacks agendados podem ter o agendamento cancelado" };
  }

  await prisma.feedback.update({
    where: { id },
    data: {
      status: "draft",
      scheduledAt: null,
    },
  });

  revalidatePath("/feedbacks");
  revalidatePath(`/feedbacks/${id}`);
  return { success: true };
}
