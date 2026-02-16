import { Weekday } from "@/constants/weekday";

/**
 * True if the given time falls within weekday shuttle service hours.
 * Mon–Thu: 09:15–18:30; Friday: 09:15–18:15; Weekend: not running.
 */
export function isWithinShuttleHours(now?: Date): boolean {
  const date = now ?? new Date();
  const day = date.getDay();
  if (day === Weekday.Saturday || day === Weekday.Sunday) {
    return false;
  }
  const timeStr =
    date.getHours().toString().padStart(2, "0") +
    ":" +
    date.getMinutes().toString().padStart(2, "0");
  const isFriday = day === Weekday.Friday;
  const firstDeparture = "09:15";
  const lastDepartureMonThu = "18:30";
  const lastDepartureFriday = "18:15";
  const lastDeparture = isFriday ? lastDepartureFriday : lastDepartureMonThu;
  return timeStr >= firstDeparture && timeStr <= lastDeparture;
}
