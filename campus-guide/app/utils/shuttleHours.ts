import { getScheduleForDay, getServiceWindow } from "@/constants/shuttleSchedule";
import { Building } from "@/constants/buildings";

export function getNextShuttleTimeLabel(
  startBuilding: Building,
  destinationBuilding: Building,
): string {
  const now = new Date();
  const schedule = getScheduleForDay(now.getDay());
  if (!schedule) return "No shuttle on weekends";

  const isFromLoyola = startBuilding.campus === 'Loyola';
  const currentTimeStr =
    now.getHours().toString().padStart(2, '0') + ":" +
    now.getMinutes().toString().padStart(2, '0');

  const nextBus = schedule.find((time) => {
    const busTime = isFromLoyola ? time.loyola : time.sgw;
    return !!busTime && busTime.replace('*', '') > currentTimeStr;
  });

  const directionLabel = isFromLoyola ? 'To SGW' : 'To Loyola';
  if (nextBus) {
    const time = isFromLoyola ? nextBus.loyola : nextBus.sgw;
    return `Next shuttle ${directionLabel}: ${time}`;
  }
  return "No more shuttles today";
}

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
