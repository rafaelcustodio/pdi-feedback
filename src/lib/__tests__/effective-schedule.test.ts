import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pDISchedule: { findFirst: vi.fn() },
    feedbackSchedule: { findFirst: vi.fn() },
    employeeHierarchy: { findFirst: vi.fn() },
    sectorSchedule: { findUnique: vi.fn() },
    pDI: { updateMany: vi.fn() },
    feedback: { updateMany: vi.fn(), findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { getEffectiveSchedule, handleSectorTransfer } from "../sector-schedule-utils";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  pDISchedule: { findFirst: ReturnType<typeof vi.fn> };
  feedbackSchedule: { findFirst: ReturnType<typeof vi.fn> };
  employeeHierarchy: { findFirst: ReturnType<typeof vi.fn> };
  sectorSchedule: { findUnique: ReturnType<typeof vi.fn> };
  pDI: { updateMany: ReturnType<typeof vi.fn> };
  feedback: { updateMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
};

describe("getEffectiveSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls through to sector schedule for PDI type (no individual PDI schedule)", async () => {
    mockPrisma.employeeHierarchy.findFirst.mockResolvedValue({
      organizationalUnitId: "unit1",
    });
    mockPrisma.sectorSchedule.findUnique.mockResolvedValue({
      id: "ss1",
      organizationalUnitId: "unit1",
      type: "pdi",
      frequencyMonths: 3,
      startDate: new Date(2026, 0, 1),
      isActive: true,
    });

    const result = await getEffectiveSchedule("e1", "pdi");
    expect(result).toEqual({
      source: "sector",
      frequencyMonths: 3,
      startDate: new Date(2026, 0, 1),
      isActive: true,
    });
  });

  it("returns individual feedback schedule when it exists", async () => {
    mockPrisma.feedbackSchedule.findFirst.mockResolvedValue({
      id: "fs1",
      employeeId: "e1",
      managerId: "m1",
      frequencyMonths: 6,
      nextDueDate: new Date(2026, 6, 1),
      isActive: true,
    });

    const result = await getEffectiveSchedule("e1", "feedback");
    expect(result).toEqual({
      source: "individual",
      frequencyMonths: 6,
      startDate: new Date(2026, 6, 1),
      isActive: true,
    });
  });

  it("falls back to sector schedule when no individual exists", async () => {
    mockPrisma.pDISchedule.findFirst.mockResolvedValue(null);
    mockPrisma.employeeHierarchy.findFirst.mockResolvedValue({
      organizationalUnitId: "unit1",
    });
    mockPrisma.sectorSchedule.findUnique.mockResolvedValue({
      id: "ss1",
      organizationalUnitId: "unit1",
      type: "pdi",
      frequencyMonths: 3,
      startDate: new Date(2026, 0, 1),
      isActive: true,
    });

    const result = await getEffectiveSchedule("e1", "pdi");
    expect(result).toEqual({
      source: "sector",
      frequencyMonths: 3,
      startDate: new Date(2026, 0, 1),
      isActive: true,
    });
  });

  it("returns null when no individual or sector schedule exists", async () => {
    mockPrisma.pDISchedule.findFirst.mockResolvedValue(null);
    mockPrisma.employeeHierarchy.findFirst.mockResolvedValue({
      organizationalUnitId: "unit1",
    });
    mockPrisma.sectorSchedule.findUnique.mockResolvedValue(null);

    const result = await getEffectiveSchedule("e1", "pdi");
    expect(result).toBeNull();
  });

  it("returns null when employee has no hierarchy entry", async () => {
    mockPrisma.feedbackSchedule.findFirst.mockResolvedValue(null);
    mockPrisma.employeeHierarchy.findFirst.mockResolvedValue(null);

    const result = await getEffectiveSchedule("e1", "feedback");
    expect(result).toBeNull();
  });

  it("returns null when sector schedule is inactive", async () => {
    mockPrisma.pDISchedule.findFirst.mockResolvedValue(null);
    mockPrisma.employeeHierarchy.findFirst.mockResolvedValue({
      organizationalUnitId: "unit1",
    });
    mockPrisma.sectorSchedule.findUnique.mockResolvedValue({
      id: "ss1",
      organizationalUnitId: "unit1",
      type: "pdi",
      frequencyMonths: 3,
      startDate: new Date(2026, 0, 1),
      isActive: false,
    });

    const result = await getEffectiveSchedule("e1", "pdi");
    expect(result).toBeNull();
  });
});

describe("handleSectorTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels future scheduled feedbacks (not PDIs in continuous model)", async () => {
    mockPrisma.feedback.updateMany.mockResolvedValue({ count: 1 });

    const result = await handleSectorTransfer("e1", "new-unit");

    expect(result).toEqual({ cancelledFeedbacks: 1 });

    // PDI updateMany should NOT be called (PDIs are continuous, not scheduled)
    expect(mockPrisma.pDI.updateMany).not.toHaveBeenCalled();

    // Verify Feedback cancellation excludes onboarding
    expect(mockPrisma.feedback.updateMany).toHaveBeenCalledWith({
      where: {
        employeeId: "e1",
        status: "scheduled",
        scheduledAt: { gt: expect.any(Date) },
        isOnboarding: false,
      },
      data: { status: "cancelled" },
    });
  });

  it("returns zero counts when no events to cancel", async () => {
    mockPrisma.feedback.updateMany.mockResolvedValue({ count: 0 });

    const result = await handleSectorTransfer("e1", "new-unit");
    expect(result).toEqual({ cancelledFeedbacks: 0 });
  });

  it("preserves onboarding feedbacks (only cancels non-onboarding)", async () => {
    mockPrisma.feedback.updateMany.mockResolvedValue({ count: 3 });

    await handleSectorTransfer("e1", "new-unit");

    // The isOnboarding: false filter ensures onboarding feedbacks are untouched
    const feedbackCall = mockPrisma.feedback.updateMany.mock.calls[0][0];
    expect(feedbackCall.where.isOnboarding).toBe(false);
  });
});
