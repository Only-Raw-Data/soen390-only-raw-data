/**
 * Builds an array of hour values starting at `startHour` for `count` slots.
 * e.g., buildHourSlots(8, 12) -> [8, 9, 10, ..., 19]
 */
export function buildHourSlots(startHour: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => startHour + i);
}
