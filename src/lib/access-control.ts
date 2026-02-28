"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeSubordinates } from "@/lib/hierarchy-utils";

export { computeSubordinates } from "@/lib/hierarchy-utils";
export type { HierarchyEntry } from "@/lib/hierarchy-utils";

/**
 * DB-backed function: returns all direct and indirect subordinate IDs
 * for the given managerId based on active hierarchy records (endDate is null).
 */
export async function getSubordinates(managerId: string): Promise<string[]> {
  const hierarchies = await prisma.employeeHierarchy.findMany({
    where: { endDate: null },
    select: { employeeId: true, managerId: true },
  });
  return computeSubordinates(managerId, hierarchies);
}

/**
 * Returns the list of employee IDs that a user can access, or "all" for admins.
 *
 * - admin: can access all employees ("all")
 * - manager: can access self + all subordinates (direct and indirect)
 * - employee: can access only self
 */
export async function getAccessibleEmployeeIds(
  userId: string,
  role: string
): Promise<string[] | "all"> {
  if (role === "admin") return "all";
  if (role === "employee") return [userId];
  // manager
  const subordinates = await getSubordinates(userId);
  return [userId, ...subordinates];
}

/**
 * Checks if a user can access a specific employee's PDIs/Feedbacks.
 *
 * - admin: always true
 * - employee: only their own
 * - manager: only if the target is a direct or indirect subordinate, or self
 */
export async function canAccessEmployee(
  userId: string,
  userRole: string,
  targetEmployeeId: string
): Promise<boolean> {
  if (userRole === "admin") return true;
  if (userId === targetEmployeeId) return true;
  if (userRole === "employee") return false;
  // manager: check if target is a subordinate
  const subordinates = await getSubordinates(userId);
  return subordinates.includes(targetEmployeeId);
}

/**
 * Returns a Prisma `where` filter for PDIs based on user access level.
 *
 * - admin: no filter (returns all)
 * - manager: PDIs where employeeId is self or a subordinate
 * - employee: only own PDIs (where employeeId = userId)
 */
export async function getPDIAccessFilter(
  userId: string,
  role: string
): Promise<Record<string, unknown>> {
  if (role === "admin") return {};

  const accessible = await getAccessibleEmployeeIds(userId, role);
  if (accessible === "all") return {};

  return { employeeId: { in: accessible } };
}

/**
 * Returns a Prisma `where` filter for Feedbacks based on user access level.
 *
 * - admin: no filter (returns all)
 * - manager: Feedbacks where employeeId is self or a subordinate
 * - employee: only own Feedbacks (where employeeId = userId)
 */
export async function getFeedbackAccessFilter(
  userId: string,
  role: string
): Promise<Record<string, unknown>> {
  if (role === "admin") return {};

  const accessible = await getAccessibleEmployeeIds(userId, role);
  if (accessible === "all") return {};

  return { employeeId: { in: accessible } };
}

/**
 * Server-side helper: gets the current user session and returns access control info.
 * Returns null if not authenticated.
 */
export async function getSessionAccessControl() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";

  return { userId, role };
}
