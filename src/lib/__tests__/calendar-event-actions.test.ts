import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ADMIN,
  MANAGER_A,
  EMP_A1,
  MANAGER_B,
  mockSession,
  mockCalendarEvent,
} from "./fixtures";

// ── Mocks ─────────────────────────────────────────────────────

vi.mock("@/lib/impersonation", () => ({
  getEffectiveAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    calendarEvent: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    calendarEventParticipant: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    feedback: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pDIFollowUp: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/access-control", () => ({
  canAccessEmployee: vi.fn(),
}));

vi.mock("@/lib/calendar-event-utils", () => ({
  syncCalendarEventStatus: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getEffectiveAuth } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { canAccessEmployee } from "@/lib/access-control";
import {
  getCalendarEventById,
  updateCalendarEvent,
  addParticipant,
  removeParticipant,
  cancelCalendarEvent,
} from "@/app/(dashboard)/calendario/event-actions";

const mockGetEffectiveAuth = getEffectiveAuth as ReturnType<typeof vi.fn>;
const mockCanAccessEmployee = canAccessEmployee as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.calendarEvent.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.calendarEvent.update as ReturnType<typeof vi.fn>;

// ── Tests ─────────────────────────────────────────────────────

describe("getCalendarEventById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if not authenticated", async () => {
    mockGetEffectiveAuth.mockResolvedValue(null);
    const result = await getCalendarEventById("cal-event-1");
    expect(result).toBeNull();
  });

  it("returns null if event not found", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue(null);
    const result = await getCalendarEventById("nonexistent");
    expect(result).toBeNull();
  });

  it("allows admin to see any event", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockCanAccessEmployee.mockResolvedValue(true);
    const event = mockCalendarEvent();
    mockFindUnique.mockResolvedValue({
      ...event,
      employee: { name: "Emp A1" },
      manager: { name: "Mgr A" },
      pdiFollowUp: null,
      participants: [],
    });

    const result = await getCalendarEventById("cal-event-1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("cal-event-1");
    expect(result!.employeeName).toBe("Emp A1");
  });

  it("allows manager to see their subordinate events", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(MANAGER_A));
    mockCanAccessEmployee.mockResolvedValue(true);
    const event = mockCalendarEvent();
    mockFindUnique.mockResolvedValue({
      ...event,
      employee: { name: "Emp A1" },
      manager: { name: "Mgr A" },
      pdiFollowUp: null,
      participants: [],
    });

    const result = await getCalendarEventById("cal-event-1");
    expect(result).not.toBeNull();
  });

  it("denies employee access to other employees events", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(EMP_A1));
    mockCanAccessEmployee.mockResolvedValue(false);
    const event = mockCalendarEvent({ employeeId: "emp-b1" });
    mockFindUnique.mockResolvedValue({
      ...event,
      employee: { name: "Emp B1" },
      manager: { name: "Mgr B" },
      pdiFollowUp: null,
      participants: [],
    });

    const result = await getCalendarEventById("cal-event-1");
    expect(result).toBeNull();
  });
});

describe("updateCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects employee edits", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(EMP_A1));
    const result = await updateCalendarEvent("cal-event-1", {
      durationMinutes: 90,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("gestores");
  });

  it("rejects non-owner manager", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(MANAGER_B));
    const event = mockCalendarEvent({ managerId: "mgr-a" });
    mockFindUnique.mockResolvedValue(event);

    const result = await updateCalendarEvent("cal-event-1", {
      durationMinutes: 90,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("gestor responsável");
  });

  it("allows admin to update any event", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    const event = mockCalendarEvent();
    mockFindUnique.mockResolvedValue(event);
    mockUpdate.mockResolvedValue({ ...event, durationMinutes: 90 });

    const result = await updateCalendarEvent("cal-event-1", {
      durationMinutes: 90,
    });
    expect(result.success).toBe(true);
  });

  it("propagates scheduledAt to linked feedback", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    const event = mockCalendarEvent({ feedbackId: "feedback-1" });
    mockFindUnique.mockResolvedValue(event);
    mockUpdate.mockResolvedValue({
      ...event,
      scheduledAt: new Date("2025-04-01T10:00:00Z"),
    });
    (prisma.feedback.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await updateCalendarEvent("cal-event-1", {
      scheduledAt: "2025-04-01T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
    expect(prisma.feedback.update).toHaveBeenCalledWith({
      where: { id: "feedback-1" },
      data: { scheduledAt: expect.any(Date) },
    });
  });

  it("rejects editing non-scheduled events", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    const event = mockCalendarEvent({ status: "completed" });
    mockFindUnique.mockResolvedValue(event);

    const result = await updateCalendarEvent("cal-event-1", {
      durationMinutes: 90,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("agendados");
  });
});

describe("addParticipant / removeParticipant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects employee adding participants", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(EMP_A1));
    const result = await addParticipant("cal-event-1", {
      externalEmail: "test@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("allows manager to add participant", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(MANAGER_A));
    const event = mockCalendarEvent({ managerId: "mgr-a" });
    mockFindUnique.mockResolvedValue(event);
    (prisma.calendarEventParticipant.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p-1",
    });

    const result = await addParticipant("cal-event-1", {
      externalEmail: "test@example.com",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe("p-1");
  });

  it("rejects employee removing participants", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(EMP_A1));
    const result = await removeParticipant("cal-event-1", "p-1");
    expect(result.success).toBe(false);
  });
});

describe("cancelCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects employee cancellation", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(EMP_A1));
    const result = await cancelCalendarEvent("cal-event-1");
    expect(result.success).toBe(false);
  });

  it("cancels event and linked feedback", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    const event = mockCalendarEvent({ feedbackId: "feedback-1" });
    mockFindUnique.mockResolvedValue(event);
    mockUpdate.mockResolvedValue({ ...event, status: "cancelled" });
    (prisma.feedback.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "scheduled",
    });
    (prisma.feedback.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await cancelCalendarEvent("cal-event-1");
    expect(result.success).toBe(true);
    expect(prisma.calendarEvent.update).toHaveBeenCalledWith({
      where: { id: "cal-event-1" },
      data: { status: "cancelled" },
    });
    expect(prisma.feedback.update).toHaveBeenCalledWith({
      where: { id: "feedback-1" },
      data: { status: "cancelled" },
    });
  });

  it("cancels event and linked PDI follow-up", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    const event = mockCalendarEvent({
      type: "pdi_followup",
      feedbackId: null,
      pdiFollowUpId: "followup-1",
    });
    mockFindUnique.mockResolvedValue(event);
    mockUpdate.mockResolvedValue({ ...event, status: "cancelled" });
    (prisma.pDIFollowUp.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "scheduled",
    });
    (prisma.pDIFollowUp.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await cancelCalendarEvent("cal-event-1");
    expect(result.success).toBe(true);
    expect(prisma.pDIFollowUp.update).toHaveBeenCalledWith({
      where: { id: "followup-1" },
      data: { status: "cancelled" },
    });
  });

  it("rejects cancelling non-scheduled events", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    const event = mockCalendarEvent({ status: "completed" });
    mockFindUnique.mockResolvedValue(event);

    const result = await cancelCalendarEvent("cal-event-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("agendados");
  });
});
