import { describe, it, expect } from "vitest";
import {
  calculatePeriods,
  getCurrentPeriod,
} from "../sector-schedule-utils";

describe("calculatePeriods", () => {
  const startDate = new Date(2026, 0, 1); // Jan 1, 2026
  const referenceDate = new Date(2026, 2, 15); // Mar 15, 2026

  it("generates monthly periods (frequencyMonths=1)", () => {
    const periods = calculatePeriods(1, startDate, referenceDate);
    // Should cover 2025 + 2026 = 24 months
    expect(periods.length).toBe(24);
    expect(periods[0].label).toBe("Jan/2025");
    expect(periods[0].start).toEqual(new Date(2025, 0, 1));
    expect(periods[0].end).toEqual(new Date(2025, 1, 0, 23, 59, 59, 999)); // Jan 31
    expect(periods[12].label).toBe("Jan/2026");
    expect(periods[23].label).toBe("Dez/2026");
  });

  it("generates bimonthly periods (frequencyMonths=2)", () => {
    const periods = calculatePeriods(2, startDate, referenceDate);
    expect(periods.length).toBe(12);
    expect(periods[0].label).toBe("Jan-Fev/2025");
    expect(periods[0].start).toEqual(new Date(2025, 0, 1));
    expect(periods[0].end).toEqual(new Date(2025, 2, 0, 23, 59, 59, 999)); // Feb 28
    expect(periods[6].label).toBe("Jan-Fev/2026");
    expect(periods[11].label).toBe("Nov-Dez/2026");
  });

  it("generates quarterly periods (frequencyMonths=3)", () => {
    const periods = calculatePeriods(3, startDate, referenceDate);
    expect(periods.length).toBe(8);
    expect(periods[0].label).toBe("Jan-Mar/2025");
    expect(periods[0].start).toEqual(new Date(2025, 0, 1));
    expect(periods[0].end).toEqual(new Date(2025, 3, 0, 23, 59, 59, 999)); // Mar 31
    expect(periods[1].label).toBe("Abr-Jun/2025");
    expect(periods[4].label).toBe("Jan-Mar/2026");
    expect(periods[5].label).toBe("Abr-Jun/2026");
  });

  it("generates semi-annual periods (frequencyMonths=6)", () => {
    const periods = calculatePeriods(6, startDate, referenceDate);
    expect(periods.length).toBe(4);
    expect(periods[0].label).toBe("Jan-Jun/2025");
    expect(periods[0].start).toEqual(new Date(2025, 0, 1));
    expect(periods[0].end).toEqual(new Date(2025, 6, 0, 23, 59, 59, 999)); // Jun 30
    expect(periods[1].label).toBe("Jul-Dez/2025");
    expect(periods[2].label).toBe("Jan-Jun/2026");
    expect(periods[3].label).toBe("Jul-Dez/2026");
  });

  it("generates annual periods (frequencyMonths=12)", () => {
    const periods = calculatePeriods(12, startDate, referenceDate);
    expect(periods.length).toBe(2);
    expect(periods[0].label).toBe("Jan-Dez/2025");
    expect(periods[0].start).toEqual(new Date(2025, 0, 1));
    expect(periods[0].end).toEqual(new Date(2025, 12, 0, 23, 59, 59, 999)); // Dec 31
    expect(periods[1].label).toBe("Jan-Dez/2026");
  });

  it("handles startDate in the middle of the year", () => {
    const midYearStart = new Date(2025, 5, 1); // Jun 1, 2025
    const periods = calculatePeriods(3, midYearStart, referenceDate);
    // Grid extends backward from Jun: Dec/2024-Feb/2025, Mar-May/2025, Jun-Aug/2025, ...
    expect(periods.length).toBe(9);
    expect(periods[0].label).toBe("Dez/2024-Fev/2025"); // extends back to cover range
    expect(periods[1].label).toBe("Mar-Mai/2025");
    expect(periods[2].label).toBe("Jun-Ago/2025");
    expect(periods[2].start).toEqual(new Date(2025, 5, 1));
    expect(periods[3].label).toBe("Set-Nov/2025");
    expect(periods[4].label).toBe("Dez/2025-Fev/2026");
    expect(periods[8].label).toBe("Dez/2026-Fev/2027");
  });

  it("handles custom referenceDate", () => {
    const customRef = new Date(2027, 6, 1); // Jul 2027
    const periods = calculatePeriods(6, startDate, customRef);
    // Range: 2026-01-01 to 2027-12-31
    expect(periods.length).toBe(4);
    expect(periods[0].label).toBe("Jan-Jun/2026");
    expect(periods[3].label).toBe("Jul-Dez/2027");
  });
});

describe("getCurrentPeriod", () => {
  it("returns the period containing the reference date", () => {
    const startDate = new Date(2026, 0, 1);
    const now = new Date(2026, 2, 15); // Mar 15, 2026
    const periods = calculatePeriods(3, startDate, now);
    const current = getCurrentPeriod(periods, now);
    expect(current).toBeDefined();
    expect(current!.label).toBe("Jan-Mar/2026");
  });

  it("returns undefined when no period matches", () => {
    const startDate = new Date(2026, 0, 1);
    const periods = calculatePeriods(3, startDate, new Date(2026, 0, 1));
    const result = getCurrentPeriod(periods, new Date(2030, 0, 1));
    expect(result).toBeUndefined();
  });

  it("matches period boundaries (first day)", () => {
    const startDate = new Date(2026, 0, 1);
    const periods = calculatePeriods(3, startDate, new Date(2026, 0, 1));
    const current = getCurrentPeriod(periods, new Date(2026, 3, 1)); // Apr 1
    expect(current).toBeDefined();
    expect(current!.label).toBe("Abr-Jun/2026");
  });

  it("matches period boundaries (last day)", () => {
    const startDate = new Date(2026, 0, 1);
    const periods = calculatePeriods(3, startDate, new Date(2026, 0, 1));
    const current = getCurrentPeriod(periods, new Date(2026, 2, 31)); // Mar 31
    expect(current).toBeDefined();
    expect(current!.label).toBe("Jan-Mar/2026");
  });
});
