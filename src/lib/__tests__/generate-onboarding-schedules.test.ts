import { describe, it, expect, vi, beforeEach } from "vitest";
import { ADMIN, EMP_A1, MANAGER_A, mockSession } from "./fixtures";

// ── Mocks ─────────────────────────────────────────────────────

vi.mock("@/lib/impersonation", () => ({
  getEffectiveAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    employeeHierarchy: { findFirst: vi.fn() },
    feedback: { count: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/access-control", () => ({
  canAccessEmployee: vi.fn(),
}));

vi.mock("@/lib/sector-schedule-utils", () => ({
  snapToBusinessDay: vi.fn((d: Date) => {
    const day = d.getUTCDay();
    if (day === 0) return new Date(d.getTime() + 1 * 86400000); // Sun → Mon
    if (day === 6) return new Date(d.getTime() + 2 * 86400000); // Sat → Mon
    return d;
  }),
  subtractBusinessDays: vi.fn((date: Date, days: number) => {
    const d = new Date(date);
    let remaining = days;
    while (remaining > 0) {
      d.setUTCDate(d.getUTCDate() - 1);
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) remaining--;
    }
    return d;
  }),
  handleSectorTransfer: vi.fn(),
}));

vi.mock("@/lib/schedule-utils", () => ({
  removeScheduledFeedbackEvents: vi.fn(),
}));

vi.mock("@/lib/calendar-event-utils", () => ({
  createCalendarEventForFeedback: vi.fn().mockResolvedValue("mock-event-id"),
  syncOutlookEvent: vi.fn().mockResolvedValue(null),
}));

import { getEffectiveAuth } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { generateOnboardingSchedules } from "@/app/(dashboard)/colaboradores/actions";
import { createCalendarEventForFeedback, syncOutlookEvent } from "@/lib/calendar-event-utils";

const mockGetEffectiveAuth = getEffectiveAuth as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockFindFirst = prisma.employeeHierarchy.findFirst as ReturnType<typeof vi.fn>;
const mockFeedbackCount = prisma.feedback.count as ReturnType<typeof vi.fn>;
const mockCreate = prisma.feedback.create as ReturnType<typeof vi.fn>;
const mockCreateCalendarEvent = createCalendarEventForFeedback as ReturnType<typeof vi.fn>;
const mockSyncOutlookEvent = syncOutlookEvent as ReturnType<typeof vi.fn>;

// Helper: set "now" for date comparisons via vi.useFakeTimers
function setNow(date: Date) {
  vi.setSystemTime(date);
}

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("generateOnboardingSchedules", () => {
  // Default: admin session, employee admitted 10 days ago with manager
  function setupHappyPath(admissionDate?: Date) {
    const now = new Date("2026-03-04T12:00:00Z");
    const admission = admissionDate ?? new Date("2026-02-22T00:00:00Z"); // 10 days ago

    vi.useFakeTimers();
    setNow(now);

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    // findUnique is called for employee first, then for manager
    mockFindUnique.mockImplementation(async (args: { where: { id: string } }) => {
      if (args.where.id === EMP_A1.id) {
        return { id: EMP_A1.id, name: EMP_A1.name, email: EMP_A1.email, admissionDate: admission };
      }
      if (args.where.id === MANAGER_A.id) {
        return { id: MANAGER_A.id, name: MANAGER_A.name, email: MANAGER_A.email };
      }
      return null;
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });
    mockFeedbackCount.mockResolvedValue(0);
    // Return a mock feedback with an id for each create call
    let callCount = 0;
    mockCreate.mockImplementation(async () => {
      callCount++;
      return { id: `feedback-${callCount}` };
    });

    return { now, admission };
  }

  it("generates 4 feedbacks with correct dates (happy path)", async () => {
    const { admission } = setupHappyPath();

    const result = await generateOnboardingSchedules(EMP_A1.id);

    expect(result.success).toBe(true);
    expect(result.created).toHaveLength(4);

    // Verify create was called 4 times
    expect(mockCreate).toHaveBeenCalledTimes(4);

    const calls = mockCreate.mock.calls.map((c: unknown[]) => (c[0] as { data: Record<string, unknown> }).data);

    // 45d: manager_feedback + hr_conversation
    expect(calls[0].onboardingType).toBe("manager_feedback");
    expect(calls[0].managerId).toBe(MANAGER_A.id);
    expect(calls[0].period).toBe("Onboarding 45d");
    expect(calls[1].onboardingType).toBe("hr_conversation");
    expect(calls[1].managerId).toBe(ADMIN.id);
    expect(calls[1].period).toBe("Onboarding 45d");

    // HR date should be 5 business days before manager date
    const manager45Date = calls[0].scheduledAt as Date;
    const hr45Date = calls[1].scheduledAt as Date;
    expect(hr45Date.getTime()).toBeLessThan(manager45Date.getTime());

    // 90d: manager_feedback + hr_conversation
    expect(calls[2].onboardingType).toBe("manager_feedback");
    expect(calls[2].managerId).toBe(MANAGER_A.id);
    expect(calls[2].period).toBe("Onboarding 90d");
    expect(calls[3].onboardingType).toBe("hr_conversation");
    expect(calls[3].managerId).toBe(ADMIN.id);
    expect(calls[3].period).toBe("Onboarding 90d");

    const manager90Date = calls[2].scheduledAt as Date;
    const hr90Date = calls[3].scheduledAt as Date;
    expect(hr90Date.getTime()).toBeLessThan(manager90Date.getTime());

    // All should be scheduled onboarding feedbacks
    for (const s of calls) {
      expect(s.status).toBe("scheduled");
      expect(s.isOnboarding).toBe(true);
      expect(s.employeeId).toBe(EMP_A1.id);
    }
  });

  it("creates calendar events for each feedback", async () => {
    setupHappyPath();

    await generateOnboardingSchedules(EMP_A1.id);

    // Should create 4 calendar events
    expect(mockCreateCalendarEvent).toHaveBeenCalledTimes(4);

    // Verify calendar event titles
    const calendarCalls = mockCreateCalendarEvent.mock.calls;
    expect(calendarCalls[0][0].title).toContain("Feedback Gestor");
    expect(calendarCalls[0][0].title).toContain("Onboarding 45d");
    expect(calendarCalls[1][0].title).toContain("Conversa RH");
    expect(calendarCalls[1][0].title).toContain("Onboarding 45d");
    expect(calendarCalls[2][0].title).toContain("Feedback Gestor");
    expect(calendarCalls[2][0].title).toContain("Onboarding 90d");
    expect(calendarCalls[3][0].title).toContain("Conversa RH");
    expect(calendarCalls[3][0].title).toContain("Onboarding 90d");

    // Verify feedbackId is passed
    for (const call of calendarCalls) {
      expect(call[0].feedbackId).toBeDefined();
      expect(call[0].employeeId).toBe(EMP_A1.id);
    }
  });

  it("adjusts weekend dates to next Monday", async () => {
    // 2026-01-15 + 45d = 2026-03-01 (Sunday) → should move to Monday 2026-03-02
    const admission = new Date("2026-01-15T00:00:00Z");
    const now = new Date("2026-01-20T12:00:00Z"); // 5 days after admission

    vi.useFakeTimers();
    setNow(now);

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockImplementation(async (args: { where: { id: string } }) => {
      if (args.where.id === EMP_A1.id) {
        return { id: EMP_A1.id, name: EMP_A1.name, email: EMP_A1.email, admissionDate: admission };
      }
      if (args.where.id === MANAGER_A.id) {
        return { id: MANAGER_A.id, name: MANAGER_A.name, email: MANAGER_A.email };
      }
      return null;
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });
    mockFeedbackCount.mockResolvedValue(0);
    let callCount = 0;
    mockCreate.mockImplementation(async () => {
      callCount++;
      return { id: `feedback-${callCount}` };
    });

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(true);

    // The snapToBusinessDay mock moves Sun→Mon, Sat→Mon
    const calls = mockCreate.mock.calls.map((c: unknown[]) => (c[0] as { data: Record<string, unknown> }).data);
    for (const s of calls) {
      const day = (s.scheduledAt as Date).getUTCDay();
      expect(day).not.toBe(0); // not Sunday
      expect(day).not.toBe(6); // not Saturday
    }
  });

  it("returns error when employee has > 90 days since admission", async () => {
    const admission = new Date("2025-12-01T00:00:00Z"); // ~93 days ago from 2026-03-04
    const now = new Date("2026-03-04T12:00:00Z");

    vi.useFakeTimers();
    setNow(now);

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      email: EMP_A1.email,
      admissionDate: admission,
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("dias de casa");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns error when admissionDate is missing", async () => {
    vi.useFakeTimers();
    setNow(new Date("2026-03-04T12:00:00Z"));

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      email: EMP_A1.email,
      admissionDate: null,
    });

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("data de admissão");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns error when no manager is assigned", async () => {
    vi.useFakeTimers();
    setNow(new Date("2026-03-04T12:00:00Z"));

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      email: EMP_A1.email,
      admissionDate: new Date("2026-02-22T00:00:00Z"),
    });
    mockFindFirst.mockResolvedValue(null);

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("gestor");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns error when pending onboarding feedbacks already exist", async () => {
    vi.useFakeTimers();
    setNow(new Date("2026-03-04T12:00:00Z"));

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      email: EMP_A1.email,
      admissionDate: new Date("2026-02-22T00:00:00Z"),
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });
    mockFeedbackCount.mockResolvedValue(2); // existing scheduled onboarding

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("pendentes");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates only 90d schedules when 45d dates have passed", async () => {
    // Admission 50 days ago: 45d is in the past, 90d is in the future
    const now = new Date("2026-03-04T12:00:00Z");
    const admission = new Date(now.getTime() - 50 * 86400000);

    vi.useFakeTimers();
    setNow(now);

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockImplementation(async (args: { where: { id: string } }) => {
      if (args.where.id === EMP_A1.id) {
        return { id: EMP_A1.id, name: EMP_A1.name, email: EMP_A1.email, admissionDate: admission };
      }
      if (args.where.id === MANAGER_A.id) {
        return { id: MANAGER_A.id, name: MANAGER_A.name, email: MANAGER_A.email };
      }
      return null;
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });
    mockFeedbackCount.mockResolvedValue(0);
    let callCount = 0;
    mockCreate.mockImplementation(async () => {
      callCount++;
      return { id: `feedback-${callCount}` };
    });

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(true);
    expect(result.created).toHaveLength(2);

    expect(mockCreate).toHaveBeenCalledTimes(2);
    const calls = mockCreate.mock.calls.map((c: unknown[]) => (c[0] as { data: Record<string, unknown> }).data);
    expect(calls[0].period).toBe("Onboarding 90d");
    expect(calls[0].onboardingType).toBe("manager_feedback");
    expect(calls[1].period).toBe("Onboarding 90d");
    expect(calls[1].onboardingType).toBe("hr_conversation");
  });

  it("manager_feedback uses manager ID and hr_conversation uses admin ID", async () => {
    setupHappyPath();

    await generateOnboardingSchedules(EMP_A1.id);

    const calls = mockCreate.mock.calls.map((c: unknown[]) => (c[0] as { data: Record<string, unknown> }).data);
    // manager_feedback entries
    const managerFeedbacks = calls.filter(
      (s: Record<string, unknown>) => s.onboardingType === "manager_feedback"
    );
    const hrConversations = calls.filter(
      (s: Record<string, unknown>) => s.onboardingType === "hr_conversation"
    );

    for (const mf of managerFeedbacks) {
      expect(mf.managerId).toBe(MANAGER_A.id);
    }
    for (const hr of hrConversations) {
      expect(hr.managerId).toBe(ADMIN.id);
    }
  });

  it("returns error when user is not admin", async () => {
    mockGetEffectiveAuth.mockResolvedValue(mockSession(MANAGER_A));

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("não autorizado");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns error when employee is not found", async () => {
    vi.useFakeTimers();
    setNow(new Date("2026-03-04T12:00:00Z"));

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue(null);

    const result = await generateOnboardingSchedules("nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toContain("não encontrado");
  });

  it("passes room and time config to calendar events", async () => {
    setupHappyPath();

    await generateOnboardingSchedules(EMP_A1.id, {
      events: {
        manager_45: { time: "10:30", roomEmail: "sala1@test.com", roomDisplayName: "Sala 1" },
        hr_45: { time: "14:30" },
        manager_90: { time: "08:30", roomEmail: "sala2@test.com", roomDisplayName: "Sala 2" },
        hr_90: { time: "16:30" },
      },
    });

    expect(mockCreateCalendarEvent).toHaveBeenCalledTimes(4);

    const calCalls = mockCreateCalendarEvent.mock.calls;
    // manager_45 should have room
    expect(calCalls[0][0].roomEmail).toBe("sala1@test.com");
    expect(calCalls[0][0].roomDisplayName).toBe("Sala 1");
    // hr_45 no room
    expect(calCalls[1][0].roomEmail).toBeUndefined();
    // manager_90 has room
    expect(calCalls[2][0].roomEmail).toBe("sala2@test.com");
    expect(calCalls[2][0].roomDisplayName).toBe("Sala 2");
    // hr_90 no room
    expect(calCalls[3][0].roomEmail).toBeUndefined();

    // Verify times applied to scheduledAt
    const feedbackCalls = mockCreate.mock.calls.map((c: unknown[]) => (c[0] as { data: Record<string, unknown> }).data);
    expect((feedbackCalls[0].scheduledAt as Date).getUTCHours()).toBe(10);
    expect((feedbackCalls[0].scheduledAt as Date).getUTCMinutes()).toBe(30);
    expect((feedbackCalls[1].scheduledAt as Date).getUTCHours()).toBe(14);
    expect((feedbackCalls[1].scheduledAt as Date).getUTCMinutes()).toBe(30);
  });

  it("defaults to 09:30 when no events config provided (backward compat)", async () => {
    setupHappyPath();

    await generateOnboardingSchedules(EMP_A1.id);

    const feedbackCalls = mockCreate.mock.calls.map((c: unknown[]) => (c[0] as { data: Record<string, unknown> }).data);
    for (const call of feedbackCalls) {
      expect((call.scheduledAt as Date).getUTCHours()).toBe(9);
      expect((call.scheduledAt as Date).getUTCMinutes()).toBe(30);
    }
  });

  it("syncs Outlook with admin as organizer (not manager)", async () => {
    setupHappyPath();

    await generateOnboardingSchedules(EMP_A1.id);

    // syncOutlookEvent should be called 4 times (one per feedback)
    expect(mockSyncOutlookEvent).toHaveBeenCalledTimes(4);

    for (const call of mockSyncOutlookEvent.mock.calls) {
      const params = call[0] as {
        organizerUserId: string;
        attendeeUserIds: string[];
        sourceType: string;
        sourceId: string;
      };
      // Organizer must always be the admin (session.user.id), never the manager
      expect(params.organizerUserId).toBe(ADMIN.id);
      // Attendees must include both manager and employee
      expect(params.attendeeUserIds).toContain(MANAGER_A.id);
      expect(params.attendeeUserIds).toContain(EMP_A1.id);
      expect(params.sourceType).toBe("feedback");
      expect(params.sourceId).toBeDefined();
    }
  });
});
