/**
 * Hierarchy entry with employeeId and managerId (active hierarchy only).
 */
export interface HierarchyEntry {
  employeeId: string;
  managerId: string;
}

/**
 * Pure function: given a managerId and a flat list of active hierarchy entries,
 * returns all direct and indirect subordinate employee IDs (recursive).
 *
 * Exported separately so it can be unit-tested without DB access.
 */
export function computeSubordinates(
  managerId: string,
  hierarchies: HierarchyEntry[]
): string[] {
  const result: string[] = [];
  const directReports = hierarchies.filter((h) => h.managerId === managerId);
  for (const report of directReports) {
    result.push(report.employeeId);
    result.push(...computeSubordinates(report.employeeId, hierarchies));
  }
  return result;
}
