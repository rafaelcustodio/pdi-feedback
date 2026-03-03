import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeSubordinates } from "../hierarchy-utils";
import {
  MOCK_HIERARCHIES,
  ADMIN,
  MANAGER_A,
  COORD_A,
  EMP_A1,
  EMP_A2,
  MANAGER_B,
  EMP_B1,
} from "./fixtures";

// ── Mocks (needed for access-control imports) ─────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    employeeHierarchy: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/impersonation", () => ({
  getEffectiveAuth: vi.fn(),
}));

// Import after mocks
import {
  getAccessibleEmployeeIds,
  canAccessEmployee,
  getPDIAccessFilter,
  getFeedbackAccessFilter,
} from "../access-control";
import { prisma } from "@/lib/prisma";

const mockFindMany = vi.mocked(prisma.employeeHierarchy.findMany);

// ── Existing: computeSubordinates ─────────────────────────────

describe("computeSubordinates", () => {
  // 3-level hierarchy:
  // Level 1: Director (D1)
  // Level 2: Manager1 (M1), Manager2 (M2) - both report to D1
  // Level 3: Employee1 (E1), Employee2 (E2) report to M1; Employee3 (E3) reports to M2
  const hierarchies = [
    { employeeId: "M1", managerId: "D1" },
    { employeeId: "M2", managerId: "D1" },
    { employeeId: "E1", managerId: "M1" },
    { employeeId: "E2", managerId: "M1" },
    { employeeId: "E3", managerId: "M2" },
  ];

  it("returns all direct and indirect subordinates for top-level manager (level 1)", () => {
    const result = computeSubordinates("D1", hierarchies);
    expect(result.sort()).toEqual(["E1", "E2", "E3", "M1", "M2"]);
  });

  it("returns only direct subordinates for mid-level manager (level 2)", () => {
    const m1Result = computeSubordinates("M1", hierarchies);
    expect(m1Result.sort()).toEqual(["E1", "E2"]);

    const m2Result = computeSubordinates("M2", hierarchies);
    expect(m2Result.sort()).toEqual(["E3"]);
  });

  it("returns empty array for employees with no subordinates (level 3)", () => {
    expect(computeSubordinates("E1", hierarchies)).toEqual([]);
    expect(computeSubordinates("E2", hierarchies)).toEqual([]);
    expect(computeSubordinates("E3", hierarchies)).toEqual([]);
  });

  it("returns empty array for unknown user ID", () => {
    expect(computeSubordinates("UNKNOWN", hierarchies)).toEqual([]);
  });

  it("returns empty array when hierarchy list is empty", () => {
    expect(computeSubordinates("D1", [])).toEqual([]);
  });

  it("handles single-level hierarchy (manager with one direct report)", () => {
    const simple = [{ employeeId: "E1", managerId: "M1" }];
    expect(computeSubordinates("M1", simple)).toEqual(["E1"]);
  });

  it("handles deep hierarchy (4+ levels)", () => {
    const deep = [
      { employeeId: "L2", managerId: "L1" },
      { employeeId: "L3", managerId: "L2" },
      { employeeId: "L4", managerId: "L3" },
      { employeeId: "L5", managerId: "L4" },
    ];
    const result = computeSubordinates("L1", deep);
    expect(result).toEqual(["L2", "L3", "L4", "L5"]);
  });
});

// ── getAccessibleEmployeeIds ──────────────────────────────────

describe("getAccessibleEmployeeIds", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue(MOCK_HIERARCHIES as never);
  });

  it("admin returns 'all'", async () => {
    const result = await getAccessibleEmployeeIds(ADMIN.id, ADMIN.role);
    expect(result).toBe("all");
  });

  it("employee returns array with only [userId]", async () => {
    const result = await getAccessibleEmployeeIds(EMP_A1.id, EMP_A1.role);
    expect(result).toEqual([EMP_A1.id]);
  });

  it("manager_a returns self + all indirect subordinates", async () => {
    const result = await getAccessibleEmployeeIds(MANAGER_A.id, MANAGER_A.role);
    expect((result as string[]).sort()).toEqual(
      ["mgr-a", "coord-a", "emp-a1", "emp-a2"].sort()
    );
  });

  it("manager without subordinates returns only [self]", async () => {
    mockFindMany.mockResolvedValue([] as never);
    const result = await getAccessibleEmployeeIds("lone-mgr", "manager");
    expect(result).toEqual(["lone-mgr"]);
  });
});

// ── canAccessEmployee ─────────────────────────────────────────

describe("canAccessEmployee", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue(MOCK_HIERARCHIES as never);
  });

  it("admin can access any employeeId", async () => {
    expect(await canAccessEmployee(ADMIN.id, ADMIN.role, EMP_A1.id)).toBe(true);
    expect(await canAccessEmployee(ADMIN.id, ADMIN.role, EMP_B1.id)).toBe(true);
    expect(await canAccessEmployee(ADMIN.id, ADMIN.role, MANAGER_B.id)).toBe(true);
  });

  it("employee can access only own id", async () => {
    expect(await canAccessEmployee(EMP_A1.id, EMP_A1.role, EMP_A1.id)).toBe(true);
  });

  it("employee cannot access other employee", async () => {
    expect(await canAccessEmployee(EMP_A1.id, EMP_A1.role, EMP_A2.id)).toBe(false);
  });

  it("manager_a can access coord_a, emp_a1, emp_a2", async () => {
    expect(await canAccessEmployee(MANAGER_A.id, MANAGER_A.role, COORD_A.id)).toBe(true);
    expect(await canAccessEmployee(MANAGER_A.id, MANAGER_A.role, EMP_A1.id)).toBe(true);
    expect(await canAccessEmployee(MANAGER_A.id, MANAGER_A.role, EMP_A2.id)).toBe(true);
  });

  it("manager_a cannot access emp_b1 (different branch)", async () => {
    expect(await canAccessEmployee(MANAGER_A.id, MANAGER_A.role, EMP_B1.id)).toBe(false);
  });

  it("manager_a cannot access manager_b (peer at same level)", async () => {
    expect(await canAccessEmployee(MANAGER_A.id, MANAGER_A.role, MANAGER_B.id)).toBe(false);
  });
});

// ── getPDIAccessFilter ────────────────────────────────────────

describe("getPDIAccessFilter", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue(MOCK_HIERARCHIES as never);
  });

  it("admin returns {} (no filter)", async () => {
    expect(await getPDIAccessFilter(ADMIN.id, ADMIN.role)).toEqual({});
  });

  it("employee returns { employeeId: { in: [self] } }", async () => {
    expect(await getPDIAccessFilter(EMP_A1.id, EMP_A1.role)).toEqual({
      employeeId: { in: ["emp-a1"] },
    });
  });

  it("manager_a returns filter with self + subordinates", async () => {
    const result = await getPDIAccessFilter(MANAGER_A.id, MANAGER_A.role);
    const ids = (result as { employeeId: { in: string[] } }).employeeId.in;
    expect(ids.sort()).toEqual(["coord-a", "emp-a1", "emp-a2", "mgr-a"].sort());
  });
});

// ── getFeedbackAccessFilter ───────────────────────────────────

describe("getFeedbackAccessFilter", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindMany.mockResolvedValue(MOCK_HIERARCHIES as never);
  });

  it("admin returns {} (no filter)", async () => {
    expect(await getFeedbackAccessFilter(ADMIN.id, ADMIN.role)).toEqual({});
  });

  it("employee returns { employeeId: { in: [self] } }", async () => {
    expect(await getFeedbackAccessFilter(EMP_A1.id, EMP_A1.role)).toEqual({
      employeeId: { in: ["emp-a1"] },
    });
  });

  it("manager_a returns filter with self + subordinates", async () => {
    const result = await getFeedbackAccessFilter(MANAGER_A.id, MANAGER_A.role);
    const ids = (result as { employeeId: { in: string[] } }).employeeId.in;
    expect(ids.sort()).toEqual(["coord-a", "emp-a1", "emp-a2", "mgr-a"].sort());
  });
});
