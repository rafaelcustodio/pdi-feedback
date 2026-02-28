import { describe, it, expect } from "vitest";
import { computeSubordinates } from "../hierarchy-utils";

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
