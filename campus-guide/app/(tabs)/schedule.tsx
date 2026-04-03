import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "@app/components/Header";
import { useCalendarAuth } from "@context/CalendarAuthContext";
import { formatHourLabel } from "@utils/timeFormat";
import { buildHourSlots } from "@utils/timeSlots";
import { useRouter } from "expo-router";
import {
  type CalendarInfo,
  type NextClassEvent,
  fetchCalendars,
  fetchNextClassEvent,
  getFreshCalendarAccessToken,
  getSelectedCalendarIds,
  saveSelectedCalendarIds,
} from "@services/calendarAuthService";
import {
  resolveLocationToBuilding,
  computeMinutesUntilClass,
  DEFAULT_THRESHOLD_MINUTES,
  MIN_THRESHOLD_MINUTES,
  MAX_THRESHOLD_MINUTES,
  NO_LIMIT_THRESHOLD,
  getStoredThresholdMinutes,
  saveThresholdMinutes,
} from "@services/nextClassDirectionsService";
import { useDirections } from "@context/DirectionsContext";
import { useIndoorMap } from "@context/IndoorMapContext";
import useUserLocation from "@hooks/useUserLocation";
import { useScheduleUsabilityTask } from "@hooks/useScheduleUsabilityTask";
import { Building } from "@/constants/buildings";
import type { TransportationMode } from "@app/types/transportation";

type WeekDay = {
  label: string;
  dayNumber: string;
  isActive: boolean;
  date: Date;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  location: string | null;
  description: string | null;
};

const SCHEDULE_START_HOUR_24 = 0;
const SCHEDULE_END_HOUR_24 = 24;
const SCHEDULE_HOUR_SLOTS = SCHEDULE_END_HOUR_24 - SCHEDULE_START_HOUR_24;
const HOUR_ROW_HEIGHT = 60;
const MINUTES_PER_HOUR = 60;
const TIME_COLUMN_WIDTH = 54;

const HOURS = buildHourSlots(SCHEDULE_START_HOUR_24, SCHEDULE_HOUR_SLOTS);

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getWeekDays(baseDate: Date): WeekDay[] {
  const today = new Date();
  const normalizedBase = startOfDay(baseDate);
  const currentDay = normalizedBase.getDay();

  const monday = new Date(normalizedBase);
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  monday.setDate(normalizedBase.getDate() + diffToMonday);

  const labels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return labels.map((label, index) => {
    const date = addDays(monday, index);

    return {
      label,
      dayNumber: String(date.getDate()),
      isActive: startOfDay(date).getTime() === startOfDay(today).getTime(),
      date,
    };
  });
}

function getWeekBounds(weekDays: WeekDay[]) {
  const start = startOfDay(weekDays[0].date);

  const end = new Date(weekDays.at(-1)!.date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function clampEventToSchedule(eventStart: Date, eventEnd: Date) {
  const scheduleStart = new Date(eventStart);
  scheduleStart.setHours(SCHEDULE_START_HOUR_24, 0, 0, 0);

  const scheduleEnd = new Date(eventStart);
  scheduleEnd.setHours(SCHEDULE_END_HOUR_24, 0, 0, 0);

  const clampedStart = eventStart < scheduleStart ? scheduleStart : eventStart;
  const clampedEnd = eventEnd > scheduleEnd ? scheduleEnd : eventEnd;

  return { clampedStart, clampedEnd };
}

function getEventLayout(start: Date, end: Date) {
  const startMinutes =
    (start.getHours() - SCHEDULE_START_HOUR_24) * MINUTES_PER_HOUR +
    start.getMinutes();

  const endMinutes =
    (end.getHours() - SCHEDULE_START_HOUR_24) * MINUTES_PER_HOUR +
    end.getMinutes();

  const top = (startMinutes / MINUTES_PER_HOUR) * HOUR_ROW_HEIGHT;
  const height = Math.max(
    ((endMinutes - startMinutes) / MINUTES_PER_HOUR) * HOUR_ROW_HEIGHT,
    24,
  );

  return { top, height };
}

function formatWeekRangeLabel(weekDays: WeekDay[]) {
  const first = weekDays[0].date;
  const last = weekDays.at(-1)!.date;

  const sameMonth = first.getMonth() === last.getMonth();
  const sameYear = first.getFullYear() === last.getFullYear();

  const firstLabel = first.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  const lastLabel = last.toLocaleDateString([], {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });

  const yearLabel = sameYear
    ? first.getFullYear()
    : `${first.getFullYear()}–${last.getFullYear()}`;

  return `${firstLabel} - ${lastLabel}, ${yearLabel}`;
}

async function fetchGoogleCalendarEvents(
  weekDays: WeekDay[],
  calendarIds: string[],
): Promise<CalendarEvent[]> {
  const token = await getFreshCalendarAccessToken();

  if (!token) {
    return [];
  }

  const { start, end } = getWeekBounds(weekDays);

  const allResults = await Promise.all(
    calendarIds.map(async (calendarId) => {
      const url =
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        new URLSearchParams({
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "100",
        }).toString();

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];

      return items
        .filter(
          (item: any) =>
            typeof item.id === "string" &&
            item.start &&
            item.end,
        )
        .map((item: any) => {
          const isAllDay = Boolean(item.start?.date && item.end?.date);

          return {
            id: `${calendarId}_${item.id}`,
            title: item.summary || "Untitled Event",
            start: new Date(item.start?.dateTime || item.start?.date),
            end: new Date(item.end?.dateTime || item.end?.date),
            isAllDay,
            location: typeof item.location === "string" ? item.location : null,
            description:
              typeof item.description === "string" ? item.description : null,
          };
        });
    }),
  );

  return allResults.flat();
}

function computeNextClassDirectionsVisibility(
  nextClass: NextClassEvent | null,
  thresholdMinutes: number,
): {
  minutesUntil: number | null;
  showDirectionsButton: boolean;
} {
  if (!nextClass) {
    return { minutesUntil: null, showDirectionsButton: false };
  }

  const matchedBuilding = resolveLocationToBuilding(nextClass.location);
  const minutesUntil = computeMinutesUntilClass(nextClass.start);
  const classHasNotStarted = minutesUntil > -5;
  const isNoLimit = thresholdMinutes === NO_LIMIT_THRESHOLD;
  const withinThreshold =
    classHasNotStarted && (isNoLimit || minutesUntil <= thresholdMinutes);
  const showDirectionsButton = matchedBuilding !== null && withinThreshold;

  return { minutesUntil, showDirectionsButton };
}

function NextClassCardHeader({
  isLoading,
  onPress,
}: {
  readonly isLoading: boolean;
  readonly onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.nextClassHeader}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons name="school-outline" size={14} color="#912338" />
      <Text style={styles.nextClassLabel}>Next Class</Text>
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color="#912338"
          style={styles.nextClassSpinner}
        />
      ) : null}
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={14}
          color="#912338"
          style={styles.nextClassHeaderChevron}
        />
      ) : null}
    </TouchableOpacity>
  );
}

function NextClassLocationBlock({
  location,
}: {
  readonly location: string | null;
}) {
  if (location) {
    return (
      <View style={styles.nextClassLocationRow}>
        <Ionicons name="location-outline" size={13} color="#6B7280" />
        <Text style={styles.nextClassLocation} numberOfLines={1}>
          {location}
        </Text>
      </View>
    );
  }
  return (
    <Text style={styles.nextClassNoLocation}>No location specified</Text>
  );
}

function getDirectionsMinutesSuffix(minutesUntil: number | null): string {
  if (minutesUntil != null && minutesUntil > 0) {
    return ` (${Math.ceil(minutesUntil)} min)`;
  }
  return "";
}

function NextClassDirectionsButton({
  show,
  onPress,
  minutesUntil,
}: {
  readonly show: boolean;
  readonly onPress?: () => void;
  readonly minutesUntil: number | null;
}) {
  if (!show || !onPress) return null;

  return (
    <TouchableOpacity
      testID="next-class-directions-btn"
      style={styles.nextClassDirectionsButton}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Ionicons name="navigate" size={14} color="#FFFFFF" />
      <Text style={styles.nextClassDirectionsText}>
        Get Directions{getDirectionsMinutesSuffix(minutesUntil)}
      </Text>
    </TouchableOpacity>
  );
}

function NextClassScheduledBody({
  nextClass,
  showDirectionsButton,
  onGetDirections,
  minutesUntil,
}: {
  readonly nextClass: NextClassEvent;
  readonly showDirectionsButton: boolean;
  readonly onGetDirections?: () => void;
  readonly minutesUntil: number | null;
}) {
  return (
    <>
      <Text style={styles.nextClassTitle} numberOfLines={1}>
        {nextClass.title}
      </Text>
      <Text style={styles.nextClassTime}>
        {nextClass.start.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}{" "}
        {nextClass.start.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}{" "}
        –{" "}
        {nextClass.end.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}
      </Text>
      <NextClassLocationBlock location={nextClass.location} />
      <NextClassDirectionsButton
        show={showDirectionsButton}
        onPress={onGetDirections}
        minutesUntil={minutesUntil}
      />
    </>
  );
}

function NextClassCard({
  nextClass,
  isLoading,
  onGetDirections,
  onIndoorDirections,
  thresholdMinutes,
}: {
  readonly nextClass: NextClassEvent | null;
  readonly isLoading: boolean;
  readonly onGetDirections?: () => void;
  readonly onIndoorDirections?: () => void;
  readonly thresholdMinutes: number;
}) {
  if (!isLoading && nextClass === null) return null;

  const { minutesUntil, showDirectionsButton } =
    computeNextClassDirectionsVisibility(nextClass, thresholdMinutes);

  const headerOnPress =
    nextClass?.location != null ? onIndoorDirections : undefined;

  return (
    <View style={styles.nextClassCard}>
      <NextClassCardHeader isLoading={isLoading} onPress={headerOnPress} />
      {nextClass ? (
        <NextClassScheduledBody
          nextClass={nextClass}
          showDirectionsButton={showDirectionsButton}
          onGetDirections={onGetDirections}
          minutesUntil={minutesUntil}
        />
      ) : null}
    </View>
  );
}

function EventDetailModal({
  event,
  onClose,
}: {
  readonly event: CalendarEvent | null;
  readonly onClose: () => void;
}) {
  if (!event) return null;

  const dateLabel = event.start.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timeLabel = event.isAllDay
    ? "All day"
    : `${event.start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${event.end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

  return (
    <Modal
      visible={Boolean(event)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.eventDetailHeader}>
            <View style={styles.eventDetailAccent} />
            <Text style={styles.eventDetailTitle}>{event.title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.eventDetailCloseButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.eventDetailRow}>
            <Ionicons name="calendar-outline" size={16} color="#912338" />
            <Text style={styles.eventDetailText}>{dateLabel}</Text>
          </View>

          <View style={styles.eventDetailRow}>
            <Ionicons name="time-outline" size={16} color="#912338" />
            <Text style={styles.eventDetailText}>{timeLabel}</Text>
          </View>

          {event.location ? (
            <View style={styles.eventDetailRow}>
              <Ionicons name="location-outline" size={16} color="#912338" />
              <Text style={styles.eventDetailText}>{event.location}</Text>
            </View>
          ) : null}

          {event.description ? (
            <View style={styles.eventDetailDescriptionBox}>
              <Text style={styles.eventDetailDescriptionLabel}>Notes</Text>
              <Text style={styles.eventDetailDescription}>
                {event.description}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.modalSaveButton}
            activeOpacity={0.85}
            onPress={onClose}
          >
            <Text style={styles.modalSaveButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function applyThresholdDelta(prev: number, delta: number): number {
  if (prev === NO_LIMIT_THRESHOLD) {
    return delta > 0 ? MIN_THRESHOLD_MINUTES : NO_LIMIT_THRESHOLD;
  }

  const next = prev + delta;
  if (next < MIN_THRESHOLD_MINUTES) return NO_LIMIT_THRESHOLD;
  if (next > MAX_THRESHOLD_MINUTES) return MAX_THRESHOLD_MINUTES;
  return next;
}

function useScheduleThreshold() {
  const [thresholdMinutes, setThresholdMinutes] = useState(
    DEFAULT_THRESHOLD_MINUTES,
  );

  useEffect(() => {
    getStoredThresholdMinutes().then(setThresholdMinutes);
  }, []);

  const handleThresholdChange = useCallback((delta: number) => {
    setThresholdMinutes((prev) => {
      const next = applyThresholdDelta(prev, delta);
      saveThresholdMinutes(next);
      return next;
    });
  }, []);

  return { thresholdMinutes, handleThresholdChange };
}

function useScheduleEventsLoad(
  isConnected: boolean,
  weekDays: WeekDay[],
  selectedCalendarIds: Set<string>,
) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!isConnected || selectedCalendarIds.size === 0) {
      setEvents([]);
      setEventsError(null);
      return;
    }

    setEventsLoading(true);
    setEventsError(null);

    try {
      const fetchedEvents = await fetchGoogleCalendarEvents(weekDays, [
        ...selectedCalendarIds,
      ]);
      setEvents(fetchedEvents);
    } catch (err) {
      console.error(err);
      setEventsError(
        err instanceof Error ? err.message : "Failed to load calendar events.",
      );
    } finally {
      setEventsLoading(false);
    }
  }, [isConnected, weekDays, selectedCalendarIds]);

  useEffect(() => {
    loadEvents().catch(() => {});
  }, [loadEvents]);

  return { events, eventsLoading, eventsError };
}

function useScheduleCalendarsAndSelection(isConnected: boolean) {
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    new Set(),
  );
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      setCalendars([]);
      setSelectedCalendarIds(new Set());
      return;
    }

    async function loadCalendars() {
      const token = await getFreshCalendarAccessToken();
      if (!token) return;

      const fetched = await fetchCalendars(token);
      setCalendars(fetched);

      const saved = await getSelectedCalendarIds();
      if (saved === null) {
        const allIds = fetched.map((c) => c.id);
        setSelectedCalendarIds(new Set(allIds));
        await saveSelectedCalendarIds(allIds);
      } else {
        setSelectedCalendarIds(new Set(saved));
      }
    }

    void loadCalendars();
  }, [isConnected]);

  const handleCalendarToggle = useCallback((id: string) => {
    setSelectedCalendarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSaveCalendarSelection = useCallback(async () => {
    await saveSelectedCalendarIds([...selectedCalendarIds]);
    setShowCalendarPicker(false);
  }, [selectedCalendarIds]);

  return {
    calendars,
    selectedCalendarIds,
    showCalendarPicker,
    setShowCalendarPicker,
    handleCalendarToggle,
    handleSaveCalendarSelection,
  };
}

function useScheduleNextClassEvent(
  isConnected: boolean,
  selectedCalendarIds: Set<string>,
) {
  const [nextClass, setNextClass] = useState<NextClassEvent | null>(null);
  const [nextClassLoading, setNextClassLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || selectedCalendarIds.size === 0) {
      setNextClass(null);
      return;
    }

    async function loadNextClass() {
      setNextClassLoading(true);
      try {
        const token = await getFreshCalendarAccessToken();
        if (!token) return;
        const event = await fetchNextClassEvent(token, [
          ...selectedCalendarIds,
        ]);
        setNextClass(event);
      } catch {
        setNextClass(null);
      } finally {
        setNextClassLoading(false);
      }
    }

    void loadNextClass();
  }, [isConnected, selectedCalendarIds]);

  return { nextClass, nextClassLoading };
}

function useScheduleScrollToTime(currentDate: Date) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const now = new Date();
    const minutesFromStart =
      (now.getHours() - SCHEDULE_START_HOUR_24) * 60 + now.getMinutes();

    const y = Math.max((minutesFromStart / 60) * HOUR_ROW_HEIGHT - 120, 0);

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    }, 250);

    return () => clearTimeout(timeout);
  }, [currentDate]);

  return scrollRef;
}

function ScheduleDayColumn({
  day,
  events,
  onEventPress,
}: {
  readonly day: WeekDay;
  readonly events: CalendarEvent[];
  readonly onEventPress: (event: CalendarEvent) => void;
}) {
  const dayEvents = events.filter(
    (event) => !event.isAllDay && isSameDay(event.start, day.date),
  );

  return (
    <View
      style={[
        styles.dayGridColumn,
        day.isActive && styles.activeGridColumn,
      ]}
    >
      {HOURS.map((hour) => (
        <View key={`${day.label}-${hour}`} style={styles.gridCell} />
      ))}

      {dayEvents.map((event) => {
        const { clampedStart, clampedEnd } = clampEventToSchedule(
          event.start,
          event.end,
        );

        if (clampedEnd <= clampedStart) {
          return null;
        }

        const { top, height } = getEventLayout(clampedStart, clampedEnd);

        return (
          <TouchableOpacity
            key={event.id}
            style={[
              styles.eventBlock,
              {
                top,
                height,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => onEventPress(event)}
          >
            <Text style={styles.eventTitle} numberOfLines={2}>
              {event.title}
            </Text>
            <Text style={styles.eventTime} numberOfLines={1}>
              {clampedStart.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              -{" "}
              {clampedEnd.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function getConnectButtonLabel(isLoading: boolean, isConnected: boolean): string {
  if (isLoading) return "Loading...";
  if (isConnected) return "Disconnect Google Calendar";
  return "Connect Google Calendar";
}

async function navigateScheduleToNextClassDirections(
  nextClass: NextClassEvent | null,
  router: ReturnType<typeof useRouter>,
  setDestinationBuilding: (building: Building | null) => void,
  setStartBuilding: (building: Building | null) => void,
  setTransportationMode: (mode: TransportationMode) => void,
  setStartCoords: (coords: { lat: number; lng: number } | null) => void,
  fetchRoute: () => void | Promise<void>,
  getRawLocation: () => Promise<{ lat: number; lng: number } | null>,
): Promise<void> {
  if (!nextClass) return;
  const building = resolveLocationToBuilding(nextClass.location);
  if (!building) return;

  setDestinationBuilding(building);
  setStartBuilding(null);
  setTransportationMode("walk");

  const coords = await getRawLocation();
  if (coords) {
    setStartCoords(coords);
  }

  router.push("/(tabs)/two");
  setTimeout(() => {
    void fetchRoute();
  }, 300);
}

function ScheduleWeekDaysHeader({ weekDays }: { readonly weekDays: WeekDay[] }) {
  return (
    <View style={styles.weekHeader}>
      <View style={styles.weekHeaderTimeSpacer} />
      <View style={styles.weekHeaderDays}>
        {weekDays.map((day) => (
          <View key={day.label} style={styles.weekDayColumn}>
            <Text style={styles.weekDayLabel}>{day.label}</Text>
            {day.isActive ? (
              <View style={styles.activeDayCircle}>
                <Text style={styles.activeDayText}>{day.dayNumber}</Text>
              </View>
            ) : (
              <Text style={styles.weekDayNumber}>{day.dayNumber}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function ScheduleCalendarScrollMessages({
  eventsLoading,
  error,
  eventsError,
}: {
  readonly eventsLoading: boolean;
  readonly error: string | null;
  readonly eventsError: string | null;
}) {
  return (
    <>
      {eventsLoading ? (
        <Text style={styles.infoText}>Loading calendar events...</Text>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {eventsError ? (
        <Text style={styles.errorText}>{eventsError}</Text>
      ) : null}
    </>
  );
}

function ScheduleScreenBottomBar({
  isConnected,
  isLoading,
  connectButtonLabel,
  onConnectPress,
  calendars,
  onOpenCalendarPicker,
  thresholdMinutes,
  handleThresholdChange,
}: {
  readonly isConnected: boolean;
  readonly isLoading: boolean;
  readonly connectButtonLabel: string;
  readonly onConnectPress: () => void;
  readonly calendars: CalendarInfo[];
  readonly onOpenCalendarPicker: () => void;
  readonly thresholdMinutes: number;
  readonly handleThresholdChange: (delta: number) => void;
}) {
  const showManageCalendars = isConnected && calendars.length > 0;

  return (
    <View style={styles.bottomBar}>
      {isConnected ? (
        <View style={styles.connectedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
          <Text style={styles.connectedBadgeText}>
            Connected to Google Calendar
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.connectButton, isConnected && styles.connectedButton]}
        activeOpacity={0.85}
        onPress={onConnectPress}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
            <Text style={styles.connectButtonText}>{connectButtonLabel}</Text>
          </>
        )}
      </TouchableOpacity>

      {showManageCalendars ? (
        <TouchableOpacity
          style={styles.manageCalendarsButton}
          activeOpacity={0.8}
          onPress={onOpenCalendarPicker}
        >
          <Ionicons name="list-outline" size={16} color="#912338" />
          <Text style={styles.manageCalendarsText}>Manage Calendars</Text>
        </TouchableOpacity>
      ) : null}

      {isConnected ? (
        <View style={styles.thresholdRow}>
          <Ionicons name="notifications-outline" size={14} color="#6B7280" />
          <Text style={styles.thresholdLabel}>Remind me</Text>
          <TouchableOpacity
            testID="threshold-minus"
            style={styles.thresholdStepButton}
            activeOpacity={0.7}
            onPress={() => handleThresholdChange(-5)}
          >
            <Ionicons name="remove" size={14} color="#912338" />
          </TouchableOpacity>
          <Text style={styles.thresholdValue}>
            {thresholdMinutes === NO_LIMIT_THRESHOLD
              ? "Always"
              : `${thresholdMinutes} min`}
          </Text>
          <TouchableOpacity
            testID="threshold-plus"
            style={styles.thresholdStepButton}
            activeOpacity={0.7}
            onPress={() => handleThresholdChange(5)}
            disabled={thresholdMinutes >= MAX_THRESHOLD_MINUTES}
          >
            <Ionicons
              name="add"
              size={14}
              color={
                thresholdMinutes >= MAX_THRESHOLD_MINUTES
                  ? "#D1D5DB"
                  : "#912338"
              }
            />
          </TouchableOpacity>
          <Text style={styles.thresholdLabel}>
            {thresholdMinutes === NO_LIMIT_THRESHOLD
              ? "(no limit)"
              : "before class"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ScheduleCalendarPickerModal({
  visible,
  calendars,
  selectedCalendarIds,
  onRequestClose,
  onToggleCalendar,
  onSave,
}: {
  readonly visible: boolean;
  readonly calendars: CalendarInfo[];
  readonly selectedCalendarIds: Set<string>;
  readonly onRequestClose: () => void;
  readonly onToggleCalendar: (id: string) => void;
  readonly onSave: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Select Calendars</Text>

          <ScrollView style={styles.modalList}>
            {calendars.map((cal) => {
              const selected = selectedCalendarIds.has(cal.id);
              return (
                <TouchableOpacity
                  key={cal.id}
                  style={styles.calendarRow}
                  activeOpacity={0.7}
                  onPress={() => onToggleCalendar(cal.id)}
                >
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={selected ? "#912338" : "#9CA3AF"}
                  />
                  <Text style={styles.calendarRowText} numberOfLines={1}>
                    {cal.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={styles.modalSaveButton}
            activeOpacity={0.85}
            onPress={onSave}
          >
            <Text style={styles.modalSaveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

async function runConnectOrDisconnect(
  isLoading: boolean,
  isConnected: boolean,
  connectCalendar: () => Promise<void>,
  disconnectCalendar: () => Promise<void>,
) {
  if (isLoading) return;
  if (isConnected) {
    await disconnectCalendar();
    return;
  }
  await connectCalendar();
}

export default function ScheduleScreen() {
  const { connectCalendar, disconnectCalendar, isLoading, isConnected, error } =
    useCalendarAuth();

  const router = useRouter();
  const {
    setDestinationBuilding,
    setStartCoords,
    setStartBuilding,
    setTransportationMode,
    fetchRoute,
  } = useDirections();
  const { getRawLocation } = useUserLocation();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const scrollRef = useScheduleScrollToTime(currentDate);

  const {
    calendars,
    selectedCalendarIds,
    showCalendarPicker,
    setShowCalendarPicker,
    handleCalendarToggle,
    handleSaveCalendarSelection,
  } = useScheduleCalendarsAndSelection(isConnected);

  const { thresholdMinutes, handleThresholdChange } = useScheduleThreshold();

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const { events, eventsLoading, eventsError } = useScheduleEventsLoad(
    isConnected,
    weekDays,
    selectedCalendarIds,
  );

  const { nextClass, nextClassLoading } = useScheduleNextClassEvent(
    isConnected,
    selectedCalendarIds,
  );

  useScheduleUsabilityTask(
    isConnected,
    eventsLoading,
    selectedCalendarIds,
    events.length,
    nextClass !== null,
  );

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  const weekRangeLabel = useMemo(
    () => formatWeekRangeLabel(weekDays),
    [weekDays],
  );

  const onConnectPress = useCallback(async () => {
    await runConnectOrDisconnect(
      isLoading,
      isConnected,
      connectCalendar,
      disconnectCalendar,
    );
  }, [isLoading, isConnected, connectCalendar, disconnectCalendar]);

  const goToPreviousWeek = () => {
    setCurrentDate((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentDate((prev) => addDays(prev, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  const handleNextClassDirections = useCallback(() => {
    return navigateScheduleToNextClassDirections(
      nextClass,
      router,
      setDestinationBuilding,
      setStartBuilding,
      setTransportationMode,
      setStartCoords,
      fetchRoute,
      getRawLocation,
    );
  }, [
    nextClass,
    router,
    setDestinationBuilding,
    setStartBuilding,
    setTransportationMode,
    setStartCoords,
    fetchRoute,
    getRawLocation,
  ]);

  const { searchDestinationRoom, setDestinationSearchQuery } = useIndoorMap();

  const handleNextClassIndoorDirections = useCallback(() => {
    if (!nextClass?.location) return;
    setDestinationSearchQuery(nextClass.location);
    searchDestinationRoom(nextClass.location);
    router.push("/(tabs)/indoor");
  }, [nextClass, router, searchDestinationRoom, setDestinationSearchQuery]);

  const allDayEvents = useMemo(
    () => events.filter((event) => event.isAllDay),
    [events],
  );

  return (
    <View style={styles.screen}>
      <Header />

      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={styles.navButton}
          activeOpacity={0.8}
          onPress={goToPreviousWeek}
        >
          <Ionicons name="chevron-back" size={18} color="#912338" />
        </TouchableOpacity>

        <View style={styles.navigationCenter}>
          <Text style={styles.navigationTitle}>{weekRangeLabel}</Text>

          <TouchableOpacity
            style={styles.todayButton}
            activeOpacity={0.8}
            onPress={goToCurrentWeek}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          activeOpacity={0.8}
          onPress={goToNextWeek}
        >
          <Ionicons name="chevron-forward" size={18} color="#912338" />
        </TouchableOpacity>
      </View>

      <ScheduleWeekDaysHeader weekDays={weekDays} />

      {isConnected ? (
        <NextClassCard
          nextClass={nextClass}
          isLoading={nextClassLoading}
          onGetDirections={handleNextClassDirections}
          onIndoorDirections={handleNextClassIndoorDirections}
          thresholdMinutes={thresholdMinutes}
        />
      ) : null}

      {allDayEvents.length > 0 ? (
        <View style={styles.allDaySection}>
          <Text style={styles.allDayTitle}>All-day events</Text>
          {allDayEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.allDayEvent}
              activeOpacity={0.8}
              onPress={() => setSelectedEvent(event)}
            >
              <Text style={styles.allDayEventText}>{event.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.calendarBody}>
        <ScrollView
          ref={scrollRef}
          style={styles.calendarScroll}
          contentContainerStyle={styles.calendarScrollContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <View style={styles.gridWrapper}>
            <View style={styles.timeColumn}>
              {HOURS.map((hour) => (
                <View key={hour} style={styles.timeCell}>
                  <Text style={styles.timeLabel}>{formatHourLabel(hour)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.gridColumns}>
              {weekDays.map((day) => (
                <ScheduleDayColumn
                  key={`grid-${day.label}`}
                  day={day}
                  events={events}
                  onEventPress={setSelectedEvent}
                />
              ))}
            </View>
          </View>

          <ScheduleCalendarScrollMessages
            eventsLoading={eventsLoading}
            error={error}
            eventsError={eventsError}
          />
        </ScrollView>
      </View>

      <ScheduleScreenBottomBar
        isConnected={isConnected}
        isLoading={isLoading}
        connectButtonLabel={getConnectButtonLabel(isLoading, isConnected)}
        onConnectPress={onConnectPress}
        calendars={calendars}
        onOpenCalendarPicker={() => setShowCalendarPicker(true)}
        thresholdMinutes={thresholdMinutes}
        handleThresholdChange={handleThresholdChange}
      />

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <ScheduleCalendarPickerModal
        visible={showCalendarPicker}
        calendars={calendars}
        selectedCalendarIds={selectedCalendarIds}
        onRequestClose={() => setShowCalendarPicker(false)}
        onToggleCalendar={handleCalendarToggle}
        onSave={handleSaveCalendarSelection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  navigationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FDECEF",
    justifyContent: "center",
    alignItems: "center",
  },
  navigationCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  navigationTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  todayButton: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#912338",
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  weekHeader: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 10,
  },
  weekHeaderTimeSpacer: {
    width: TIME_COLUMN_WIDTH,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  weekHeaderDays: {
    flex: 1,
    flexDirection: "row",
  },
  weekDayColumn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  weekDayLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  weekDayNumber: {
    fontSize: 22,
    color: "#111827",
    fontWeight: "500",
  },
  activeDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#912338",
    justifyContent: "center",
    alignItems: "center",
  },
  activeDayText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  nextClassCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#912338",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nextClassHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  nextClassLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#912338",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  nextClassSpinner: {
    marginLeft: 4,
  },
  nextClassHeaderChevron: {
    marginLeft: 4,
  },
  nextClassTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  nextClassTime: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 4,
  },
  nextClassLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nextClassLocation: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  nextClassNoLocation: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  nextClassDirectionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#912338",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  nextClassDirectionsText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  allDaySection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  allDayTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  allDayEvent: {
    backgroundColor: "#912338",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  allDayEventText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  calendarBody: {
    flex: 1,
  },
  calendarScroll: {
    flex: 1,
  },
  calendarScrollContent: {
    paddingBottom: 110,
  },
  gridWrapper: {
    flexDirection: "row",
    height: HOUR_ROW_HEIGHT * SCHEDULE_HOUR_SLOTS,
    backgroundColor: "#FFFFFF",
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  timeCell: {
    height: HOUR_ROW_HEIGHT,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  timeLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "center",
  },
  gridColumns: {
    flex: 1,
    flexDirection: "row",
  },
  dayGridColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    position: "relative",
  },
  activeGridColumn: {
    backgroundColor: "#FAFAFA",
  },
  gridCell: {
    height: HOUR_ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  eventBlock: {
    position: "absolute",
    left: 4,
    right: 4,
    backgroundColor: "#912338",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
    zIndex: 2,
    overflow: "hidden",
  },
  eventTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 11,
  },
  eventTime: {
    color: "#FDECEF",
    fontSize: 10,
    marginTop: 2,
  },
  infoText: {
    color: "#374151",
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  connectButton: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#912338",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  connectedButton: {
    backgroundColor: "#4B5563",
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 10,
  },
  connectedBadgeText: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "600",
  },
  manageCalendarsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  manageCalendarsText: {
    color: "#912338",
    fontSize: 13,
    fontWeight: "600",
  },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  thresholdLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  thresholdValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    minWidth: 46,
    textAlign: "center",
  },
  thresholdStepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: "60%",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
    textAlign: "center",
  },
  modalList: {
    marginBottom: 16,
  },
  calendarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  calendarRowText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  modalSaveButton: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#912338",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSaveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  eventDetailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 10,
  },
  eventDetailAccent: {
    width: 4,
    borderRadius: 2,
    backgroundColor: "#912338",
    alignSelf: "stretch",
    minHeight: 20,
    flexShrink: 0,
  },
  eventDetailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 24,
  },
  eventDetailCloseButton: {
    padding: 2,
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  eventDetailText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  eventDetailDescriptionBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  eventDetailDescriptionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  eventDetailDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
});
