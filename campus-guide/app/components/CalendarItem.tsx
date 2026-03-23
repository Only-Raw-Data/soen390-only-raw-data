import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY_COLOR } from '@constants/ColorPalette';
import { GoogleCalendar } from '@services/calendarListService';

export function CalendarItem({
  calendar,
  isSelected,
  onSelect,
}: {
  readonly calendar: GoogleCalendar;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
}) {
  const dotColor = calendar.backgroundColor ?? PRIMARY_COLOR;

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
        <Ionicons name="checkmark-circle" size={22} color={PRIMARY_COLOR} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
