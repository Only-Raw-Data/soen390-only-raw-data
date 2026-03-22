import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarSelection } from '@context/CalendarSelectionContext';
import { GoogleCalendar } from '@services/calendarListService';

const DEFAULT_CALENDAR_COLOR = '#912338';

function CalendarItem({
  calendar,
  isSelected,
  onSelect,
}: {
  readonly calendar: GoogleCalendar;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
}) {
  const dotColor = calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR;

  return (
    <TouchableOpacity
      style={[styles.item, isSelected && styles.itemSelected]}
      onPress={() => onSelect(calendar.id)}
      accessibilityRole="button"
      accessibilityLabel={`Select ${calendar.summary} calendar`}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={[styles.colorDot, { backgroundColor: dotColor }]} />
      <View style={styles.itemTextContainer}>
        <Text style={[styles.itemTitle, isSelected && styles.itemTitleSelected]}>
          {calendar.summary}
        </Text>
        {calendar.description ? (
          <Text style={styles.itemDescription} numberOfLines={1}>
            {calendar.description}
          </Text>
        ) : null}
      </View>
      {isSelected ? (
        <Ionicons name="checkmark-circle" size={22} color={DEFAULT_CALENDAR_COLOR} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function CalendarList() {
  const { calendars, selectedCalendarId, isLoading, error, selectCalendar } =
    useCalendarSelection();

  if (isLoading) {
    return (
      <View style={styles.centeredContainer} testID="calendar-list-loading">
        <ActivityIndicator size="large" color={DEFAULT_CALENDAR_COLOR} />
        <Text style={styles.loadingText}>Loading calendars...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer} testID="calendar-list-error">
        <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (calendars.length === 0) {
    return (
      <View style={styles.centeredContainer} testID="calendar-list-empty">
        <Text style={styles.emptyText}>No calendars found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={calendars}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CalendarItem
          calendar={item}
          isSelected={selectedCalendarId === item.id}
          onSelect={selectCalendar}
        />
      )}
      testID="calendar-list"
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  itemSelected: {
    backgroundColor: '#FFF5F6',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    flexShrink: 0,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  itemTitleSelected: {
    color: '#912338',
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
