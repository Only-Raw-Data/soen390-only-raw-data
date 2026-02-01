import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

type Campus = 'SGW' | 'Loyola';

interface Building {
    id: string;
    name: string;
    code: string;
    lat: number;
    lng: number;
    campus: Campus;
    address: string;
}

const SGW_BUILDINGS: Building[] = [
    { id: 'h', name: 'Henry F. Hall Building', code: 'H', lat: 45.4972, lng: -73.5789, campus: 'SGW', address: '1455 De Maisonneuve Blvd W' },
    { id: 'mb', name: 'John Molson Building', code: 'MB', lat: 45.4952, lng: -73.5790, campus: 'SGW', address: '1450 Guy St' },
    { id: 'ev', name: 'Engineering Building', code: 'EV', lat: 45.4953, lng: -73.5779, campus: 'SGW', address: '1515 Ste-Catherine St W' },
    { id: 'lb', name: 'J.W. McConnell Building', code: 'LB', lat: 45.4967, lng: -73.5778, campus: 'SGW', address: '1400 De Maisonneuve Blvd W' },
    { id: 'va', name: 'Visual Arts Building', code: 'VA', lat: 45.4948, lng: -73.5777, campus: 'SGW', address: '1395 René-Lévesque Blvd W' },
    { id: 'gm', name: 'Guy-De Maisonneuve Building', code: 'GM', lat: 45.4967, lng: -73.5778, campus: 'SGW', address: '1550 De Maisonneuve Blvd W' },
];

const LOYOLA_BUILDINGS: Building[] = [
    { id: 'cc', name: 'Central Building', code: 'CC', lat: 45.4581, lng: -73.6402, campus: 'Loyola', address: '7141 Sherbrooke St W' },
    { id: 'sp', name: 'Richard J. Renaud Science Complex', code: 'SP', lat: 45.4576, lng: -73.6408, campus: 'Loyola', address: '7141 Sherbrooke St W' },
    { id: 'ad', name: 'Administration Building', code: 'AD', lat: 45.4585, lng: -73.6398, campus: 'Loyola', address: '7141 Sherbrooke St W' },
    { id: 'fc', name: 'F.C. Smith Building', code: 'FC', lat: 45.4578, lng: -73.6415, campus: 'Loyola', address: '7141 Sherbrooke St W' },
    { id: 'pc', name: 'Perform Centre', code: 'PC', lat: 45.4583, lng: -73.6410, campus: 'Loyola', address: '7200 Sherbrooke St W' },
];

// Campus center coordinates
const CAMPUS_REGIONS = {
    SGW: {
        latitude: 45.4963,
        longitude: -73.5783,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    },
    Loyola: {
        latitude: 45.4581,
        longitude: -73.6402,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    },
};

export function MapViewApp() {
    const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const buildings = selectedCampus === 'SGW' ? SGW_BUILDINGS : LOYOLA_BUILDINGS;
    const filteredBuildings = buildings.filter(
        (b) =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCampusChange = (campus: Campus) => {
        setSelectedCampus(campus);
        setSelectedBuilding(null);
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search buildings..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
            </View>

            {/* Campus Toggle */}
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

            {/* Google Map */}
            <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={CAMPUS_REGIONS[selectedCampus]}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {filteredBuildings.map((building) => (
                    <Marker
                        key={building.id}
                        coordinate={{
                            latitude: building.lat,
                            longitude: building.lng,
                        }}
                        title={building.code}
                        description={building.name}
                        onPress={() => setSelectedBuilding(building)}
                        pinColor="#912338"
                    />
                ))}
            </MapView>

            {/* Building Info Popup */}
            {selectedBuilding && (
                <View style={styles.buildingInfoContainer}>
                    <View style={styles.buildingInfo}>
                        <View style={styles.buildingInfoHeader}>
                            <View style={styles.buildingCodeBadge}>
                                <Text style={styles.buildingCodeText}>{selectedBuilding.code}</Text>
                            </View>
                            <View style={styles.buildingDetails}>
                                <Text style={styles.buildingName}>{selectedBuilding.name}</Text>
                                <Text style={styles.buildingCampus}>
                                    {selectedBuilding.campus} Campus
                                </Text>
                                <Text style={styles.buildingAddress}>{selectedBuilding.address}</Text>
                            </View>
                        </View>
                        <View style={styles.buildingActions}>
                            <TouchableOpacity style={styles.directionsButton}>
                                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                                <Text style={styles.directionsButtonText}>Get Directions</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => setSelectedBuilding(null)}
                        style={styles.closeButton}
                    >
                        <Ionicons name="close" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>
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
    map: {
        flex: 1,
    },
    buildingInfoContainer: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 40,
    },
    buildingInfo: {
        gap: 12,
    },
    buildingInfoHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    buildingCodeBadge: {
        backgroundColor: '#912338',
        borderRadius: 8,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: 60,
    },
    buildingCodeText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 20,
    },
    buildingDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    buildingName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    buildingCampus: {
        fontSize: 14,
        color: '#4B5563',
        marginTop: 4,
    },
    buildingAddress: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    buildingActions: {
        flexDirection: 'row',
        gap: 8,
    },
    directionsButton: {
        flex: 1,
        backgroundColor: '#912338',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    directionsButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
});