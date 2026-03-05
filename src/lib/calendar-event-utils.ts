import { prisma } from "@/lib/prisma";
import {
  getUserToken,
  createCalendarEvent,
} from "@/lib/microsoft-graph";
import type { GraphCalendarEvent } from "@/lib/microsoft-graph";

/**
 * Create a CalendarEvent linked to a Feedback.
 */
export async function createCalendarEventForFeedback(params: {
  feedbackId: string;
  employeeId: string;
  managerId: string;
  employeeName: string;
  scheduledAt: Date;
  durationMinutes?: number;
  roomEmail?: string;
  roomDisplayName?: string;
  outlookEventId?: string;
  title?: string;
}): Promise<string> {
  const event = await prisma.calendarEvent.create({
    data: {
      type: "feedback",
      title: params.title ?? `Feedback — ${params.employeeName}`,
      scheduledAt: params.scheduledAt,
      durationMinutes: params.durationMinutes ?? 60,
      roomEmail: params.roomEmail ?? null,
      roomDisplayName: params.roomDisplayName ?? null,
      outlookEventId: params.outlookEventId ?? null,
      employeeId: params.employeeId,
      managerId: params.managerId,
      feedbackId: params.feedbackId,
    },
  });
  return event.id;
}

/**
 * Create a CalendarEvent linked to a PDIFollowUp.
 */
export async function createCalendarEventForFollowUp(params: {
  pdiFollowUpId: string;
  employeeId: string;
  managerId: string;
  employeeName: string;
  scheduledAt: Date;
  durationMinutes?: number;
  roomEmail?: string;
  roomDisplayName?: string;
  outlookEventId?: string;
}): Promise<string> {
  const event = await prisma.calendarEvent.create({
    data: {
      type: "pdi_followup",
      title: `Acompanhamento PDI — ${params.employeeName}`,
      scheduledAt: params.scheduledAt,
      durationMinutes: params.durationMinutes ?? 60,
      roomEmail: params.roomEmail ?? null,
      roomDisplayName: params.roomDisplayName ?? null,
      outlookEventId: params.outlookEventId ?? null,
      employeeId: params.employeeId,
      managerId: params.managerId,
      pdiFollowUpId: params.pdiFollowUpId,
    },
  });
  return event.id;
}

/**
 * Sync CalendarEvent status when the linked Feedback or PDIFollowUp changes status.
 */
export async function syncCalendarEventStatus(
  sourceId: string,
  sourceType: "feedback" | "pdi_followup",
  newStatus: "scheduled" | "completed" | "cancelled"
): Promise<void> {
  const where =
    sourceType === "feedback"
      ? { feedbackId: sourceId }
      : { pdiFollowUpId: sourceId };

  await prisma.calendarEvent.updateMany({
    where,
    data: { status: newStatus },
  });
}

/**
 * Update room information on a CalendarEvent.
 */
export async function updateCalendarEventRoom(
  calendarEventId: string,
  roomEmail: string | null,
  roomDisplayName: string | null
): Promise<void> {
  await prisma.calendarEvent.update({
    where: { id: calendarEventId },
    data: { roomEmail, roomDisplayName },
  });
}

/**
 * Update scheduledAt on a CalendarEvent and propagate to linked Feedback/PDIFollowUp.
 */
export async function updateCalendarEventSchedule(
  calendarEventId: string,
  scheduledAt: Date
): Promise<void> {
  const event = await prisma.calendarEvent.update({
    where: { id: calendarEventId },
    data: { scheduledAt },
  });

  // Propagate to linked record
  if (event.feedbackId) {
    await prisma.feedback.update({
      where: { id: event.feedbackId },
      data: { scheduledAt },
    });
  }
  if (event.pdiFollowUpId) {
    await prisma.pDIFollowUp.update({
      where: { id: event.pdiFollowUpId },
      data: { scheduledAt },
    });
  }
}

/**
 * Generic Outlook sync: creates the event on the organizer's calendar,
 * fire-and-forget copies for each attendee, saves outlookEventId on the source record.
 *
 * Returns the outlookEventId from the organizer's calendar (or null if no token).
 */
export async function syncOutlookEvent(params: {
  organizerUserId: string;
  attendeeUserIds: string[];
  graphEvent: GraphCalendarEvent;
  sourceType: "feedback" | "pdi_followup";
  sourceId: string;
}): Promise<string | null> {
  const { organizerUserId, attendeeUserIds, graphEvent, sourceType, sourceId } = params;

  // Get organizer token
  const organizerToken = await getUserToken(organizerUserId);

  let outlookEventId: string | null = null;

  // Create on organizer's calendar
  if (organizerToken) {
    try {
      outlookEventId = await createCalendarEvent(organizerToken, graphEvent);
    } catch {
      // Outlook sync is best-effort
    }
  }

  // Fire-and-forget: create on each attendee's calendar
  for (const attendeeId of attendeeUserIds) {
    if (attendeeId === organizerUserId) continue; // already created above
    getUserToken(attendeeId)
      .then((token) => {
        if (token) return createCalendarEvent(token, graphEvent);
        return null;
      })
      .catch(() => {
        // best-effort
      });
  }

  // Save outlookEventId on source record
  if (outlookEventId) {
    if (sourceType === "feedback") {
      await prisma.feedback.update({
        where: { id: sourceId },
        data: { outlookEventId },
      });
    } else {
      await prisma.pDIFollowUp.update({
        where: { id: sourceId },
        data: { outlookEventId },
      });
    }
  }

  return outlookEventId;
}
