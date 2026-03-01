import { prisma } from "@/lib/prisma";

const MONTH_ABBR_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export interface Period {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Calculate cycle periods based on frequency and start date.
 * Generates periods covering the current year + one year back (based on referenceDate).
 */
export function calculatePeriods(
  frequencyMonths: number,
  startDate: Date,
  referenceDate?: Date
): Period[] {
  const ref = referenceDate ?? new Date();
  const refYear = ref.getFullYear();

  // Range: one year back from Jan 1 of refYear to Dec 31 of refYear
  const rangeStart = new Date(refYear - 1, 0, 1);
  const rangeEnd = new Date(refYear, 11, 31, 23, 59, 59, 999);

  const periods: Period[] = [];

  // Start generating periods from the startDate, stepping by frequencyMonths
  // Find the first period that starts at or before rangeStart
  const sdYear = startDate.getFullYear();
  const sdMonth = startDate.getMonth();

  // Calculate how many periods to skip to reach the first period at or before rangeStart
  const monthsDiff = (rangeStart.getFullYear() - sdYear) * 12 + (rangeStart.getMonth() - sdMonth);
  const periodsToSkip = Math.floor(monthsDiff / frequencyMonths);

  const totalMonthOffset = sdMonth + periodsToSkip * frequencyMonths;
  let currentYear = sdYear + Math.floor(totalMonthOffset / 12);
  let currentMonth = ((totalMonthOffset % 12) + 12) % 12;

  // Generate periods until we exceed rangeEnd
  while (true) {
    const periodStart = new Date(currentYear, currentMonth, 1);
    if (periodStart > rangeEnd) break;

    const nextMonth = currentMonth + frequencyMonths;
    const nextYear = currentYear + Math.floor(nextMonth / 12);
    const nextMonthNormalized = nextMonth % 12;

    // Period end is the last day of the last month in the period
    const periodEnd = new Date(nextYear, nextMonthNormalized, 0, 23, 59, 59, 999);

    // Only include if period overlaps with our range
    if (periodEnd >= rangeStart && periodStart <= rangeEnd) {
      periods.push({
        start: periodStart,
        end: periodEnd,
        label: formatPeriodLabel(periodStart, periodEnd, frequencyMonths),
      });
    }

    currentMonth = nextMonthNormalized;
    currentYear = nextYear;
  }

  return periods;
}

function formatPeriodLabel(start: Date, end: Date, frequencyMonths: number): string {
  if (frequencyMonths === 1) {
    // Monthly: "Mar/2026"
    return `${MONTH_ABBR_PT[start.getMonth()]}/${start.getFullYear()}`;
  }

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear === endYear) {
    // Same year: "Jan-Mar/2026"
    return `${MONTH_ABBR_PT[start.getMonth()]}-${MONTH_ABBR_PT[end.getMonth()]}/${startYear}`;
  }

  // Cross-year: "Jul/2025-Jun/2026"
  return `${MONTH_ABBR_PT[start.getMonth()]}/${startYear}-${MONTH_ABBR_PT[end.getMonth()]}/${endYear}`;
}

/**
 * Get the period that contains the current date (or a specified date).
 */
export function getCurrentPeriod(periods: Period[], now?: Date): Period | undefined {
  const ref = now ?? new Date();
  return periods.find((p) => ref >= p.start && ref <= p.end);
}

export interface DistributedEvent {
  employeeId: string;
  employeeName: string;
  scheduledDate: Date;
}

/**
 * Get all business days (Mon-Fri) in a date range (inclusive).
 */
export function getBusinessDays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (current <= end) {
    const dow = current.getDay();
    if (dow >= 1 && dow <= 5) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * If date falls on Sat/Sun, snap to the following Monday.
 */
export function snapToBusinessDay(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay();
  if (dow === 0) {
    d.setDate(d.getDate() + 1); // Sunday → Monday
  } else if (dow === 6) {
    d.setDate(d.getDate() + 2); // Saturday → Monday
  }
  return d;
}

/**
 * Distribute employees across business days.
 * @param employees - Array of { id, name }
 * @param businessDays - Array of available business day dates (sorted ascending)
 * @param perDay - 1 or 2 employees per day
 * @param direction - 'end-to-start' fills from last day backward; 'last-month-start' fills from first day of last month forward
 */
export function distributeEvents(
  employees: { id: string; name: string }[],
  businessDays: Date[],
  perDay: 1 | 2,
  direction: "end-to-start" | "last-month-start"
): DistributedEvent[] {
  if (employees.length === 0 || businessDays.length === 0) return [];

  let orderedDays: Date[];

  if (direction === "end-to-start") {
    orderedDays = [...businessDays].reverse();
  } else {
    // last-month-start: find the first business day of the last month in the range
    const lastDay = businessDays[businessDays.length - 1];
    const lastMonth = lastDay.getMonth();
    const lastYear = lastDay.getFullYear();
    const lastMonthStartIdx = businessDays.findIndex(
      (d) => d.getMonth() === lastMonth && d.getFullYear() === lastYear
    );
    // Reorder: last month days first, then wrap around
    orderedDays = [
      ...businessDays.slice(lastMonthStartIdx),
      ...businessDays.slice(0, lastMonthStartIdx),
    ];
  }

  const events: DistributedEvent[] = [];
  let dayIdx = 0;
  let slotsUsedOnCurrentDay = 0;

  for (const emp of employees) {
    // Wrap around if we run out of days
    const wrappedIdx = dayIdx % orderedDays.length;

    events.push({
      employeeId: emp.id,
      employeeName: emp.name,
      scheduledDate: orderedDays[wrappedIdx],
    });

    slotsUsedOnCurrentDay++;
    if (slotsUsedOnCurrentDay >= perDay) {
      slotsUsedOnCurrentDay = 0;
      dayIdx++;
    }
  }

  // Sort by date ascending
  events.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

  return events;
}

export interface EffectiveSchedule {
  source: "individual" | "sector";
  frequencyMonths: number;
  startDate: Date;
  isActive: boolean;
}

/**
 * Get the effective schedule configuration for an employee.
 * Returns the individual schedule if it exists and is active, otherwise the sector schedule.
 */
export async function getEffectiveSchedule(
  employeeId: string,
  type: "pdi" | "feedback"
): Promise<EffectiveSchedule | null> {
  // Check for individual schedule first
  if (type === "pdi") {
    const individual = await prisma.pDISchedule.findFirst({
      where: { employeeId, isActive: true },
    });
    if (individual) {
      return {
        source: "individual",
        frequencyMonths: individual.frequencyMonths,
        startDate: individual.nextDueDate,
        isActive: true,
      };
    }
  } else {
    const individual = await prisma.feedbackSchedule.findFirst({
      where: { employeeId, isActive: true },
    });
    if (individual) {
      return {
        source: "individual",
        frequencyMonths: individual.frequencyMonths,
        startDate: individual.nextDueDate,
        isActive: true,
      };
    }
  }

  // Fall back to sector schedule via user's organizational unit
  const hierarchy = await prisma.employeeHierarchy.findFirst({
    where: { employeeId, endDate: null },
    select: { organizationalUnitId: true },
  });

  if (!hierarchy) return null;

  const sectorSchedule = await prisma.sectorSchedule.findUnique({
    where: {
      organizationalUnitId_type: {
        organizationalUnitId: hierarchy.organizationalUnitId,
        type,
      },
    },
  });

  if (!sectorSchedule || !sectorSchedule.isActive) return null;

  return {
    source: "sector",
    frequencyMonths: sectorSchedule.frequencyMonths,
    startDate: sectorSchedule.startDate,
    isActive: sectorSchedule.isActive,
  };
}

/**
 * Create onboarding feedbacks at 45 and 90 days after admission.
 * Only creates if no onboarding feedbacks already exist for the employee.
 */
export async function createOnboardingFeedbacks(
  employeeId: string,
  admissionDate: Date,
  managerId: string
): Promise<void> {
  const d45 = new Date(admissionDate);
  d45.setDate(d45.getDate() + 45);

  const d90 = new Date(admissionDate);
  d90.setDate(d90.getDate() + 90);

  // Check if onboarding feedbacks already exist
  const existing = await prisma.feedback.findMany({
    where: { employeeId, isOnboarding: true },
  });

  if (existing.length === 0) {
    await prisma.feedback.createMany({
      data: [
        {
          employeeId,
          managerId,
          status: "scheduled",
          period: "Onboarding 45d",
          scheduledAt: d45,
          isOnboarding: true,
        },
        {
          employeeId,
          managerId,
          status: "scheduled",
          period: "Onboarding 90d",
          scheduledAt: d90,
          isOnboarding: true,
        },
      ],
    });
  }
}

/**
 * Update onboarding feedbacks when admission date changes.
 * Removes pending (scheduled) onboarding feedbacks and recreates with new dates.
 * Already submitted feedbacks are not affected.
 */
export async function updateOnboardingFeedbacks(
  employeeId: string,
  admissionDate: Date,
  managerId: string
): Promise<void> {
  // Delete only scheduled onboarding feedbacks
  await prisma.feedback.deleteMany({
    where: {
      employeeId,
      isOnboarding: true,
      status: "scheduled",
    },
  });

  // Check if any submitted onboarding feedbacks remain
  const remaining = await prisma.feedback.findMany({
    where: { employeeId, isOnboarding: true },
  });

  const has45d = remaining.some((f) => f.period === "Onboarding 45d");
  const has90d = remaining.some((f) => f.period === "Onboarding 90d");

  const d45 = new Date(admissionDate);
  d45.setDate(d45.getDate() + 45);
  const d90 = new Date(admissionDate);
  d90.setDate(d90.getDate() + 90);

  const toCreate: Array<{
    employeeId: string;
    managerId: string;
    status: "scheduled";
    period: string;
    scheduledAt: Date;
    isOnboarding: true;
  }> = [];

  if (!has45d) {
    toCreate.push({
      employeeId,
      managerId,
      status: "scheduled",
      period: "Onboarding 45d",
      scheduledAt: d45,
      isOnboarding: true,
    });
  }
  if (!has90d) {
    toCreate.push({
      employeeId,
      managerId,
      status: "scheduled",
      period: "Onboarding 90d",
      scheduledAt: d90,
      isOnboarding: true,
    });
  }

  if (toCreate.length > 0) {
    await prisma.feedback.createMany({ data: toCreate });
  }
}

/**
 * Handle sector transfer for an employee.
 * Cancels future scheduled PDIs and Feedbacks (except onboarding).
 * Individual schedules (PDISchedule/FeedbackSchedule) are preserved.
 */
export async function handleSectorTransfer(
  employeeId: string,
  _newUnitId: string
): Promise<{ cancelledPdis: number; cancelledFeedbacks: number }> {
  const now = new Date();

  // Cancel future scheduled PDIs
  const cancelledPdis = await prisma.pDI.updateMany({
    where: {
      employeeId,
      status: "scheduled",
      scheduledAt: { gt: now },
    },
    data: { status: "cancelled" },
  });

  // Cancel future scheduled Feedbacks (except onboarding)
  const cancelledFeedbacks = await prisma.feedback.updateMany({
    where: {
      employeeId,
      status: "scheduled",
      scheduledAt: { gt: now },
      isOnboarding: false,
    },
    data: { status: "cancelled" },
  });

  return {
    cancelledPdis: cancelledPdis.count,
    cancelledFeedbacks: cancelledFeedbacks.count,
  };
}
