import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pDISchedule: { findFirst: vi.fn() },
    feedbackSchedule: { findFirst: vi.fn() },
    employeeHierarchy: { findFirst: vi.fn() },
    sectorSchedule: { findUnique: vi.fn() },
  },
}));

import { getEffectiveSchedule } from "../sector-schedule-utils";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  pDISchedule: { findFirst: ReturnType<typeof vi.fn> };
  feedbackSchedule: { findFirst: ReturnType<typeof vi.fn> };
  employeeHierarchy: { findFirst: ReturnType<typeof vi.fn> };
  sectorSchedule: { findUnique: ReturnType<typeof vi.fn> };
};

describe("getEffectiveSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns individual PDI schedule when it exists", async () => {
    mockPrisma.pDISchedule.findFirst.mockResolvedValue({
      id: "ps1",
      employeeId: "e1",
      managerId: "m1",
      frequencyMonths: 3,
      nextDueDate: new Date(2026, 3, 1),
      isActive: true,
    });

    const result = await getEffectiveSchedule("e1", "pdi");
    expect(result).toEqual({
      source: "individual",
      frequencyMonths: 3,
      startDate: new Date(2026, 3, 1),
      isActive: true,
    });
    // Should not query sector schedule
    expect(mockPrisma.employeeHierarchy.findFirst).not.toHaveBeenCalled();
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
