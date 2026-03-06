import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { NodeType, GraphNode } from "@/app/services/indoorGraphService";
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

const ROOM_STYLE_START = { fill: "rgba(22, 163, 74, 0.4)", stroke: "#16A34A", width: 3 };
const ROOM_STYLE_DESTINATION = { fill: "rgba(37, 99, 235, 0.4)", stroke: "#2563EB", width: 3 };
const ROOM_STYLE_HIGHLIGHTED = { fill: "rgba(37, 99, 235, 0.4)", stroke: "#2563EB", width: 3 };
const ROOM_STYLE_DEFAULT = { fill: "rgba(145, 35, 56, 0.15)", stroke: "#912338", width: 1 };

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
    currentPath,
    pathError,
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

  // Hide Polyline during floor transitions to prevent react-native-maps Android crash
  // (same key Polyline remounted too rapidly causes native layer crash)
  const [pathReady, setPathReady] = useState(true);
  const pathReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only show room labels when zoomed in close enough
  const LABEL_ZOOM_THRESHOLD = 0.003;
  const [showLabels, setShowLabels] = useState(!!selectedBuilding);

  const handleRegionChange = useCallback(
    (region: { latitudeDelta: number; longitudeDelta: number }) => {
      setShowLabels(region.latitudeDelta < LABEL_ZOOM_THRESHOLD);
    },
    [],
  );

  // Clean up floor-transition timer on unmount
  useEffect(() => {
    return () => {
      if (pathReadyTimer.current) clearTimeout(pathReadyTimer.current);
    };
  }, []);

  // When a new path arrives, ensure pathReady is true so the Polyline renders
  useEffect(() => {
    if (currentPath) {
      setPathReady(true);
    }
  }, [currentPath]);

  // Animate map to building when selected, then show labels after animation settles.
  // We set showLabels explicitly here because onRegionChangeComplete is unreliable
  // on Android after programmatic animateToRegion calls.
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
      // Show labels once the animation is done (500ms) + small buffer
      const labelTimer = setTimeout(() => setShowLabels(true), 650);
      return () => clearTimeout(labelTimer);
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

  const handleClearStartSearch = () => {
    setStartSearchQuery("");
    clearStartRoom();
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
    // Unmount Polyline first, let the native layer settle, then remount on new floor
    setPathReady(false);
    if (pathReadyTimer.current) clearTimeout(pathReadyTimer.current);
    setSelectedFloor(floor);
    pathReadyTimer.current = setTimeout(() => setPathReady(true), 150);
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
    const roomRef = feature.properties?.ref;
    if (roomRef && roomRef === startRoomRef) {
      return ROOM_STYLE_START;
    }
    if (roomRef && roomRef === destinationRoomRef) {
      return ROOM_STYLE_DESTINATION;
    }
    if (isHighlighted(feature)) {
      return ROOM_STYLE_HIGHLIGHTED;
    }
    return ROOM_STYLE_DEFAULT;
  };

  // Find the highlighted feature for the info bar
  const highlightedFeature = highlightedRoomRef
    ? polygonFeatures.find((f) => f.properties?.ref === highlightedRoomRef)
    : null;

  // Filter path nodes to the current floor for per-floor polyline rendering.
  // Prefer showing only corridor/staircase/elevator waypoints (keeps line in hallways).
  // Fall back to including Room nodes if fewer than 2 waypoints remain.
  const pathCoordinates = useMemo(() => {
    if (!currentPath || selectedFloor === null) return [];

    const onFloor = currentPath
      .filter((node) => node.floor === selectedFloor)
      .filter((c) => isFinite(c.lat) && isFinite(c.lng));

    // Exclude Room centroid nodes so the line stays in hallways.
    // Start/destination rooms are already highlighted by colored polygons.
    const filtered = onFloor.filter((n) => n.type !== NodeType.Room);
    const chosen = filtered.length >= 2 ? filtered : onFloor;

    return chosen.map((node) => ({ latitude: node.lat, longitude: node.lng }));
  }, [currentPath, selectedFloor]);

  // Staircase / elevator nodes on the current floor that lead to another floor.
  // These are rendered as labelled markers so the user can see exactly where
  // to take stairs/elevator and which floor they lead to.
  const transitionPoints = useMemo(() => {
    if (!currentPath || selectedFloor === null) return [] as {
      node: GraphNode; toFloor: number | null; direction: "up" | "down" | null;
    }[];
    return currentPath.flatMap((node, i) => {
      if (node.floor !== selectedFloor) return [];
      if (node.type !== NodeType.Staircase && node.type !== NodeType.Elevator) return [];
      if (!isFinite(node.lat) || !isFinite(node.lng)) return [];
      // Look at neighboring nodes to find which floor this transition leads to
      const prev = currentPath[i - 1];
      const next = currentPath[i + 1];
      const neighbor =
        next && next.floor !== selectedFloor ? next :
        prev && prev.floor !== selectedFloor ? prev :
        null;
      const toFloor = neighbor?.floor ?? null;
      const direction: "up" | "down" | null =
        toFloor !== null ? (toFloor > selectedFloor ? "up" : "down") : null;
      return [{ node, toFloor, direction }];
    });
  }, [currentPath, selectedFloor]);

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
            onSubmit={searchStartRoom}
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
            onSubmit={searchDestinationRoom}
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

      {/* Path error banner */}
      {pathError && (
        <View style={styles.pathErrorBanner} testID="path-error-banner">
          <Text style={styles.pathErrorText}>{pathError}</Text>
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
          {/* Shortest path polyline — filtered to current floor */}
          {startRoomRef && destinationRoomRef && pathCoordinates.length > 1 && pathReady && (
            <Polyline
              key={`path-floor-${selectedFloor ?? "none"}`}
              coordinates={pathCoordinates}
              strokeColor="#007AFF"
              strokeWidth={4}
              geodesic={false}
              testID="path-polyline"
            />
          )}

          {/* Staircase / elevator transition markers */}
          {transitionPoints.map(({ node, toFloor, direction }) => {
            const isElevator = node.type === NodeType.Elevator;
            const floorStr =
              toFloor === null ? "" :
              toFloor < 0 ? `B${Math.abs(toFloor)}` : `${toFloor}`;
            const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "";
            return (
              <Marker
                key={`transition-${node.id}`}
                coordinate={{ latitude: node.lat, longitude: node.lng }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View style={[
                  styles.transitionMarker,
                  isElevator ? styles.elevatorMarker : styles.staircaseMarker,
                ]}>
                  <Text style={styles.transitionIcon}>
                    {isElevator ? "EL" : "ST"}
                  </Text>
                  {floorStr !== "" && (
                    <Text style={styles.transitionFloor}>{arrow}{floorStr}</Text>
                  )}
                </View>
              </Marker>
            );
          })}

          {/* Room number labels — only when zoomed in */}
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
                tracksViewChanges={Platform.OS === "android"}
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
          {startRoomRef && destinationRoomRef && (() => {
            if (!currentPath) {
              return (
                <View style={styles.infoRow}>
                  <View style={[styles.infoDot, { backgroundColor: "#9CA3AF" }]} />
                  <Text style={styles.infoLabel} testID="path-status">Computing route…</Text>
                </View>
              );
            }
            const floors = [...new Set(currentPath.map((n) => n.floor))].sort((a, b) => a - b);
            const isMultiFloor = floors.length > 1;
            return (
              <>
                <View style={styles.infoRow}>
                  <View style={[styles.infoDot, { backgroundColor: "#007AFF" }]} />
                  <Text style={styles.infoLabel} testID="path-status">
                    {`Route: ${currentPath.length} steps`}
                    {isMultiFloor && ` · floors ${floors.map((f) => f < 0 ? `B${Math.abs(f)}` : f).join("→")}`}
                  </Text>
                </View>
                {isMultiFloor && pathCoordinates.length === 0 && (
                  <Text style={[styles.infoLabel, { marginTop: 2, color: "#F59E0B" }]}>
                    Switch floor to see this segment
                  </Text>
                )}
              </>
            );
          })()}
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
  pathErrorBanner: {
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pathErrorText: {
    fontSize: 13,
    color: "#DC2626",
    textAlign: "center",
  },
  transitionMarker: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    minWidth: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  staircaseMarker: {
    backgroundColor: "#F59E0B",   // amber — stairs
    borderColor: "#B45309",
  },
  elevatorMarker: {
    backgroundColor: "#7C3AED",   // purple — elevator
    borderColor: "#5B21B6",
  },
  transitionIcon: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  transitionFloor: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 1,
  },
});
