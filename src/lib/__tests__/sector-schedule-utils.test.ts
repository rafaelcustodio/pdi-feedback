import { describe, it, expect } from "vitest";
import {
  calculatePeriods,
  getCurrentPeriod,
  getBusinessDays,
  snapToBusinessDay,
  distributeEvents,
  subtractBusinessDays,
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
    expect(periods[0].label).toBe("Q1/2025");
    expect(periods[0].start).toEqual(new Date(2025, 0, 1));
    expect(periods[0].end).toEqual(new Date(2025, 3, 0, 23, 59, 59, 999)); // Mar 31
    expect(periods[1].label).toBe("Q2/2025");
    expect(periods[4].label).toBe("Q1/2026");
    expect(periods[5].label).toBe("Q2/2026");
  });

  it("generates semi-annual periods (frequencyMonths=6)", () => {
    const periods = calculatePeriods(6, startDate, referenceDate);
    expect(periods.length).toBe(4);
    expect(periods[0].label).toBe("S1/2025");
    expect(periods[0].start).toEqual(new Date(2025, 0, 1));
    expect(periods[0].end).toEqual(new Date(2025, 6, 0, 23, 59, 59, 999)); // Jun 30
    expect(periods[1].label).toBe("S2/2025");
    expect(periods[2].label).toBe("S1/2026");
    expect(periods[3].label).toBe("S2/2026");
  });

  it("generates annual periods (frequencyMonths=12)", () => {
    const periods = calculatePeriods(12, startDate, referenceDate);
    expect(periods.length).toBe(2);
    expect(periods[0].label).toBe("2025");
    expect(periods[0].start).toEqual(new Date(2025, 0, 1));
    expect(periods[0].end).toEqual(new Date(2025, 12, 0, 23, 59, 59, 999)); // Dec 31
    expect(periods[1].label).toBe("2026");
  });

  it("handles startDate in the middle of the year", () => {
    const midYearStart = new Date(2025, 5, 1); // Jun 1, 2025
    const periods = calculatePeriods(3, midYearStart, referenceDate);
    // Grid extends backward from Jun: cycleStartMonth=5, so Q numbering is relative to Jun
    // Dec-Feb = Q3 (offset 6 from Jun), Mar-May = Q4, Jun-Aug = Q1, Sep-Nov = Q2
    expect(periods.length).toBe(9);
    expect(periods[0].label).toBe("Q3/2025"); // Dec 2024 - Feb 2025, labelYear=endYear=2025
    expect(periods[1].label).toBe("Q4/2025"); // Mar-May 2025
    expect(periods[2].label).toBe("Q1/2025"); // Jun-Aug 2025
    expect(periods[2].start).toEqual(new Date(2025, 5, 1));
    expect(periods[3].label).toBe("Q2/2025"); // Sep-Nov 2025
    expect(periods[4].label).toBe("Q3/2026"); // Dec 2025 - Feb 2026
    expect(periods[8].label).toBe("Q3/2027"); // Dec 2026 - Feb 2027
  });

  it("handles custom referenceDate", () => {
    const customRef = new Date(2027, 6, 1); // Jul 2027
    const periods = calculatePeriods(6, startDate, customRef);
    // Range: 2026-01-01 to 2027-12-31
    expect(periods.length).toBe(4);
    expect(periods[0].label).toBe("S1/2026");
    expect(periods[3].label).toBe("S2/2027");
  });
});

describe("getCurrentPeriod", () => {
  it("returns the period containing the reference date", () => {
    const startDate = new Date(2026, 0, 1);
    const now = new Date(2026, 2, 15); // Mar 15, 2026
    const periods = calculatePeriods(3, startDate, now);
    const current = getCurrentPeriod(periods, now);
    expect(current).toBeDefined();
    expect(current!.label).toBe("Q1/2026");
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
    expect(current!.label).toBe("Q2/2026");
  });

  it("matches period boundaries (last day)", () => {
    const startDate = new Date(2026, 0, 1);
    const periods = calculatePeriods(3, startDate, new Date(2026, 0, 1));
    const current = getCurrentPeriod(periods, new Date(2026, 2, 31)); // Mar 31
    expect(current).toBeDefined();
    expect(current!.label).toBe("Q1/2026");
  });
});

describe("getBusinessDays", () => {
  it("returns only Mon-Fri dates in range", () => {
    // Mar 2-6, 2026 is Mon-Fri
    const days = getBusinessDays(new Date(2026, 2, 2), new Date(2026, 2, 8)); // Mon-Sun
    expect(days.length).toBe(5);
    expect(days[0].getDay()).toBe(1); // Monday
    expect(days[4].getDay()).toBe(5); // Friday
  });

  it("excludes weekends", () => {
    // Mar 7 is Sat, Mar 8 is Sun
    const days = getBusinessDays(new Date(2026, 2, 7), new Date(2026, 2, 8));
    expect(days.length).toBe(0);
  });

  it("handles single-day range", () => {
    const days = getBusinessDays(new Date(2026, 2, 2), new Date(2026, 2, 2)); // Monday
    expect(days.length).toBe(1);
  });
});

describe("snapToBusinessDay", () => {
  it("returns same date for weekdays", () => {
    const wed = new Date(2026, 2, 4); // Wednesday
    expect(snapToBusinessDay(wed).getDate()).toBe(4);
  });

  it("snaps Saturday to Monday", () => {
    const sat = new Date(2026, 2, 7); // Saturday
    const result = snapToBusinessDay(sat);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(9);
  });

  it("snaps Sunday to Monday", () => {
    const sun = new Date(2026, 2, 8); // Sunday
    const result = snapToBusinessDay(sun);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(9);
  });
});

describe("distributeEvents", () => {
  const employees = [
    { id: "e1", name: "Alice" },
    { id: "e2", name: "Bob" },
    { id: "e3", name: "Carol" },
    { id: "e4", name: "Dave" },
  ];

  // Mar 2-6, 2026: Mon-Fri (5 business days)
  const businessDays = getBusinessDays(new Date(2026, 2, 2), new Date(2026, 2, 31));

  it("distributes end-to-start with perDay=1", () => {
    const events = distributeEvents(employees, businessDays, 1, "end-to-start");
    expect(events.length).toBe(4);
    // Last business day in March is Mar 31 (Tue), then 30 (Mon), 27 (Fri), 26 (Thu)
    expect(events[0].employeeName).toBeDefined();
    // Events should be sorted by date ascending
    for (let i = 1; i < events.length; i++) {
      expect(events[i].scheduledDate.getTime()).toBeGreaterThanOrEqual(
        events[i - 1].scheduledDate.getTime()
      );
    }
  });

  it("distributes end-to-start with perDay=2", () => {
    const events = distributeEvents(employees, businessDays, 2, "end-to-start");
    expect(events.length).toBe(4);
    // With perDay=2, 2 employees per day → 4 employees use 2 days
    const dateSet = new Set(events.map((e) => e.scheduledDate.getTime()));
    expect(dateSet.size).toBe(2);
  });

  it("distributes last-month-start with perDay=1", () => {
    // Use a 2-month range to test last-month behavior
    const twoMonthDays = getBusinessDays(new Date(2026, 1, 2), new Date(2026, 2, 31));
    const events = distributeEvents(employees, twoMonthDays, 1, "last-month-start");
    expect(events.length).toBe(4);
    // Should fill from first business day of March (last month in range)
    const marchDays = twoMonthDays.filter((d) => d.getMonth() === 2);
    for (const ev of events) {
      expect(ev.scheduledDate.getMonth()).toBe(2); // All in March
    }
  });

  it("handles more employees than days by wrapping", () => {
    // Only 2 business days
    const twoDays = getBusinessDays(new Date(2026, 2, 2), new Date(2026, 2, 3)); // Mon-Tue
    const events = distributeEvents(employees, twoDays, 1, "end-to-start");
    expect(events.length).toBe(4);
    // 4 employees, 2 days → wraps around
    const dateSet = new Set(events.map((e) => e.scheduledDate.getTime()));
    expect(dateSet.size).toBe(2);
  });

  it("returns empty for empty employees", () => {
    const events = distributeEvents([], businessDays, 1, "end-to-start");
    expect(events.length).toBe(0);
  });

  it("returns empty for empty business days", () => {
    const events = distributeEvents(employees, [], 1, "end-to-start");
    expect(events.length).toBe(0);
  });
});

describe("subtractBusinessDays", () => {
  it("subtracts 2 business days from Wednesday → Monday", () => {
    // Wed Mar 4, 2026 - 2 biz days = Mon Mar 2, 2026
    const wed = new Date("2026-03-04T00:00:00Z");
    const result = subtractBusinessDays(wed, 2);
    expect(result.getUTCDay()).toBe(1); // Monday
    expect(result.getUTCDate()).toBe(2);
  });

  it("subtracts 2 business days from Monday → Thursday (skips weekend)", () => {
    // Mon Mar 2, 2026 - 2 biz days = Thu Feb 26, 2026
    const mon = new Date("2026-03-02T00:00:00Z");
    const result = subtractBusinessDays(mon, 2);
    expect(result.getUTCDay()).toBe(4); // Thursday
    expect(result.getUTCDate()).toBe(26);
    expect(result.getUTCMonth()).toBe(1); // February
  });

  it("subtracts 2 business days from Tuesday → Friday (skips weekend)", () => {
    // Tue Mar 3, 2026 - 2 biz days = Fri Feb 27, 2026
    const tue = new Date("2026-03-03T00:00:00Z");
    const result = subtractBusinessDays(tue, 2);
    expect(result.getUTCDay()).toBe(5); // Friday
    expect(result.getUTCDate()).toBe(27);
    expect(result.getUTCMonth()).toBe(1); // February
  });

  it("subtracts 1 business day from Monday → Friday", () => {
    const mon = new Date("2026-03-02T00:00:00Z");
    const result = subtractBusinessDays(mon, 1);
    expect(result.getUTCDay()).toBe(5); // Friday
    expect(result.getUTCDate()).toBe(27);
  });

  it("subtracts 0 business days returns same date", () => {
    const wed = new Date("2026-03-04T00:00:00Z");
    const result = subtractBusinessDays(wed, 0);
    expect(result.getUTCDate()).toBe(4);
  });
});
