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
import { useCalendarAuth } from "@context/CalendarAuthContext";
import { formatHourLabel } from "@utils/timeFormat";
import { buildHourSlots } from "@utils/timeSlots";

type WeekDay = {
  label: string;
  dayNumber: string;
  isActive?: boolean;
};

const SCHEDULE_START_HOUR_24 = 8;
const SCHEDULE_HOUR_SLOTS = 12;

const WEEK_DAYS: WeekDay[] = [
  { label: "MON", dayNumber: "16" },
  { label: "TUE", dayNumber: "17", isActive: true },
  { label: "WED", dayNumber: "18" },
  { label: "THU", dayNumber: "19" },
  { label: "FRI", dayNumber: "20" },
];

const HOURS = buildHourSlots(SCHEDULE_START_HOUR_24, SCHEDULE_HOUR_SLOTS);

export default function ScheduleScreen() {
  const { connectCalendar, isLoading, isConnected, error } = useCalendarAuth();

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
                style={[styles.dayGridColumn, day.isActive && styles.activeGridColumn]}
              >
                {HOURS.map((hour) => (
                  <View key={`${day.label}-${hour}`} style={styles.gridCell} />
                ))}
              </View>
            ))}
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.connectButton, isConnected && styles.connectedButton]}
          activeOpacity={0.85}
          onPress={onConnectPress}
          disabled={isConnected || isLoading}
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
    backgroundColor: "#912338",
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


