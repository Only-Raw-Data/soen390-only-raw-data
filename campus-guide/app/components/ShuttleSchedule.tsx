import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHUTTLE_SCHEDULE, ShuttleTime } from '../../constants/shuttleSchedule';

type ScheduleDay = 'mondayThursday' | 'friday';

interface ShuttleScheduleProps {
  compact?: boolean;
}

export function ShuttleSchedule({ compact = false }: ShuttleScheduleProps = {}) {
  const [selectedDay, setSelectedDay] = useState<ScheduleDay>('mondayThursday');

  const currentSchedule = SHUTTLE_SCHEDULE[selectedDay];

  const formatTime = (time: string | null): string => {
    if (!time) return '—';
    return time;
  };

  const isLastBus = (time: string | null): boolean => {
    return time !== null && time.includes('*');
  };

  const containerStyle = compact 
    ? [styles.container, styles.compactContainer]
    : [styles.container, { flex: 0, minHeight: 600 }];

  return (
    <View style={containerStyle}>
      {/* Title */}
      {!compact && (
      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <Ionicons name="bus" size={24} color="#912338" />
          <Text style={styles.title}>Shuttle Bus Schedule</Text>
        </View>
        <Text style={styles.subtitle}>Loyola ↔ SGW Campus</Text>
      </View>
      )}

      {/* Day Selector */}
      <View style={[styles.daySelector, compact && { marginBottom: 12 }]}>
        <TouchableOpacity
          style={[
            styles.dayButton,
            selectedDay === 'mondayThursday' && styles.dayButtonActive,
          ]}
          onPress={() => setSelectedDay('mondayThursday')}
        >
          <Text
            style={[
              styles.dayButtonText,
              selectedDay === 'mondayThursday' && styles.dayButtonTextActive,
            ]}
          >
            Monday — Thursday
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.dayButton,
            selectedDay === 'friday' && styles.dayButtonActive,
          ]}
          onPress={() => setSelectedDay('friday')}
        >
          <Text
            style={[
              styles.dayButtonText,
              selectedDay === 'friday' && styles.dayButtonTextActive,
            ]}
          >
            Friday
          </Text>
        </TouchableOpacity>
      </View>

      {/* Schedule Table */}
      <View style={[styles.tableContainer, compact && styles.compactTableContainer]}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.loyolaColumn]}>
            LOY departures
          </Text>
          <Text style={[styles.tableHeaderText, styles.sgwColumn]}>
            S.G.W departures
          </Text>
        </View>

        <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={true}>
          {currentSchedule.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No schedule available</Text>
            </View>
          ) : (
            currentSchedule.map((entry: ShuttleTime, index: number) => (
            <View
              key={`${selectedDay}-${index}-${entry.loyola}-${entry.sgw || 'null'}`}
              style={[
                styles.tableRow,
                entry.isLastBus && styles.lastBusRow,
              ]}
            >
              <View style={[styles.tableCell, styles.loyolaColumn]}>
                <Text
                  style={[
                    styles.tableCellText,
                    isLastBus(entry.loyola) && styles.lastBusText,
                  ]}
                >
                  {formatTime(entry.loyola)}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.sgwColumn]}>
                <Text
                  style={[
                    styles.tableCellText,
                    isLastBus(entry.sgw) && styles.lastBusText,
                  ]}
                >
                  {formatTime(entry.sgw)}
                </Text>
              </View>
            </View>
          ))
          )}
        </ScrollView>
      </View>

      {/* Last Bus Note */}
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          * <Text style={styles.noteBold}>Last bus / Dernier départ</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  compactContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    flex: 0,
    minHeight: 0,
  },
  compactTableContainer: {
    minHeight: 400,
    maxHeight: 500,
  },
  titleContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 36,
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#912338',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 16,
    overflow: 'hidden',
    minHeight: 400,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
  },
  tableBody: {
    maxHeight: 500,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastBusRow: {
    backgroundColor: '#FEF3F2',
  },
  tableCell: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  loyolaColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sgwColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tableCellText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  lastBusText: {
    color: '#912338',
    fontWeight: '600',
  },
  noteContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  noteBold: {
    fontWeight: '600',
    color: '#374151',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

