import React, { useMemo } from "react";
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
import CalendarList from "@components/CalendarList";
import CalendarSelectionProvider, {
  useCalendarSelection,
} from "@context/CalendarSelectionContext";
import { useCalendarAuth } from "@context/CalendarAuthContext";
import { formatHourLabel } from "@utils/timeFormat";
import { buildHourSlots } from "@utils/timeSlots";

type WeekDay = {
  label: string;
  dayNumber: string;
  isActive: boolean;
};

const PRIMARY_COLOR = "#912338";
const SCHEDULE_START_HOUR_24 = 8;
const SCHEDULE_HOUR_SLOTS = 12;

const WEEK_DAYS: WeekDay[] = [
  { label: "MON", dayNumber: "16", isActive: false },
  { label: "TUE", dayNumber: "17", isActive: true },
  { label: "WED", dayNumber: "18", isActive: false },
  { label: "THU", dayNumber: "19", isActive: false },
  { label: "FRI", dayNumber: "20", isActive: false },
];

const HOURS = buildHourSlots(SCHEDULE_START_HOUR_24, SCHEDULE_HOUR_SLOTS);

function CalendarSelectionSection() {
  const { calendars, selectedCalendarId, isLoading, fetchCalendars } =
    useCalendarSelection();

  const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId);

  return (
    <View style={styles.selectionSection}>
      {selectedCalendarId && selectedCalendar ? (
        <View style={styles.selectedSummary}>
          <Ionicons name="checkmark-circle" size={16} color={PRIMARY_COLOR} />
          <Text style={styles.selectedSummaryText} numberOfLines={1}>
            {selectedCalendar.summary}
          </Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Select a Calendar</Text>
        {calendars.length === 0 && !isLoading ? (
          <TouchableOpacity
            style={styles.fetchButton}
            onPress={fetchCalendars}
            accessibilityRole="button"
            accessibilityLabel="Fetch calendars"
          >
            <Ionicons
              name="refresh-outline"
              size={14}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.fetchButtonText}>Fetch Calendars</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.calendarListContainer}>
        <CalendarList />
      </View>
    </View>
  );
}

function ScheduleContent() {
  const { connectCalendar, disconnectCalendar, isLoading, isConnected, error } =
    useCalendarAuth();

  const buttonLabel = useMemo(() => {
    if (isLoading) return "Connecting...";
    if (isConnected) return "Google Calendar Connected";
    return "Connect Google Calendar";
  }, [isLoading, isConnected]);

  const onConnectPress = async () => {
    if (isConnected || isLoading) return;
    await connectCalendar();
  };

  return (
    <View style={styles.screen}>
      <Header />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.weekHeader}>
          {WEEK_DAYS.map((day) => (
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

        <View style={styles.gridWrapper}>
          <View style={styles.timeColumn}>
            {HOURS.map((hour) => (
              <View key={hour} style={styles.timeCell}>
                <Text style={styles.timeLabel}>{formatHourLabel(hour)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.gridColumns}>
            {WEEK_DAYS.map((day) => (
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
              </View>
            ))}
          </View>
        </View>

        {isConnected ? <CalendarSelectionSection /> : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        {isConnected ? (
          <TouchableOpacity
            style={styles.disconnectButton}
            activeOpacity={0.85}
            onPress={disconnectCalendar}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Disconnect Google Calendar"
          >
            {isLoading ? (
              <ActivityIndicator color={PRIMARY_COLOR} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color={PRIMARY_COLOR} />
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.connectButton, isConnected && styles.connectedButton]}
            activeOpacity={0.85}
            onPress={onConnectPress}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Connect Google Calendar"
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
        )}
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  return (
    <CalendarSelectionProvider>
      <ScheduleContent />
    </CalendarSelectionProvider>
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
    paddingHorizontal: 4,
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
    backgroundColor: PRIMARY_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  activeDayText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  gridWrapper: {
    flexDirection: "row",
    minHeight: 720,
    backgroundColor: "#FFFFFF",
  },
  timeColumn: {
    width: 54,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  timeCell: {
    height: 60,
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
  },
  activeGridColumn: {
    backgroundColor: "#FAFAFA",
  },
  gridCell: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectionSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  selectedSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF5F6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY_COLOR,
  },
  selectedSummaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_COLOR,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  fetchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  fetchButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: "500",
  },
  calendarListContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
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
    backgroundColor: PRIMARY_COLOR,
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
  disconnectButton: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  disconnectButtonText: {
    color: PRIMARY_COLOR,
    fontWeight: "600",
    fontSize: 15,
  },
});
