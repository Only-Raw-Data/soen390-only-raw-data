import { SHUTTLE_SERVICE_HOURS } from "@/constants/shuttleSchedule";

/**
 * True if the given time falls within weekday shuttle service hours.
 * Mon–Thu: 09:15–18:30; Friday: 09:15–18:15; Weekend: not running.
 */
export function isWithinShuttleHours(now?: Date): boolean {
  const date = now ?? new Date();
  const window = SHUTTLE_SERVICE_HOURS[date.getDay() as keyof typeof SHUTTLE_SERVICE_HOURS];
  if (!window) return false;

  const timeStr =
    date.getHours().toString().padStart(2, "0") +
    ":" +
    date.getMinutes().toString().padStart(2, "0");

  return timeStr >= window.start && timeStr <= window.end;
}
