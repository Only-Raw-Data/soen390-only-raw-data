import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import BuildingSearchHeader from './BuildingSearchComponent';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Campus, Building, SGW_BUILDINGS, LOYOLA_BUILDINGS,CAMPUS_REGIONS } from './../../constants/buildings';
import { useDirections } from '../context/DirectionsContext';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { useBuildingPolygons } from '../hooks/useBuildingPolygons';
import { CAMPUS_MAP_STYLE } from '../../constants/mapStyle';
import  BuildingInformation  from './BuildingInformation';

interface MapViewAppProps {
    googleMapsApiKey?: string;
    showSearch?: boolean;
}

export function MapViewApp({showSearch, googleMapsApiKey}: MapViewAppProps ) {
    const { 
        startBuilding, 
        destinationBuilding, 
        setStartBuilding, 
        setDestinationBuilding 
    } = useDirections();

    const router = useRouter();

    const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch building polygons for the current campus
    const { polygons: buildingPolygons, loading: polygonsLoading } = useBuildingPolygons(selectedCampus);

    const buildings = selectedCampus === 'SGW' ? SGW_BUILDINGS : LOYOLA_BUILDINGS;
    const filteredBuildings = buildings.filter(
        (b) =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isStartSelected = !!selectedBuilding && startBuilding?.id === selectedBuilding.id;
    const isDestSelected = !!selectedBuilding && destinationBuilding?.id === selectedBuilding.id;

    const handleCampusChange = (campus: Campus) => {
        setSelectedCampus(campus);
        setSelectedBuilding(null);
    };

    const handleBuildingPress = (building: Building) => {
        setSelectedBuilding(building);
        
        // Selection logic for Directions
        if (!startBuilding) {
            setStartBuilding(building);
        } else if (building.id === startBuilding.id) {
            // Tapping start again clears it
            setStartBuilding(null);
        } else if (!destinationBuilding) {
            setDestinationBuilding(building);
        } else if (building.id === destinationBuilding.id) {
            // Tapping destination again clears it
            setDestinationBuilding(null);
        } else {
            // If both are set and we tap a new one, replace destination
            setDestinationBuilding(building);
        }
    };

    const getMarkerTitle = (building: Building) => {
        if (startBuilding?.id === building.id) return 'A';
        if (destinationBuilding?.id === building.id) return 'B';
        return building.code;
    };

    const getMarkerColor = (building: Building) => {
        if (startBuilding?.id === building.id) return '#10B981';
        if (destinationBuilding?.id === building.id) return '#FFEA00';
        return '#912338';
    };

    const getPolygonColors = (buildingId: string) => {
        const isStart = startBuilding?.id === buildingId;
        const isDest = destinationBuilding?.id === buildingId;
        return {
            fillColor: 'rgba(145, 35, 56, 0.3)', // Maroon with transparency
            strokeColor: isStart ? '#10B981' : isDest ? '#FFEA00' : '#912338',
            strokeWidth: isStart || isDest ? 3 : 2,
        };
    };

    const handleGetDirections = (building: Building) => {
        // Only set if not already set, or replace destination if we want to navigate to a new one
        if (!startBuilding) {
            setStartBuilding(building);
        } else if (building.id !== startBuilding.id) {
            setDestinationBuilding(building);
        }
        router.push('/(tabs)/two');
    };

    return (
        <View style={styles.container}>
            {showSearch && (
                    <BuildingSearchHeader value={searchQuery} onChangeText={setSearchQuery} />
            )}
            <View style={styles.campusToggleContainer}>
                <View style={styles.campusToggle}>
                    <TouchableOpacity
                        onPress={() => handleCampusChange('SGW')}
                        style={[
                            styles.campusButton,
                            selectedCampus === 'SGW' && styles.campusButtonActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.campusButtonText,
                                selectedCampus === 'SGW' && styles.campusButtonTextActive,
                            ]}
                        >
                            SGW Campus
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleCampusChange('Loyola')}
                        style={[
                            styles.campusButton,
                            selectedCampus === 'Loyola' && styles.campusButtonActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.campusButtonText,
                                selectedCampus === 'Loyola' && styles.campusButtonTextActive,
                            ]}
                        >
                            Loyola Campus
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={CAMPUS_REGIONS[selectedCampus]}
                showsUserLocation={true}
                showsMyLocationButton={true}
                customMapStyle={CAMPUS_MAP_STYLE}
            >
                {/* Render Building Polygons */}
                {buildingPolygons.map((polygon) => {
                    const colors = getPolygonColors(polygon.buildingId);
                    const building = buildings.find(b => b.id === polygon.buildingId);
                    return (
                        <Polygon
                            key={`polygon-${polygon.buildingId}`}
                            coordinates={polygon.coordinates}
                            fillColor={colors.fillColor}
                            strokeColor={colors.strokeColor}
                            strokeWidth={colors.strokeWidth}
                            tappable={true}
                            onPress={() => building && handleBuildingPress(building)}
                        />
                    );
                })}

                {/* Existing Markers */}
                {filteredBuildings.map((building) => (
                    <Marker
                        key={building.id}
                        coordinate={{ latitude: building.lat, longitude: building.lng }}
                        title={getMarkerTitle(building)}
                        description={building.name + "\n" + building.address}
                        onPress={() => handleBuildingPress(building)}
                        pinColor={getMarkerColor(building)}
                    />
                ))}
            </MapView>

            {selectedBuilding && (
            <BuildingInformation
                building={selectedBuilding}
                onGetDirections={handleGetDirections}
                onClose={() => setSelectedBuilding(null)}/>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        zIndex: 10,
    },
    searchInputWrapper: {
        position: 'relative',
    },
    searchIcon: {
        position: 'absolute',
        left: 12,
        top: 10,
        zIndex: 1,
    },
    searchInput: {
        paddingLeft: 40,
        paddingRight: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        fontSize: 16,
    },
    campusToggleContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        zIndex: 10,
    },
    campusToggle: {
        flexDirection: 'row',
        gap: 8,
    },
    campusButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    campusButtonActive: {
        backgroundColor: '#912338',
    },
    campusButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    campusButtonTextActive: {
        color: '#FFFFFF',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
        backgroundColor: '#E5E7EB',
    },
    mapBackground: {
        flex: 1,
        backgroundColor: '#D1D5DB',
    },
    gridContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.3,
    },
    gridLineHorizontal: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#9CA3AF',
    },
    gridLineVertical: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: '#9CA3AF',
    },
    campusLabel: {
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: [{ translateX: -100 }],
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        width: 200,
        alignItems: 'center',
    },
    campusLabelTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    campusLabelSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    markerContainer: {
        position: 'absolute',
        transform: [{ translateX: -20 }, { translateY: -20 }],
        zIndex: 10,
        alignItems: 'center',
    },
    markerWrapper: {
        alignItems: 'center',
    },
    statusBadge: {
        position: 'absolute',
        top: -18,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 30,
    },
    startBadge: {
        backgroundColor: '#10B981',
    },
    destBadge: {
        backgroundColor: '#912338',
    },
    statusBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: 'bold',
    },
    marker: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#B52D45',
        borderWidth: 3,
        borderColor: '#912338',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    markerSelected: {
        width: 44,
        height: 44,
        backgroundColor: '#912338',
        borderColor: '#6D1A2A',
        zIndex: 20,
    },
    markerCurrent: {
        backgroundColor: '#3B82F6',
        borderColor: '#60A5FA',
    },
    markerStart: {
        borderColor: '#10B981',
        borderWidth: 4,
    },
    markerDest: {
        borderColor: '#912338',
        borderWidth: 4,
    },
    markerText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    currentLocationLabel: {
        marginTop: 4,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    currentLocationText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2563EB',
    },
    locateButton: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 30,
    },
    map: {
        flex: 1,
    },
});
