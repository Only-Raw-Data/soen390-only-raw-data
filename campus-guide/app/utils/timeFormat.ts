/**
 * Formats a 24-hour integer into a human-readable AM/PM label.
 * e.g., 8 -> "8 AM", 13 -> "1 PM", 0 -> "12 AM", 12 -> "12 PM"
 */
export function formatHourLabel(hour24: number): string {
  if (hour24 === 0) return '12 AM';
  if (hour24 === 12) return '12 PM';
  if (hour24 < 12) return `${hour24} AM`;
  return `${hour24 - 12} PM`;
}
