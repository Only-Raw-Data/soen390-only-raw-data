import { getServiceWindow } from "@/constants/shuttleSchedule";

/**
 * True if the given time falls within weekday shuttle service hours.
 * Service window is derived from the shuttle schedule's first/last departures.
 */
export function isWithinShuttleHours(now?: Date): boolean {
  const date = now ?? new Date();
  const window = getServiceWindow(date.getDay());
  if (!window) return false;

  const timeStr =
    date.getHours().toString().padStart(2, "0") +
    ":" +
    date.getMinutes().toString().padStart(2, "0");

  return timeStr >= window.start && timeStr <= window.end;
}
