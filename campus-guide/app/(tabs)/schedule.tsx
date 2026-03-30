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
import { usePostHog } from "posthog-react-native";
import Header from "@app/components/Header";
import { useCalendarAuth } from "@context/CalendarAuthContext";
import { useScreenTimer } from "@hooks/useScreenTimer";
import { formatHourLabel } from "@utils/timeFormat";
import { buildHourSlots } from "@utils/timeSlots";
import {
  type CalendarInfo,
  type NextClassEvent,
  fetchCalendars,
  fetchNextClassEvent,
  getFreshCalendarAccessToken,
  getSelectedCalendarIds,
  saveSelectedCalendarIds,
} from "@services/calendarAuthService";

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

  const labels = ["MON", "TUE", "WED", "THU", "FRI"];

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
        .filter((item: any) => typeof item.id === "string" && item.start && item.end)
        .map((item: any) => {
          const isAllDay = Boolean(item.start?.date && item.end?.date);

          return {
            id: `${calendarId}_${item.id}`,
            title: item.summary || "Untitled Event",
            start: new Date(item.start?.dateTime || item.start?.date),
            end: new Date(item.end?.dateTime || item.end?.date),
            isAllDay,
          };
        });
    }),
  );

  return allResults.flat();
}

function NextClassCard({
  nextClass,
  isLoading,
}: {
  readonly nextClass: NextClassEvent | null;
  readonly isLoading: boolean;
}) {
  if (!isLoading && nextClass === null) return null;

  return (
    <View style={styles.nextClassCard}>
      <View style={styles.nextClassHeader}>
        <Ionicons name="school-outline" size={14} color="#912338" />
        <Text style={styles.nextClassLabel}>Next Class</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color="#912338" style={styles.nextClassSpinner} />
        ) : null}
      </View>
      {nextClass ? (
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
          {nextClass.location ? (
            <View style={styles.nextClassLocationRow}>
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text style={styles.nextClassLocation} numberOfLines={1}>
                {nextClass.location}
              </Text>
            </View>
          ) : (
            <Text style={styles.nextClassNoLocation}>No location specified</Text>
          )}
        </>
      ) : null}
    </View>
  );
}

export default function ScheduleScreen() {
  useScreenTimer("Schedule");
  const posthog = usePostHog();
  const {
    connectCalendar,
    disconnectCalendar,
    isLoading,
    isConnected,
    error,
  } = useCalendarAuth();

  const scrollRef = useRef<ScrollView>(null);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    new Set(),
  );
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  const [nextClass, setNextClass] = useState<NextClassEvent | null>(null);
  const [nextClassLoading, setNextClassLoading] = useState(false);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(weekDays), [weekDays]);

  const buttonLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    if (isConnected) return "Disconnect Google Calendar";
    return "Connect Google Calendar";
  }, [isLoading, isConnected]);

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
        setSelectedCalendarIds(new Set(fetched.map((c) => c.id)));
      } else {
        setSelectedCalendarIds(new Set(saved));
      }
    }

    void loadCalendars();
  }, [isConnected]);

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
        const event = await fetchNextClassEvent(token, [...selectedCalendarIds]);
        setNextClass(event);
      } catch {
        setNextClass(null);
      } finally {
        setNextClassLoading(false);
      }
    }

    void loadNextClass();
  }, [isConnected, selectedCalendarIds]);

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

  const onConnectPress = async () => {
    if (isLoading) return;

    if (isConnected) {
      posthog.capture('calendar_disconnected');
      await disconnectCalendar();
      return;
    }

    posthog.capture('calendar_connected');
    await connectCalendar();
  };

  const goToPreviousWeek = () => {
    posthog.capture('schedule_week_navigated', { direction: 'previous' });
    setCurrentDate((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    posthog.capture('schedule_week_navigated', { direction: 'next' });
    setCurrentDate((prev) => addDays(prev, 7));
  };

  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

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

      {isConnected ? (
        <NextClassCard nextClass={nextClass} isLoading={nextClassLoading} />
      ) : null}

      {allDayEvents.length > 0 ? (
        <View style={styles.allDaySection}>
          <Text style={styles.allDayTitle}>All-day events</Text>
          {allDayEvents.map((event) => (
            <View key={event.id} style={styles.allDayEvent}>
              <Text style={styles.allDayEventText}>{event.title}</Text>
            </View>
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
              {weekDays.map((day) => {
                const dayEvents = events.filter(
                  (event) => !event.isAllDay && isSameDay(event.start, day.date),
                );

                return (
                  <View
                    key={`grid-${day.label}`}
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

                      const { top, height } = getEventLayout(
                        clampedStart,
                        clampedEnd,
                      );

                      return (
                        <View
                          key={event.id}
                          style={[
                            styles.eventBlock,
                            {
                              top,
                              height,
                            },
                          ]}
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
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View>

          {eventsLoading ? (
            <Text style={styles.infoText}>Loading calendar events...</Text>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {eventsError ? <Text style={styles.errorText}>{eventsError}</Text> : null}
        </ScrollView>
      </View>

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
              <Text style={styles.connectButtonText}>{buttonLabel}</Text>
            </>
          )}
        </TouchableOpacity>

        {isConnected && calendars.length > 0 ? (
          <TouchableOpacity
            style={styles.manageCalendarsButton}
            activeOpacity={0.8}
            onPress={() => setShowCalendarPicker(true)}
          >
            <Ionicons name="list-outline" size={16} color="#912338" />
            <Text style={styles.manageCalendarsText}>Manage Calendars</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={showCalendarPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendarPicker(false)}
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
                    onPress={() => handleCalendarToggle(cal.id)}
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
              onPress={handleSaveCalendarSelection}
            >
              <Text style={styles.modalSaveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
});