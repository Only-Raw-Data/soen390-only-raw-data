import React, { useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarSelection } from '@context/CalendarSelectionContext';
import { GoogleCalendar } from '@services/calendarListService';
import { CalendarItem } from '@components/CalendarItem';
import { PRIMARY_COLOR } from '@constants/ColorPalette';

export default function CalendarList() {
  const { calendars, selectedCalendarId, isLoading, error, selectCalendar } =
    useCalendarSelection();

  const renderItem = useCallback(
    ({ item }: { item: GoogleCalendar }) => (
      <CalendarItem
        calendar={item}
        isSelected={selectedCalendarId === item.id}
        onSelect={selectCalendar}
      />
    ),
    [selectedCalendarId, selectCalendar],
  );

  if (isLoading) {
    return (
      <View style={styles.centeredContainer} testID="calendar-list-loading">
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
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
      renderItem={renderItem}
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
});
