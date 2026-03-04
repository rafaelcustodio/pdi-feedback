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
    feedback: { count: vi.fn(), createMany: vi.fn() },
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
    const day = d.getDay();
    if (day === 0) return new Date(d.getTime() + 1 * 86400000); // Sun → Mon
    if (day === 6) return new Date(d.getTime() + 2 * 86400000); // Sat → Mon
    return d;
  }),
  handleSectorTransfer: vi.fn(),
}));

vi.mock("@/lib/schedule-utils", () => ({
  removeScheduledFeedbackEvents: vi.fn(),
}));

import { getEffectiveAuth } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { generateOnboardingSchedules } from "@/app/(dashboard)/colaboradores/actions";

const mockGetEffectiveAuth = getEffectiveAuth as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockFindFirst = prisma.employeeHierarchy.findFirst as ReturnType<typeof vi.fn>;
const mockFeedbackCount = prisma.feedback.count as ReturnType<typeof vi.fn>;
const mockCreateMany = prisma.feedback.createMany as ReturnType<typeof vi.fn>;

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
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      admissionDate: admission,
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });
    mockFeedbackCount.mockResolvedValue(0);
    mockCreateMany.mockResolvedValue({ count: 4 });

    return { now, admission };
  }

  it("generates 4 feedbacks with correct dates (happy path)", async () => {
    const { admission } = setupHappyPath();

    const result = await generateOnboardingSchedules(EMP_A1.id);

    expect(result.success).toBe(true);
    expect(result.created).toHaveLength(4);

    // Verify createMany was called with 4 schedules
    expect(mockCreateMany).toHaveBeenCalledOnce();
    const data = mockCreateMany.mock.calls[0][0].data;
    expect(data).toHaveLength(4);

    // 45d: manager_feedback + hr_conversation
    const d45 = new Date(admission.getTime() + 45 * 86400000);
    expect(data[0].onboardingType).toBe("manager_feedback");
    expect(data[0].managerId).toBe(MANAGER_A.id);
    expect(data[0].period).toBe("Onboarding 45d");
    expect(data[1].onboardingType).toBe("hr_conversation");
    expect(data[1].managerId).toBe(ADMIN.id);
    expect(data[1].period).toBe("Onboarding 45d");

    // 90d: manager_feedback + hr_conversation
    expect(data[2].onboardingType).toBe("manager_feedback");
    expect(data[2].managerId).toBe(MANAGER_A.id);
    expect(data[2].period).toBe("Onboarding 90d");
    expect(data[3].onboardingType).toBe("hr_conversation");
    expect(data[3].managerId).toBe(ADMIN.id);
    expect(data[3].period).toBe("Onboarding 90d");

    // All should be scheduled onboarding feedbacks
    for (const s of data) {
      expect(s.status).toBe("scheduled");
      expect(s.isOnboarding).toBe(true);
      expect(s.employeeId).toBe(EMP_A1.id);
    }
  });

  it("adjusts weekend dates to next Monday", async () => {
    // 2026-01-10 (Saturday) + 45d = 2026-02-24 (Tuesday) — no adjustment
    // Let's pick a date where +45 falls on Saturday
    // 2026-01-17 + 45d = 2026-03-03 (Tuesday)
    // 2026-01-15 + 45d = 2026-03-01 (Sunday) → should move to Monday 2026-03-02
    const admission = new Date("2026-01-15T00:00:00Z");
    const now = new Date("2026-01-20T12:00:00Z"); // 5 days after admission

    vi.useFakeTimers();
    setNow(now);

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      admissionDate: admission,
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });
    mockFeedbackCount.mockResolvedValue(0);
    mockCreateMany.mockResolvedValue({ count: 4 });

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(true);

    // The snapToBusinessDay mock moves Sun→Mon, Sat→Mon
    const data = mockCreateMany.mock.calls[0][0].data;
    for (const s of data) {
      const day = s.scheduledAt.getDay();
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
      admissionDate: admission,
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("dias de casa");
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("returns error when admissionDate is missing", async () => {
    vi.useFakeTimers();
    setNow(new Date("2026-03-04T12:00:00Z"));

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      admissionDate: null,
    });

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("data de admissão");
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("returns error when no manager is assigned", async () => {
    vi.useFakeTimers();
    setNow(new Date("2026-03-04T12:00:00Z"));

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      admissionDate: new Date("2026-02-22T00:00:00Z"),
    });
    mockFindFirst.mockResolvedValue(null);

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("gestor");
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("returns error when pending onboarding feedbacks already exist", async () => {
    vi.useFakeTimers();
    setNow(new Date("2026-03-04T12:00:00Z"));

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      admissionDate: new Date("2026-02-22T00:00:00Z"),
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });
    mockFeedbackCount.mockResolvedValue(2); // existing scheduled onboarding

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("pendentes");
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("creates only 90d schedules when 45d dates have passed", async () => {
    // Admission 50 days ago: 45d is in the past, 90d is in the future
    const now = new Date("2026-03-04T12:00:00Z");
    const admission = new Date(now.getTime() - 50 * 86400000);

    vi.useFakeTimers();
    setNow(now);

    mockGetEffectiveAuth.mockResolvedValue(mockSession(ADMIN));
    mockFindUnique.mockResolvedValue({
      id: EMP_A1.id,
      name: EMP_A1.name,
      admissionDate: admission,
    });
    mockFindFirst.mockResolvedValue({ managerId: MANAGER_A.id });
    mockFeedbackCount.mockResolvedValue(0);
    mockCreateMany.mockResolvedValue({ count: 2 });

    const result = await generateOnboardingSchedules(EMP_A1.id);
    expect(result.success).toBe(true);
    expect(result.created).toHaveLength(2);

    const data = mockCreateMany.mock.calls[0][0].data;
    expect(data).toHaveLength(2);
    expect(data[0].period).toBe("Onboarding 90d");
    expect(data[0].onboardingType).toBe("manager_feedback");
    expect(data[1].period).toBe("Onboarding 90d");
    expect(data[1].onboardingType).toBe("hr_conversation");
  });

  it("manager_feedback uses manager ID and hr_conversation uses admin ID", async () => {
    setupHappyPath();

    await generateOnboardingSchedules(EMP_A1.id);

    const data = mockCreateMany.mock.calls[0][0].data;
    // manager_feedback entries
    const managerFeedbacks = data.filter(
      (s: { onboardingType: string }) => s.onboardingType === "manager_feedback"
    );
    const hrConversations = data.filter(
      (s: { onboardingType: string }) => s.onboardingType === "hr_conversation"
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
    expect(mockCreateMany).not.toHaveBeenCalled();
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
});
