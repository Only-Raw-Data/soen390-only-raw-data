import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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
import { getStoredCalendarAccessToken } from "@services/calendarAuthService";

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

function getCurrentWorkWeek(): WeekDay[] {
  const today = new Date();
  const currentDay = today.getDay();

  const monday = new Date(today);
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const labels = ["MON", "TUE", "WED", "THU", "FRI"];

  return labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      label,
      dayNumber: String(date.getDate()),
      isActive: date.toDateString() === today.toDateString(),
      date,
    };
  });
}

function getWeekBounds(weekDays: WeekDay[]) {
  const start = new Date(weekDays[0].date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(weekDays[weekDays.length - 1].date);
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

async function fetchCalendarList(token: string): Promise<string[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch calendar list: ${errorText}`);
  }

  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .filter((item: any) => typeof item.id === "string")
    .map((item: any) => item.id);
}

async function fetchGoogleCalendarEvents(
  weekDays: WeekDay[],
): Promise<CalendarEvent[]> {
  const token = await getStoredCalendarAccessToken();

  if (!token) {
    throw new Error("No Google Calendar access token found.");
  }

  const { start, end } = getWeekBounds(weekDays);
  const calendarIds = await fetchCalendarList(token);

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

export default function ScheduleScreen() {
  const {
    connectCalendar,
    disconnectCalendar,
    isLoading,
    isConnected,
    error,
  } = useCalendarAuth();

  const scrollRef = useRef<ScrollView>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const weekDays = useMemo(() => getCurrentWorkWeek(), []);

  const buttonLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    if (isConnected) return "Disconnect Google Calendar";
    return "Connect Google Calendar";
  }, [isLoading, isConnected]);

  const loadEvents = useCallback(async () => {
    if (!isConnected) {
      setEvents([]);
      setEventsError(null);
      return;
    }

    setEventsLoading(true);
    setEventsError(null);

    try {
      const fetchedEvents = await fetchGoogleCalendarEvents(weekDays);
      setEvents(fetchedEvents);
    } catch (err) {
      setEventsError(
        err instanceof Error ? err.message : "Failed to load calendar events.",
      );
    } finally {
      setEventsLoading(false);
    }
  }, [isConnected, weekDays]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const now = new Date();
    const minutesFromStart =
      (now.getHours() - SCHEDULE_START_HOUR_24) * 60 + now.getMinutes();

    const y = Math.max((minutesFromStart / 60) * HOUR_ROW_HEIGHT - 120, 0);

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 300);

    return () => clearTimeout(timeout);
  }, []);

  const onConnectPress = async () => {
    if (isLoading) return;

    if (isConnected) {
      await disconnectCalendar();
      return;
    }

    await connectCalendar();
  };

  const allDayEvents = useMemo(
    () => events.filter((event) => event.isAllDay),
    [events],
  );

  return (
    <View style={styles.screen}>
      <Header />

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

      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
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

      <View style={styles.bottomBar}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 110,
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
  gridWrapper: {
    flexDirection: "row",
    minHeight: HOUR_ROW_HEIGHT * SCHEDULE_HOUR_SLOTS,
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
});