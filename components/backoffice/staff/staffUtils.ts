/** Capitalise first letter, lowercase the rest: "ACTIVE" → "Active" */
export function capitalizeFirst(str: string): string {
  return str.charAt(0) + str.slice(1).toLowerCase();
}
