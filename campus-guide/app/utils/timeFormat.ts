const NOON_HOUR_24 = 12;

export function formatHourLabel(hour24: number): string {
  // Convert a 24-hour value to a 12-hour display label.
  const suffix = hour24 >= NOON_HOUR_24 ? "PM" : "AM";
  const hour12 =
    hour24 % NOON_HOUR_24 === 0 ? NOON_HOUR_24 : hour24 % NOON_HOUR_24;

  return `${hour12}:00 ${suffix}`;
}

