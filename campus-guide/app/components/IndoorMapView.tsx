import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from "react-native-maps";
import { CAMPUS_MAP_STYLE } from "@/constants/mapStyle";
import RoomSearchBar from "./RoomSearchBar";
import {
  useIndoorMap,
  INDOOR_BUILDINGS,
  getGeoJsonForBuilding,
  getFeaturesForFloor,
} from "@/app/context/IndoorMapContext";
import { IndoorFeature } from "../types/indoorMap";

function getPolygonCentroid(coords: { latitude: number; longitude: number }[]) {
  let latSum = 0;
  let lngSum = 0;
  for (const c of coords) {
    latSum += c.latitude;
    lngSum += c.longitude;
  }
  return {
    latitude: latSum / coords.length,
    longitude: lngSum / coords.length,
  };
}

// Strip the building prefix to show just the room number, e.g. "H851.02" → "851.02"
function shortLabel(roomRef: string): string {
  return roomRef.replace(/^[A-Z]+S?/i, "");
}

export default function IndoorMapView() {
  const {
    selectedBuilding,
    selectedFloor,
    searchQuery,
    highlightedRoomRef,
    searchError,
    startRoomRef,
    destinationRoomRef,
    startSearchQuery,
    destinationSearchQuery,
    startSearchError,
    destinationSearchError,
    setSelectedBuilding,
    setSelectedFloor,
    setSearchQuery,
    searchRoom,
    clearHighlight,
    setStartSearchQuery,
    setDestinationSearchQuery,
    searchStartRoom,
    searchDestinationRoom,
    clearStartRoom,
    clearDestinationRoom,
  } = useIndoorMap();

  const mapRef = useRef<MapView>(null);

  // Only show room labels when zoomed in close enough
  const LABEL_ZOOM_THRESHOLD = 0.003;
  const [showLabels, setShowLabels] = useState(!!selectedBuilding);

  const handleRegionChange = useCallback(
    (region: { latitudeDelta: number; longitudeDelta: number }) => {
      setShowLabels(region.latitudeDelta < LABEL_ZOOM_THRESHOLD);
    },
    [],
  );

  // Animate map to building when selected
  useEffect(() => {
    if (selectedBuilding && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedBuilding.centerLat,
          longitude: selectedBuilding.centerLng,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        },
        500,
      );
    }
  }, [selectedBuilding]);

  // Get floor features for current building + floor
  const floorFeatures = useMemo(() => {
    if (!selectedBuilding || selectedFloor === null) return [];
    const geoJson = getGeoJsonForBuilding(selectedBuilding);
    if (!geoJson) return [];
    return getFeaturesForFloor(geoJson, selectedFloor);
  }, [selectedBuilding, selectedFloor]);

  // Filter to only polygon features (rooms/areas)
  const polygonFeatures = useMemo(() => {
    return floorFeatures.filter(
      (f) => f.geometry.type === "Polygon" && f.properties?.indoor,
    );
  }, [floorFeatures]);

  const handleSearchSubmit = () => {
    searchRoom(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    clearHighlight();
  };

  const handleStartSearchSubmit = () => {
    searchStartRoom(startSearchQuery);
  };

  const handleClearStartSearch = () => {
    setStartSearchQuery("");
    clearStartRoom();
  };

  const handleDestinationSearchSubmit = () => {
    searchDestinationRoom(destinationSearchQuery);
  };

  const handleClearDestinationSearch = () => {
    setDestinationSearchQuery("");
    clearDestinationRoom();
  };

  const handleBuildingSelect = (building: typeof INDOOR_BUILDINGS[0]) => {
    clearHighlight();
    setSelectedBuilding(building);
    setSelectedFloor(building.floors[0]);
  };

  const handleFloorSelect = (floor: number) => {
    clearHighlight();
    setSelectedFloor(floor);
  };

  const convertCoordinates = (feature: IndoorFeature) => {
    if (feature.geometry.type !== "Polygon") return [];
    const coords = feature.geometry.coordinates as number[][][];
    return coords[0].map((coord) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));
  };

  const isHighlighted = (feature: IndoorFeature) => {
    return (
      highlightedRoomRef !== null &&
      feature.properties?.ref === highlightedRoomRef
    );
  };

  const getRoomStyle = (feature: IndoorFeature) => {
    const ref = feature.properties?.ref;
    if (ref && ref === startRoomRef) {
      return { fill: "rgba(22, 163, 74, 0.4)", stroke: "#16A34A", width: 3 };
    }
    if (ref && ref === destinationRoomRef) {
      return { fill: "rgba(37, 99, 235, 0.4)", stroke: "#2563EB", width: 3 };
    }
    if (isHighlighted(feature)) {
      return { fill: "rgba(37, 99, 235, 0.4)", stroke: "#2563EB", width: 3 };
    }
    return { fill: "rgba(145, 35, 56, 0.15)", stroke: "#912338", width: 1 };
  };

  // Find the highlighted feature for the info bar
  const highlightedFeature = highlightedRoomRef
    ? polygonFeatures.find((f) => f.properties?.ref === highlightedRoomRef)
    : null;

  const initialRegion = selectedBuilding
    ? {
        latitude: selectedBuilding.centerLat,
        longitude: selectedBuilding.centerLng,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      }
    : {
        latitude: 45.497092,
        longitude: -73.5788,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

  return (
    <View style={styles.container}>
      {/* Start Room Search Bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchDot, styles.searchDotStart]} />
        <View style={styles.searchBarFlex}>
          <RoomSearchBar
            value={startSearchQuery}
            onChangeText={setStartSearchQuery}
            onSubmit={handleStartSearchSubmit}
            onClear={handleClearStartSearch}
            error={startSearchError}
            placeholder="Start room (e.g., H-820)"
            testIDPrefix="room-search-start"
          />
        </View>
      </View>
      {/* Destination Room Search Bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchDot, styles.searchDotDestination]} />
        <View style={styles.searchBarFlex}>
          <RoomSearchBar
            value={destinationSearchQuery}
            onChangeText={setDestinationSearchQuery}
            onSubmit={handleDestinationSearchSubmit}
            onClear={handleClearDestinationSearch}
            error={destinationSearchError}
            placeholder="Destination room (e.g., H-820)"
            testIDPrefix="room-search-destination"
          />
        </View>
      </View>

      {/* Building Selector */}
      <View style={styles.buildingSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.buildingScroll}
        >
          {INDOOR_BUILDINGS.map((building) => {
            const isActive = selectedBuilding?.code === building.code;
            return (
              <TouchableOpacity
                key={building.code}
                style={[
                  styles.buildingPill,
                  isActive && styles.buildingPillActive,
                ]}
                onPress={() => handleBuildingSelect(building)}
                testID={`building-pill-${building.code}`}
              >
                <Text
                  style={[
                    styles.buildingPillText,
                    isActive && styles.buildingPillTextActive,
                  ]}
                >
                  {building.code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Floor Selector */}
      {selectedBuilding && (
        <View style={styles.floorSelectorContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.floorScroll}
          >
            {selectedBuilding.floors.map((floor) => {
              const isActive = selectedFloor === floor;
              return (
                <TouchableOpacity
                  key={floor}
                  style={[
                    styles.floorButton,
                    isActive && styles.floorButtonActive,
                  ]}
                  onPress={() => handleFloorSelect(floor)}
                  testID={`floor-button-${floor}`}
                >
                  <Text
                    style={[
                      styles.floorButtonText,
                      isActive && styles.floorButtonTextActive,
                    ]}
                  >
                    {floor < 0 ? `B${Math.abs(floor)}` : floor}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          customMapStyle={CAMPUS_MAP_STYLE}
          initialRegion={initialRegion}
          testID="indoor-map"
          onRegionChangeComplete={handleRegionChange}
        >
          {polygonFeatures.map((feature, index) => {
            const coords = convertCoordinates(feature);
            if (coords.length === 0) return null;
            const roomStyle = getRoomStyle(feature);
            return (
              <Polygon
                key={`${feature.properties?.ref ?? "poly"}-${index}`}
                coordinates={coords}
                fillColor={roomStyle.fill}
                strokeColor={roomStyle.stroke}
                strokeWidth={roomStyle.width}
                tappable
              />
            );
          })}
          {/* Room number labels — only visible when zoomed in */}
          {showLabels && polygonFeatures.map((feature, index) => {
            if (!feature.properties?.ref) return null;
            const coords = convertCoordinates(feature);
            if (coords.length === 0) return null;
            const centroid = getPolygonCentroid(coords);
            const highlighted = isHighlighted(feature);
            return (
              <Marker
                key={`label-${feature.properties.ref}-${index}`}
                coordinate={centroid}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View style={styles.roomLabelContainer}>
                  <Text
                    style={[
                      styles.roomLabelText,
                      highlighted && styles.roomLabelTextHighlighted,
                    ]}
                    numberOfLines={1}
                  >
                    {shortLabel(feature.properties.ref)}
                  </Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
      </View>

      {/* Room Info Bar */}
      {(startRoomRef || destinationRoomRef || highlightedFeature) && (
        <View style={styles.infoBar}>
          {startRoomRef && (
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, styles.infoDotStart]} />
              <Text style={styles.infoLabel}>From: </Text>
              <Text style={styles.infoValue} testID="start-room-label">{startRoomRef}</Text>
            </View>
          )}
          {destinationRoomRef && (
            <View style={[styles.infoRow, startRoomRef ? { marginTop: 4 } : undefined]}>
              <View style={[styles.infoDot, styles.infoDotDestination]} />
              <Text style={styles.infoLabel}>To: </Text>
              <Text style={styles.infoValue} testID="destination-room-label">{destinationRoomRef}</Text>
            </View>
          )}
          {highlightedFeature && !startRoomRef && !destinationRoomRef && (
            <>
              <Text style={styles.infoTitle}>{highlightedFeature.properties?.ref}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Floor: </Text>
                <Text style={styles.infoValue}>
                  {selectedFloor !== null && selectedFloor < 0
                    ? `B${Math.abs(selectedFloor)}`
                    : selectedFloor}
                </Text>
                {highlightedFeature.properties?.indoor && (
                  <>
                    <Text style={[styles.infoLabel, { marginLeft: 16 }]}>
                      Type:{" "}
                    </Text>
                    <Text style={styles.infoValue}>
                      {highlightedFeature.properties.indoor}
                    </Text>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 12,
    flexShrink: 0,
  },
  searchDotStart: {
    backgroundColor: "#16A34A",
  },
  searchDotDestination: {
    backgroundColor: "#2563EB",
  },
  searchBarFlex: {
    flex: 1,
  },
  buildingSelectorContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  buildingScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  buildingPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  buildingPillActive: {
    backgroundColor: "#912338",
  },
  buildingPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  buildingPillTextActive: {
    color: "#FFFFFF",
  },
  floorSelectorContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  floorScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  floorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  floorButtonActive: {
    backgroundColor: "#912338",
  },
  floorButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  floorButtonTextActive: {
    color: "#FFFFFF",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  roomLabelContainer: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  roomLabelText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#912338",
    textAlign: "center",
  },
  roomLabelTextHighlighted: {
    color: "#2563EB",
    fontSize: 10,
  },
  infoBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  infoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  infoDotStart: {
    backgroundColor: "#16A34A",
  },
  infoDotDestination: {
    backgroundColor: "#2563EB",
  },
});
