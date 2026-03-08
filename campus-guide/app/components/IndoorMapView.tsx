import React, { useRef, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
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
import { NavigationStep } from "../types/navigation";
import { planCrossBuildingRoute } from "../services/crossBuildingRouteService";
import StoryOutdoorMap from "./StoryOutdoorMap";

const BUILDING_LAT_DELTA = 0.002;
const BUILDING_LNG_DELTA = 0.002;
const DEFAULT_LAT_DELTA = 0.005;
const DEFAULT_LNG_DELTA = 0.005;

export function hasNoCoordinates(coords: { latitude: number; longitude: number }[]) {
  return coords.length === 0;
}

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
const ELEVATOR_LABEL = "EL";
const STAIRCASE_LABEL = "ST";

export const AMENITY_CONFIG: Record<string, {
  label: string;
  displayName: string;
  fillColor: string;
  strokeColor: string;
  bgColor: string;
}> = {
  toilets: { label: "\u{1F6BB}", displayName: "Washroom", fillColor: "#3B82F659", strokeColor: "#3B82F6", bgColor: "#3B82F6" },
  fountain: { label: "\u{1F4A7}", displayName: "Water Fountain", fillColor: "#06B6D459", strokeColor: "#06B6D4", bgColor: "#06B6D4" },
  vending_machine: { label: "VM", displayName: "Vending Machine", fillColor: "#A855F759", strokeColor: "#A855F7", bgColor: "#A855F7" },
  eating_area: { label: "\u{1F37D}\uFE0F", displayName: "Eating Area", fillColor: "#F9731659", strokeColor: "#F97316", bgColor: "#F97316" },
  information: { label: "\u2139\uFE0F", displayName: "Information", fillColor: "#14B8A659", strokeColor: "#14B8A6", bgColor: "#14B8A6" },
  printer: { label: "\u{1F5A8}\uFE0F", displayName: "Printer", fillColor: "#6B728059", strokeColor: "#6B7280", bgColor: "#6B7280" },
  fire_station: { label: "\u{1F9EF}", displayName: "Fire Station", fillColor: "#EF444459", strokeColor: "#EF4444", bgColor: "#EF4444" },
};

function getPointCoordinate(feature: IndoorFeature): { latitude: number; longitude: number } | null {
  if (feature.geometry.type !== "Point") return null;
  const coords = feature.geometry.coordinates as number[];
  if (coords.length < 2) return null;
  return { latitude: coords[1], longitude: coords[0] };
}

function FacilityPolygon({
  feature,
  fillColor,
  strokeColor,
  label,
  markerStyle,
  convertCoordinates,
  onPress,
  labelStyle,
}: {
  feature: IndoorFeature;
  fillColor: string;
  strokeColor: string;
  label: string;
  markerStyle: object;
  convertCoordinates: (f: IndoorFeature) => { latitude: number; longitude: number }[];
  onPress?: () => void;
  labelStyle?: object;
}) {
  const coords = convertCoordinates(feature);
  if (hasNoCoordinates(coords)) return null;
  const centroid = getPolygonCentroid(coords);
  return (
    <>
      <Polygon
        coordinates={coords}
        fillColor={fillColor}
        strokeColor={strokeColor}
        strokeWidth={2}
      />
      <Marker
        coordinate={centroid}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={Platform.OS === "android"}
        onPress={onPress}
      >
        <View style={styles.facilityMarker}>
          <View style={markerStyle}>
            <Text style={labelStyle ?? styles.facilityMarkerText}>{label}</Text>
          </View>
        </View>
      </Marker>
    </>
  );
}

export default function IndoorMapView() {
  const {
    selectedBuilding,
    selectedFloor,
    highlightedRoomRef,
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
    clearHighlight,
    setStartSearchQuery,
    setDestinationSearchQuery,
    searchStartRoom,
    searchDestinationRoom,
    clearStartRoom,
    clearDestinationRoom,
    accessible,
    toggleAccessible,
    showPOIs,
    togglePOIs,
    isCrossBuilding,
  } = useIndoorMap();

  // Story mode state
  const [storySteps, setStorySteps] = useState<NavigationStep[] | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const [selectedPOI, setSelectedPOI] = useState<{
    amenity: string;
    ref?: string;
    name?: string;
  } | null>(null);

  // Brief debounce when floors change to prevent react-native-maps Android crash
  // from rapid Polyline unmount/remount on the native layer.
  const [floorTransitioning, setFloorTransitioning] = useState(false);
  const floorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On iOS, Google Maps SDK doesn't render Marker custom-view bitmaps until the
  // map is re-laid out. Toggle mapPadding after features change to force it.
  const [iosMapPadding, setIosMapPadding] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const iosPaddingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (floorTimer.current) clearTimeout(floorTimer.current);
      if (iosPaddingTimer.current) clearTimeout(iosPaddingTimer.current);
    };
  }, []);

  // Force iOS Google Maps to render Marker bitmaps by toggling map padding
  // after polygon features change (building/floor selection).
  useEffect(() => {
    if (Platform.OS === "ios" && polygonFeatures.length > 0) {
      setIosMapPadding({ top: 0, right: 0, bottom: 1, left: 0 });
      if (iosPaddingTimer.current) clearTimeout(iosPaddingTimer.current);
      iosPaddingTimer.current = setTimeout(() => {
        setIosMapPadding({ top: 0, right: 0, bottom: 0, left: 0 });
      }, 300);
    }
  }, [polygonFeatures]);

  // Animate map to building when selected or floor changes.
  // On iOS with Google Maps, Markers with custom views don't render their bitmaps
  // until the map is invalidated. A short animateToRegion forces the redraw.
  useEffect(() => {
    if (selectedBuilding && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedBuilding.centerLat,
          longitude: selectedBuilding.centerLng,
          latitudeDelta: BUILDING_LAT_DELTA,
          longitudeDelta: BUILDING_LNG_DELTA,
        },
        500,
      );
    }
  }, [selectedBuilding, selectedFloor]);

  // Get floor features for current building + floor
  const floorFeatures = useMemo(() => {
    if (!selectedBuilding || selectedFloor === null) return [];
    const geoJson = getGeoJsonForBuilding(selectedBuilding);
    if (!geoJson) return [];
    return getFeaturesForFloor(geoJson, selectedFloor);
  }, [selectedBuilding, selectedFloor]);

  // Filter to only polygon features (rooms/areas), excluding amenity POIs when shown separately
  const polygonFeatures = useMemo(() => {
    return floorFeatures.filter(
      (f) =>
        f.geometry.type === "Polygon" &&
        f.properties?.indoor &&
        !(showPOIs && f.properties?.amenity && f.properties.amenity in AMENITY_CONFIG),
    );
  }, [floorFeatures, showPOIs]);

  // Amenity polygon features (e.g. toilets, eating areas) — shown when POIs enabled
  const amenityPolygonFeatures = useMemo(() => {
    if (!showPOIs) return [];
    return floorFeatures.filter(
      (f) =>
        f.geometry.type === "Polygon" &&
        !!f.properties?.amenity &&
        f.properties.amenity in AMENITY_CONFIG,
    );
  }, [floorFeatures, showPOIs]);

  // Amenity point features (e.g. water fountains) — shown when POIs enabled
  const amenityPointFeatures = useMemo(() => {
    if (!showPOIs) return [];
    return floorFeatures.filter(
      (f) =>
        f.geometry.type === "Point" &&
        !!f.properties?.amenity &&
        f.properties.amenity in AMENITY_CONFIG,
    );
  }, [floorFeatures, showPOIs]);

  // Elevator and staircase polygon features on the current floor
  const elevatorFeatures = useMemo(() => {
    return floorFeatures.filter(
      (f) => f.geometry.type === "Polygon" && f.properties?.highway === "elevator",
    );
  }, [floorFeatures]);

  const staircaseFeatures = useMemo(() => {
    return floorFeatures.filter(
      (f) => f.geometry.type === "Polygon" && !!f.properties?.stairs,
    );
  }, [floorFeatures]);

  const handleClearStartSearch = () => {
    setStartSearchQuery("");
    clearStartRoom();
  };

  const handleClearDestinationSearch = () => {
    setDestinationSearchQuery("");
    clearDestinationRoom();
  };

  const handleStartStoryMode = async () => {
    setStoryLoading(true);
    setStoryError(null);
    try {
      const steps = await planCrossBuildingRoute(
        startSearchQuery,
        destinationSearchQuery,
        accessible,
      );
      if (steps && steps.length > 0) {
        setStorySteps(steps);
        setStoryIndex(0);
      } else {
        setStoryError("Could not compute cross-building route");
      }
    } catch {
      setStoryError("Error computing cross-building route");
    } finally {
      setStoryLoading(false);
    }
  };

  const handleExitStoryMode = () => {
    setStorySteps(null);
    setStoryIndex(0);
    setStoryError(null);
  };

  const handleBuildingSelect = (building: typeof INDOOR_BUILDINGS[0]) => {
    clearHighlight();
    setSelectedPOI(null);
    setSelectedBuilding(building);
    setSelectedFloor(building.floors[0]);
  };

  const handleFloorSelect = (floor: number) => {
    clearHighlight();
    setSelectedPOI(null);
    // Debounce Polyline during floor switch to prevent Android native crash
    setFloorTransitioning(true);
    if (floorTimer.current) clearTimeout(floorTimer.current);
    setSelectedFloor(floor);
    floorTimer.current = setTimeout(() => setFloorTransitioning(false), 150);
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
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));

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
      if (!Number.isFinite(node.lat) || !Number.isFinite(node.lng)) return [];
      // Look at neighboring nodes to find which floor this transition leads to
      const prev = currentPath[i - 1];
      const next = currentPath[i + 1];
      let neighbor: GraphNode | null = null;
      if (next && next.floor !== selectedFloor) {
        neighbor = next;
      } else if (prev && prev.floor !== selectedFloor) {
        neighbor = prev;
      }
      const toFloor = neighbor?.floor ?? null;
      let direction: "up" | "down" | null = null;
      if (toFloor !== null) {
        direction = toFloor > selectedFloor ? "up" : "down";
      }
      return [{ node, toFloor, direction }];
    });
  }, [currentPath, selectedFloor]);

  const initialRegion = selectedBuilding
    ? {
      latitude: selectedBuilding.centerLat,
      longitude: selectedBuilding.centerLng,
      latitudeDelta: BUILDING_LAT_DELTA,
      longitudeDelta: BUILDING_LNG_DELTA,
    }
    : {
      latitude: 45.497092,
      longitude: -73.5788,
      latitudeDelta: DEFAULT_LAT_DELTA,
      longitudeDelta: DEFAULT_LNG_DELTA,
    };

  console.log("[IndoorMapView] RENDER", {
    floorTransitioning,
    pathCoordinatesLength: pathCoordinates.length,
    selectedFloor,
    willRenderPolyline: !!(!floorTransitioning && pathCoordinates.length > 1),
  });

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

      {/* Accessibility Toggle */}
      <TouchableOpacity
        style={[styles.accessibleToggle, accessible && styles.accessibleToggleActive]}
        onPress={toggleAccessible}
        testID="accessible-toggle"
        accessibilityRole="switch"
        accessibilityState={{ checked: accessible }}
        accessibilityLabel="Accessible route"
      >
        <Text style={styles.accessibleIcon}>♿</Text>
        <Text style={[styles.accessibleLabel, accessible && styles.accessibleLabelActive]}>
          Accessible Route
        </Text>
        <View style={[styles.accessibleIndicator, accessible && styles.accessibleIndicatorActive]}>
          <Text style={styles.accessibleIndicatorText}>{accessible ? "ON" : "OFF"}</Text>
        </View>
      </TouchableOpacity>

      {/* Indoor POIs Toggle */}
      <TouchableOpacity
        style={[styles.poiToggle, showPOIs && styles.poiToggleActive]}
        onPress={togglePOIs}
        testID="poi-toggle"
        accessibilityRole="switch"
        accessibilityState={{ checked: showPOIs }}
        accessibilityLabel="Indoor Points of Interest"
      >
        <Text style={styles.poiIcon}>{"\u{1F4CD}"}</Text>
        <Text style={[styles.poiLabel, showPOIs && styles.poiLabelActive]}>
          Indoor POIs
        </Text>
        <View style={[styles.poiIndicator, showPOIs && styles.poiIndicatorActive]}>
          <Text style={styles.poiIndicatorText}>{showPOIs ? "ON" : "OFF"}</Text>
        </View>
      </TouchableOpacity>

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
      {pathError && !isCrossBuilding && (
        <View style={styles.pathErrorBanner} testID="path-error-banner">
          <Text style={styles.pathErrorText}>{pathError}</Text>
        </View>
      )}

      {/* Cross-building banner */}
      {isCrossBuilding && !storySteps && (
        <View style={styles.crossBuildingBanner} testID="cross-building-banner">
          <Text style={styles.crossBuildingText}>
            These rooms are in different buildings.
          </Text>
          {storyError && (
            <Text style={styles.crossBuildingError}>{storyError}</Text>
          )}
          <TouchableOpacity
            style={styles.crossBuildingButton}
            onPress={handleStartStoryMode}
            disabled={storyLoading}
            testID="cross-building-directions-button"
          >
            {storyLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" testID="story-loading" />
            ) : (
              <Text style={styles.crossBuildingButtonText}>
                Get Step-by-Step Directions
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Story Mode UI */}
      {storySteps && (
        <View style={styles.storyContainer} testID="story-mode-container">
          {/* Step indicator bar */}
          <View style={styles.storyHeader}>
            <Text style={styles.storyHeaderText} testID="story-step-indicator">
              Step {storyIndex + 1} of {storySteps.length}
              {" · "}
              {storySteps[storyIndex].kind === "indoor"
                ? `Indoor — ${(storySteps[storyIndex] as import("../types/navigation").IndoorStep).buildingName}`
                : "Outdoor — Walking"}
            </Text>
            <View style={styles.storyDots}>
              {storySteps.map((_, i) => (
                <View
                  key={`dot-${i}`}
                  style={[
                    styles.storyDot,
                    i === storyIndex && styles.storyDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Step label */}
          <View style={styles.storyLabelBar}>
            <Text style={styles.storyLabel} testID="story-step-label">
              {storySteps[storyIndex].startLabel} → {storySteps[storyIndex].endLabel}
            </Text>
          </View>

          {/* Step content */}
          <View style={styles.storyMapContainer}>
            {storySteps[storyIndex].kind === "outdoor" ? (
              <StoryOutdoorMap
                route={(storySteps[storyIndex] as import("../types/navigation").OutdoorStep).route}
                startLabel={storySteps[storyIndex].startLabel}
                endLabel={storySteps[storyIndex].endLabel}
              />
            ) : (
              <StoryIndoorMap
                step={storySteps[storyIndex] as import("../types/navigation").IndoorStep}
              />
            )}
          </View>

          {/* Navigation bar */}
          <View style={styles.storyNavBar}>
            <TouchableOpacity
              style={[styles.storyNavButton, storyIndex === 0 && styles.storyNavButtonDisabled]}
              onPress={() => setStoryIndex((i) => Math.max(0, i - 1))}
              disabled={storyIndex === 0}
              testID="story-prev-button"
            >
              <Text style={[styles.storyNavButtonText, storyIndex === 0 && styles.storyNavButtonTextDisabled]}>
                ← Previous
              </Text>
            </TouchableOpacity>
            <Text style={styles.storyNavStep}>
              {storyIndex + 1} / {storySteps.length}
            </Text>
            <TouchableOpacity
              style={[styles.storyNavButton, storyIndex === storySteps.length - 1 && styles.storyNavButtonDisabled]}
              onPress={() => setStoryIndex((i) => Math.min(storySteps.length - 1, i + 1))}
              disabled={storyIndex === storySteps.length - 1}
              testID="story-next-button"
            >
              <Text style={[styles.storyNavButtonText, storyIndex === storySteps.length - 1 && styles.storyNavButtonTextDisabled]}>
                Next →
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.storyExitButton}
            onPress={handleExitStoryMode}
            testID="story-exit-button"
          >
            <Text style={styles.storyExitText}>Exit Story Mode</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map (hidden when story mode active) */}
      {!storySteps && <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          customMapStyle={CAMPUS_MAP_STYLE}
          initialRegion={initialRegion}
          testID="indoor-map"
          onMapReady={() => console.log("[IndoorMapView] MAP READY")}
          mapPadding={iosMapPadding}
        >
          {polygonFeatures.map((feature, index) => {
            const coords = convertCoordinates(feature);
            if (hasNoCoordinates(coords)) return null;
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
          {/* Elevator polygons — always visible */}
          {elevatorFeatures.map((feature, index) => (
            <React.Fragment key={`elevator-${index}`}>
              <FacilityPolygon
                feature={feature}
                fillColor="#7C3AED"
                strokeColor="#7C3AED"
                label={ELEVATOR_LABEL}
                markerStyle={styles.facilityMarkerElevator}
                convertCoordinates={convertCoordinates}
              />
            </React.Fragment>
          ))}

          {/* Staircase polygons — always visible */}
          {staircaseFeatures.map((feature, index) => (
            <React.Fragment key={`staircase-${index}`}>
              <FacilityPolygon
                feature={feature}
                fillColor="rgba(245, 158, 11, 0.35)"
                strokeColor="#F59E0B"
                label={STAIRCASE_LABEL}
                markerStyle={styles.facilityMarkerStaircase}
                convertCoordinates={convertCoordinates}
              />
            </React.Fragment>
          ))}

          {/* Amenity polygon POIs (e.g. washrooms) */}
          {amenityPolygonFeatures.map((feature, index) => {
            const amenity = feature.properties?.amenity ?? "";
            const config = AMENITY_CONFIG[amenity];
            if (!config) return null;
            return (
              <React.Fragment key={`amenity-poly-${amenity}-${index}`}>
                <FacilityPolygon
                  feature={feature}
                  fillColor={config.fillColor}
                  strokeColor={config.strokeColor}
                  label={config.label}
                  markerStyle={[styles.amenityMarkerCircle, { backgroundColor: config.bgColor }]}
                  convertCoordinates={convertCoordinates}
                  labelStyle={styles.amenityMarkerText}
                  onPress={() => setSelectedPOI({
                    amenity,
                    ref: feature.properties?.ref,
                    name: feature.properties?.name,
                  })}
                />
              </React.Fragment>
            );
          })}

          {/* Amenity point POIs (e.g. water fountains) */}
          {amenityPointFeatures.map((feature, index) => {
            const amenity = feature.properties?.amenity ?? "";
            const config = AMENITY_CONFIG[amenity];
            if (!config) return null;
            const coord = getPointCoordinate(feature);
            if (!coord) return null;
            return (
              <Marker
                key={`amenity-point-${amenity}-${index}`}
                coordinate={coord}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={Platform.OS === "android"}
                onPress={() => setSelectedPOI({
                  amenity,
                  ref: feature.properties?.ref,
                  name: feature.properties?.name,
                })}
                testID={`amenity-point-${amenity}-${index}`}
              >
                <View style={styles.facilityMarker}>
                  <View style={[styles.amenityMarkerCircle, { backgroundColor: config.bgColor }]}>
                    <Text style={styles.amenityMarkerText}>{config.label}</Text>
                  </View>
                </View>
              </Marker>
            );
          })}

          {/* Shortest path polyline — filtered to current floor.
              Uses a stable key so React updates coordinates in place (prop change)
              rather than unmounting/remounting the native overlay, which crashes
              Google Maps SDK on iOS. */}
          {!floorTransitioning && pathCoordinates.length > 1 && (
              <Polyline
                  key="indoor-path"
                  testID="path-polyline"
                  coordinates={pathCoordinates}
                  strokeColor={accessible ? "#16A34A" : "#007AFF"}
                  strokeWidth={4}
                  zIndex={1000}
              />
          )}

          {/* Staircase / elevator transition markers */}
          {transitionPoints.map(({ node, toFloor, direction }) => {
            const isElevator = node.type === NodeType.Elevator;
            let floorStr = "";
            if (toFloor !== null) {
              floorStr = toFloor < 0 ? `B${Math.abs(toFloor)}` : `${toFloor}`;
            }
            let arrow = "";
            if (direction === "up") {
              arrow = "▲";
            } else if (direction === "down") {
              arrow = "▼";
            }
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
                    {isElevator ? ELEVATOR_LABEL : STAIRCASE_LABEL}
                  </Text>
                  {floorStr !== "" && (
                    <Text style={styles.transitionFloor}>{arrow}{floorStr}</Text>
                  )}
                </View>
              </Marker>
            );
          })}

          {/* Room number labels */}
          {(() => {
            const labelFeatures = polygonFeatures.filter((f) => !!f.properties?.ref);
            console.log("[IndoorMapView] LABELS", {
              polygonFeaturesCount: polygonFeatures.length,
              labelFeaturesCount: labelFeatures.length,
              selectedBuilding: selectedBuilding?.code ?? null,
              selectedFloor,
              sampleRefs: labelFeatures.slice(0, 5).map((f) => f.properties?.ref),
            });
            return labelFeatures.map((feature, index) => {
              const coords = convertCoordinates(feature);
              if (hasNoCoordinates(coords)) return null;
              const centroid = getPolygonCentroid(coords);
              const highlighted = isHighlighted(feature);
              return (
                <Marker
                  key={`label-${feature.properties?.ref}-${index}`}
                  coordinate={centroid}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges
                >
                  <View style={styles.roomLabelContainer}>
                    <Text
                      style={[
                        styles.roomLabelText,
                        highlighted && styles.roomLabelTextHighlighted,
                      ]}
                      numberOfLines={1}
                    >
                      {shortLabel(feature.properties!.ref!)}
                    </Text>
                  </View>
                </Marker>
              );
            });
          })()}
        </MapView>
      </View>}

      {!storySteps && <>
      {/* POI Info Bar */}
      {selectedPOI && (
        <View style={styles.infoBar} testID="poi-info-bar">
          <View style={styles.infoRow}>
            <Text style={styles.amenityMarkerText}>
              {AMENITY_CONFIG[selectedPOI.amenity]?.label}
            </Text>
            <Text style={styles.infoTitle}>
              {" "}{AMENITY_CONFIG[selectedPOI.amenity]?.displayName ?? selectedPOI.amenity}
            </Text>
          </View>
          {selectedPOI.ref && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Room: </Text>
              <Text style={styles.infoValue} testID="poi-ref">{selectedPOI.ref}</Text>
            </View>
          )}
          {selectedPOI.name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name: </Text>
              <Text style={styles.infoValue}>{selectedPOI.name}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setSelectedPOI(null)}
            style={styles.poiDismiss}
            testID="poi-dismiss"
          >
            <Text style={styles.poiDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Room Info Bar */}
      {!selectedPOI && (startRoomRef || destinationRoomRef || highlightedFeature) && (
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
            const floorLabels = floors.map((f) => (f < 0 ? `B${Math.abs(f)}` : String(f))).join("→");
            return (
              <>
                <View style={styles.infoRow}>
                  <View style={[styles.infoDot, { backgroundColor: accessible ? "#16A34A" : "#007AFF" }]} />
                  <Text style={styles.infoLabel} testID="path-status">
                    {accessible ? "♿ " : ""}{`Route: ${currentPath.length} steps`}
                    {isMultiFloor && ` · floors ${floorLabels}`}
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
      </>}
    </View>
  );
}

/** Renders an indoor map for a story mode step, showing path on the first floor segment. */
function StoryIndoorMap({ step }: { step: import("../types/navigation").IndoorStep }) {
  const building = INDOOR_BUILDINGS.find((b) => b.code === step.buildingCode);
  if (!building) return null;

  const geoJson = getGeoJsonForBuilding(building);
  if (!geoJson) return null;

  // Determine which floor to show (first floor in the path)
  const floor = step.path.length > 0 ? step.path[0].floor : building.floors[0];
  const floorFeatures = getFeaturesForFloor(geoJson, floor);
  const polygonFeatures = floorFeatures.filter(
    (f) => f.geometry.type === "Polygon" && f.properties?.indoor,
  );

  const convertCoordinates = (feature: IndoorFeature) => {
    if (feature.geometry.type !== "Polygon") return [];
    const coords = feature.geometry.coordinates as number[][][];
    return coords[0].map((coord) => ({
      latitude: coord[1],
      longitude: coord[0],
    }));
  };

  const pathCoords = step.path
    .filter((n) => n.floor === floor && Number.isFinite(n.lat) && Number.isFinite(n.lng))
    .filter((n) => n.type !== NodeType.Room)
    .map((n) => ({ latitude: n.lat, longitude: n.lng }));

  // Fall back to including room nodes if too few waypoints
  const finalPathCoords = pathCoords.length >= 2
    ? pathCoords
    : step.path
        .filter((n) => n.floor === floor && Number.isFinite(n.lat) && Number.isFinite(n.lng))
        .map((n) => ({ latitude: n.lat, longitude: n.lng }));

  return (
    <MapView
      style={{ flex: 1 }}
      provider={PROVIDER_GOOGLE}
      customMapStyle={CAMPUS_MAP_STYLE}
      initialRegion={{
        latitude: building.centerLat,
        longitude: building.centerLng,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      }}
      testID="story-indoor-map"
    >
      {polygonFeatures.map((feature, index) => {
        const coords = convertCoordinates(feature);
        if (coords.length === 0) return null;
        return (
          <Polygon
            key={`story-poly-${index}`}
            coordinates={coords}
            fillColor="rgba(145, 35, 56, 0.15)"
            strokeColor="#912338"
            strokeWidth={1}
          />
        );
      })}
      {finalPathCoords.length > 1 && (
        <Polyline
          coordinates={finalPathCoords}
          strokeColor="#007AFF"
          strokeWidth={4}
          testID="story-indoor-polyline"
        />
      )}
    </MapView>
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
  accessibleToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  accessibleToggleActive: {
    backgroundColor: "#ECFDF5",
  },
  accessibleIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  accessibleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  accessibleLabelActive: {
    color: "#16A34A",
  },
  accessibleIndicator: {
    backgroundColor: "#9CA3AF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  accessibleIndicatorActive: {
    backgroundColor: "#16A34A",
  },
  accessibleIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  facilityMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  facilityMarkerElevator: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  facilityMarkerStaircase: {
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  facilityMarkerText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  amenityMarkerCircle: {
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  amenityMarkerText: {
    fontSize: 14,
  },
  poiToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  poiToggleActive: {
    backgroundColor: "#EFF6FF",
  },
  poiIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  poiLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  poiLabelActive: {
    color: "#3B82F6",
  },
  poiIndicator: {
    backgroundColor: "#9CA3AF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  poiIndicatorActive: {
    backgroundColor: "#3B82F6",
  },
  poiIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  poiDismiss: {
    marginTop: 8,
    alignSelf: "flex-end",
  },
  poiDismissText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },
  crossBuildingBanner: {
    backgroundColor: "#FFFBEB",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  crossBuildingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 8,
  },
  crossBuildingError: {
    fontSize: 13,
    color: "#DC2626",
    marginBottom: 8,
  },
  crossBuildingButton: {
    backgroundColor: "#912338",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 200,
    alignItems: "center",
  },
  crossBuildingButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  storyContainer: {
    flex: 1,
  },
  storyHeader: {
    backgroundColor: "#912338",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  storyHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  storyDots: {
    flexDirection: "row",
    marginTop: 6,
    gap: 6,
  },
  storyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  storyDotActive: {
    backgroundColor: "#FFFFFF",
  },
  storyLabelBar: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  storyLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  storyMapContainer: {
    flex: 1,
  },
  storyNavBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  storyNavButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#912338",
  },
  storyNavButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  storyNavButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  storyNavButtonTextDisabled: {
    color: "#9CA3AF",
  },
  storyNavStep: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  storyExitButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  storyExitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
});
