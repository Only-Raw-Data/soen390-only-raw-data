import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDirections } from '../context/DirectionsContext';
import { TransportationMode } from '@app/types/transportation';
import { SGW_BUILDINGS, LOYOLA_BUILDINGS, Building } from '@/constants/buildings';
import useUserLocation from '@hooks/useUserLocation';
import ShuttleSchedule from './ShuttleSchedule';
import { getNextShuttleTimeLabel } from '@app/utils/shuttleHours';

export default function DirectionsHeader() {
  const {
    startBuilding,
    destinationBuilding,
    startCoords,
    transportationMode,
    setStartBuilding,
    setDestinationBuilding,
    setStartCoords,
    setTransportationMode,
    swapLocations,
    clearDirections,
    fetchRoute,
    isLoadingRoute,
  } = useDirections();

  const { getRawLocation, isLoading: locationLoading, resetLoadingState } = useUserLocation();

  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [nextShuttleTime, setNextShuttleTime] = useState<string | null>(null);

  useEffect(() => {
    if (transportationMode === 'shuttle' && startBuilding && destinationBuilding && startBuilding.campus !== destinationBuilding.campus) {
      setNextShuttleTime(getNextShuttleTimeLabel(startBuilding, destinationBuilding));
    } else {
      setNextShuttleTime(null);
    }
  }, [transportationMode, startBuilding, destinationBuilding]);

  useEffect(() => {
    if ((startBuilding || startCoords) && destinationBuilding) {
      fetchRoute();
    }
  }, [startBuilding, startCoords, destinationBuilding, transportationMode]);

  const handleUseCurrentLocation = async () => {
    setIsSearchingStart(false);
    setSearchQuery('');
    const coords = await getRawLocation();
    if (coords) {
      setStartCoords(coords);
      setStartBuilding(null);
    } else {
      Alert.alert('Location Error', 'Could not determine your location. Please ensure location permissions are enabled.');
    }
  };

  const allBuildings = [...SGW_BUILDINGS, ...LOYOLA_BUILDINGS];
  const filteredBuildings = allBuildings.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectBuilding = (building: Building, type: 'start' | 'dest') => {
    if (type === 'start') {
      setStartBuilding(building);
      setStartCoords(null);
      setIsSearchingStart(false);
    } else {
      setDestinationBuilding(building);
      setIsSearchingDest(false);
    }
    setSearchQuery('');
  };

  const modes: { id: TransportationMode; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
    { id: 'walk', icon: 'walk', label: 'Walk' },
    { id: 'car', icon: 'car', label: 'Car' },
    { id: 'transit', icon: 'bus', label: 'Transit' },
    { id: 'shuttle', icon: 'bus-outline', label: 'Shuttle' },
  ];

  // Shuttle departs from Hall Building (SGW) and arrives at Vanier Library (Loyola), and vice versa
  const shuttleDefaultStart = SGW_BUILDINGS.find(b => b.id === 'h');
  const shuttleDefaultDest = LOYOLA_BUILDINGS.find(b => b.id === 'vl');

  const handleModePress = (mode: TransportationMode) => {
    setTransportationMode(mode);
    if (mode === 'shuttle' && shuttleDefaultStart && shuttleDefaultDest) {
      setStartBuilding(shuttleDefaultStart);
      setStartCoords(null);
      setDestinationBuilding(shuttleDefaultDest);
    }
  };

  let startDisplayValue = '';
  if (isSearchingStart) {
    startDisplayValue = searchQuery;
  } else if (startCoords) {
    startDisplayValue = 'Current Location';
  } else {
    startDisplayValue = startBuilding?.name || '';
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text testID="directions-title" style={styles.title}>Get Directions</Text>
            <TouchableOpacity onPress={() => { clearDirections(); resetLoadingState(); }}>
              <Ionicons name="trash-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputsContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={20} color="#912338" style={styles.inputIcon} />
              <TextInput
                testID="start-input"
                style={styles.input}
                placeholder="Start location"
                value={startDisplayValue}
                onFocus={() => {
                  setIsSearchingStart(true);
                  setIsSearchingDest(false);
                }}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                testID="current location"
                onPress={handleUseCurrentLocation}
                disabled={locationLoading}
                style={styles.locateButton}
              >
                {locationLoading ? (
                  <ActivityIndicator testID="location-loading" size="small" color="#912338" />
                ) : (
                  <Ionicons name="navigate" size={20} color="#912338" />
                )}
              </TouchableOpacity>
              <TouchableOpacity testID="swap-button" onPress={swapLocations}>
                <Ionicons name="swap-vertical-outline" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="location" size={20} color="#912338" style={styles.inputIcon} />
              <TextInput
                testID="dest-input"
                style={styles.input}
                placeholder="Destination"
                value={isSearchingDest ? searchQuery : (destinationBuilding?.name || '')}
                onFocus={() => {
                  setIsSearchingDest(true);
                  setIsSearchingStart(false);
                }}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {(isSearchingStart || isSearchingDest) && searchQuery.length > 0 && (
            <View style={styles.searchResults}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {filteredBuildings.map(building => (
                  <TouchableOpacity
                    key={building.id}
                    id={building.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectBuilding(building, isSearchingStart ? 'start' : 'dest')}
                  >
                    <View style={styles.resultBadge}>
                      <Text style={styles.resultBadgeText}>{building.code}</Text>
                    </View>
                    <View>
                      <Text style={styles.resultName}>{building.name}</Text>
                      <Text style={styles.resultCampus}>{building.campus} Campus</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.modesContainer}>
            {modes.map(mode => (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeButton, transportationMode === mode.id && styles.modeButtonActive]}
                onPress={() => handleModePress(mode.id)}
              >
                <Ionicons
                  name={mode.icon}
                  size={24}
                  color={transportationMode === mode.id ? '#FFFFFF' : '#374151'}
                />
                <Text style={[styles.modeLabel, transportationMode === mode.id && styles.modeLabelActive]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {transportationMode === 'shuttle' && startBuilding && destinationBuilding && startBuilding.campus !== destinationBuilding.campus && (
            <Text testID="shuttle-direction-label" style={styles.shuttleDirectionLabel}>
              Shuttle {startBuilding.campus === 'SGW' ? 'To Loyola' : 'To SGW'}
            </Text>
          )}

          {nextShuttleTime && (
            <View style={styles.shuttleHint}>
              <Ionicons name="information-circle-outline" size={16} color="#912338" />
              <Text style={styles.shuttleHintText}>{nextShuttleTime}</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(true)}>
                <Text style={styles.shuttleHintLink}>Full Schedule</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            testID="get-directions-button"
            style={[
              styles.getDirectionsButton,
              ((!startBuilding && !startCoords) || !destinationBuilding || isLoadingRoute) && styles.getDirectionsButtonDisabled,
            ]}
            disabled={(!startBuilding && !startCoords) || !destinationBuilding || isLoadingRoute}
            onPress={fetchRoute}
          >
            {isLoadingRoute ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
                <Text style={styles.getDirectionsButtonText}>Get Directions</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showScheduleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="bus" size={24} color="#912338" />
                <Text style={styles.modalTitle}>Shuttle Bus Schedule</Text>
              </View>
              <TouchableOpacity
                testID="close-shuttle-modal"
                onPress={() => setShowScheduleModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScheduleContainer}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={true}
            >
              <ShuttleSchedule compact={false} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
  },
  content: { padding: 20 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#111827' },
  inputsContainer: { gap: 12, marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: { marginRight: 8 },
  locateButton: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#374151' },
  modesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modeButton: {
    flex: 1,
    aspectRatio: 1.2,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modeButtonActive: { backgroundColor: '#912338' },
  modeLabel: { fontSize: 11, marginTop: 4, color: '#374151', fontWeight: '500' },
  modeLabelActive: { color: '#FFFFFF' },
  getDirectionsButton: {
    backgroundColor: '#912338',
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  getDirectionsButtonDisabled: { backgroundColor: '#D1D5DB' },
  getDirectionsButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  searchResults: {
    position: 'absolute',
    top: 160,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultBadge: {
    width: 36,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#912338' },
  resultName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  resultCampus: { fontSize: 12, color: '#6B7280' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    flexDirection: 'column',
  },
  modalScheduleContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  closeButton: { padding: 4 },
  shuttleDirectionLabel: {
    fontSize: 14,
    color: '#912338',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
  },
  shuttleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3F2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  shuttleHintText: { fontSize: 13, color: '#912338', fontWeight: '500', flex: 1 },
  shuttleHintLink: { fontSize: 13, color: '#3B82F6', fontWeight: '600', textDecorationLine: 'underline' },
});