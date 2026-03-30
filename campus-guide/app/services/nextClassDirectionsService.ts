import AsyncStorage from "@react-native-async-storage/async-storage";
import { Building, All_BUILDINGS } from "@/constants/buildings";
import type { NextClassEvent } from "@services/calendarAuthService";

export const DEFAULT_THRESHOLD_MINUTES = 15;
export const MIN_THRESHOLD_MINUTES = 5;
export const MAX_THRESHOLD_MINUTES = 60;
/** 0 means "no limit" — always show for any upcoming class. */
export const NO_LIMIT_THRESHOLD = 0;
const STORAGE_KEY_THRESHOLD = "directions_threshold_minutes";

export async function getStoredThresholdMinutes(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_THRESHOLD);
    if (raw === null) return DEFAULT_THRESHOLD_MINUTES;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) return DEFAULT_THRESHOLD_MINUTES;
    if (parsed === NO_LIMIT_THRESHOLD) return NO_LIMIT_THRESHOLD;
    return Math.max(MIN_THRESHOLD_MINUTES, Math.min(MAX_THRESHOLD_MINUTES, parsed));
  } catch {
    return DEFAULT_THRESHOLD_MINUTES;
  }
}

export async function saveThresholdMinutes(minutes: number): Promise<void> {
  if (minutes === NO_LIMIT_THRESHOLD) {
    await AsyncStorage.setItem(STORAGE_KEY_THRESHOLD, String(NO_LIMIT_THRESHOLD));
    return;
  }
  const clamped = Math.max(MIN_THRESHOLD_MINUTES, Math.min(MAX_THRESHOLD_MINUTES, minutes));
  await AsyncStorage.setItem(STORAGE_KEY_THRESHOLD, String(clamped));
}

export type NextClassDirectionsState = {
  nextClass: NextClassEvent | null;
  matchedBuilding: Building | null;
  minutesUntilClass: number | null;
  shouldNotify: boolean;
  status:
    | "idle"
    | "no_class"
    | "too_far"
    | "within_threshold"
    | "class_started"
    | "missing_location";
};

export function resolveLocationToBuilding(
  location: string | null,
): Building | null {
  if (!location) return null;

  const normalized = location.toUpperCase().trim();

  for (const building of All_BUILDINGS) {
    const code = building.code.toUpperCase();
    const roomPattern = new RegExp(`\\b${escapeRegex(code)}[-\\s]?\\d`, "i");
    if (roomPattern.test(location)) {
      return building;
    }
  }

  const sortedByCodeLen = [...All_BUILDINGS].sort(
    (a, b) => b.code.length - a.code.length,
  );
  for (const building of sortedByCodeLen) {
    const code = building.code.toUpperCase();
    const codePattern = new RegExp(`\\b${escapeRegex(code)}\\b`, "i");
    if (codePattern.test(normalized)) {
      return building;
    }
  }

  for (const building of All_BUILDINGS) {
    const buildingName = building.name.toUpperCase();
    if (normalized.includes(buildingName) || buildingName.includes(normalized)) {
      return building;
    }
  }

  for (const building of All_BUILDINGS) {
    if (building.address && normalized.includes(building.address.toUpperCase())) {
      return building;
    }
  }

  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function computeMinutesUntilClass(classStart: Date, now?: Date): number {
  const current = now ?? new Date();
  return (classStart.getTime() - current.getTime()) / (1000 * 60);
}

export function evaluateNextClassDirections(
  nextClass: NextClassEvent | null,
  thresholdMinutes: number = DEFAULT_THRESHOLD_MINUTES,
  now?: Date,
): NextClassDirectionsState {
  if (!nextClass) {
    return {
      nextClass: null,
      matchedBuilding: null,
      minutesUntilClass: null,
      shouldNotify: false,
      status: "no_class",
    };
  }

  const minutes = computeMinutesUntilClass(nextClass.start, now);

  if (minutes < -5) {
    return {
      nextClass,
      matchedBuilding: null,
      minutesUntilClass: minutes,
      shouldNotify: false,
      status: "class_started",
    };
  }

  const matchedBuilding = nextClass.location
    ? resolveLocationToBuilding(nextClass.location)
    : null;

  if (thresholdMinutes !== NO_LIMIT_THRESHOLD && minutes > thresholdMinutes) {
    return {
      nextClass,
      matchedBuilding,
      minutesUntilClass: minutes,
      shouldNotify: false,
      status: "too_far",
    };
  }

  if (!nextClass.location) {
    return {
      nextClass,
      matchedBuilding: null,
      minutesUntilClass: minutes,
      shouldNotify: true,
      status: "missing_location",
    };
  }

  return {
    nextClass,
    matchedBuilding,
    minutesUntilClass: minutes,
    shouldNotify: true,
    status: "within_threshold",
  };
}
