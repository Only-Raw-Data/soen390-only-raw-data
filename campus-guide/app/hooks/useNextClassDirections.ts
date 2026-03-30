import { useState, useEffect, useCallback, useRef } from "react";
import { useCalendarAuth } from "@context/CalendarAuthContext";
import {
  type NextClassEvent,
  fetchNextClassEvent,
  fetchCalendars,
  getFreshCalendarAccessToken,
  getSelectedCalendarIds,
  saveSelectedCalendarIds,
} from "@services/calendarAuthService";
import {
  type NextClassDirectionsState,
  DEFAULT_THRESHOLD_MINUTES,
  evaluateNextClassDirections,
  getStoredThresholdMinutes,
  saveThresholdMinutes,
} from "@services/nextClassDirectionsService";

const NEXT_CLASS_POLL_MS = 5 * 60 * 1000;
const TIME_CHECK_INTERVAL_MS = 30 * 1000;

export interface UseNextClassDirectionsOptions {
  thresholdMinutes?: number;
}

export default function useNextClassDirections(
  options?: UseNextClassDirectionsOptions,
) {
  const [thresholdMinutes, setThresholdMinutesState] = useState(
    options?.thresholdMinutes ?? DEFAULT_THRESHOLD_MINUTES,
  );

  const { isConnected } = useCalendarAuth();

  const [nextClass, setNextClass] = useState<NextClassEvent | null>(null);
  const [directionsState, setDirectionsState] =
    useState<NextClassDirectionsState>(() =>
      evaluateNextClassDirections(null, thresholdMinutes),
    );
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dismissedEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (options?.thresholdMinutes != null) return;
    getStoredThresholdMinutes().then(setThresholdMinutesState);
  }, [options?.thresholdMinutes]);

  const setThresholdMinutes = useCallback(
    async (minutes: number) => {
      setThresholdMinutesState(minutes);
      await saveThresholdMinutes(minutes);
    },
    [],
  );

  const fetchNextClass = useCallback(async () => {
    if (!isConnected) {
      setNextClass(null);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getFreshCalendarAccessToken();
      if (!token) {
        setNextClass(null);
        return;
      }

      let calendarIds = await getSelectedCalendarIds();
      if (!calendarIds || calendarIds.length === 0) {
        const calendars = await fetchCalendars(token);
        if (calendars.length === 0) {
          setNextClass(null);
          return;
        }
        calendarIds = calendars.map((c) => c.id);
        await saveSelectedCalendarIds(calendarIds);
      }

      const event = await fetchNextClassEvent(token, calendarIds);
      setNextClass(event);

      if (event && event.id !== dismissedEventIdRef.current) {
        setDismissed(false);
      }
    } catch {
      setNextClass(null);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchNextClass();
    const interval = setInterval(fetchNextClass, NEXT_CLASS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchNextClass]);

  useEffect(() => {
    function tick() {
      setDirectionsState(
        evaluateNextClassDirections(nextClass, thresholdMinutes),
      );
    }

    tick();
    const interval = setInterval(tick, TIME_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [nextClass, thresholdMinutes]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    if (nextClass) {
      dismissedEventIdRef.current = nextClass.id;
    }
  }, [nextClass]);

  const refresh = useCallback(() => {
    fetchNextClass();
  }, [fetchNextClass]);

  return {
    ...directionsState,
    isLoading,
    dismissed,
    dismiss,
    refresh,
    isConnected,
    thresholdMinutes,
    setThresholdMinutes,
  };
}
