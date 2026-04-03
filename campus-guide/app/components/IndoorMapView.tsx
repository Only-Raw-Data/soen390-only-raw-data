import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { NodeType, GraphNode } from "@app/services/indoorGraphService";
import { CAMPUS_MAP_STYLE } from "@/constants/mapStyle";
import { MAP_CONSTANTS } from "@/constants/map";
import RoomSearchBar from "./RoomSearchBar";
import {
  useIndoorMap,
  INDOOR_BUILDINGS,
  getGeoJsonForBuilding,
  getFeaturesForFloor,
  getRoomSuggestions,
} from "@app/context/IndoorMapContext";
import useUserLocation from "@app/hooks/useUserLocation";
import { IndoorFeature } from "@app/types/indoorMap";
import { IndoorStep, NavigationStep} from "@app/types/navigation";
import { planCrossBuildingRoute } from "@app/services/crossBuildingRouteService";
import StoryOutdoorMap from "./StoryOutdoorMap";
import { formatFloorLabel } from "@app/utils/timeFormat";
import {
  shouldLogIndoorMapDebug,
  hasNoCoordinates,
  getPolygonCentroid,
  shortLabel,
  convertCoordinates,
  getPointCoordinate,
  logIndoorMapRender,
  handleMapReady,
  ROOM_STYLE_START,
  ROOM_STYLE_DESTINATION,
  ROOM_STYLE_HIGHLIGHTED,
  ROOM_STYLE_DEFAULT,
  ELEVATOR_LABEL,
  STAIRCASE_LABEL,
  AMENITY_CONFIG,
} from "@app/utils/indoorMapUtils";
import { useIndoorUsabilityTasks } from "@hooks/useIndoorUsabilityTasks";

type Direction = "up" | "down" | null;

function FacilityPolygon({
  feature,
  fillColor,
  strokeColor,
  label,
  markerStyle,
  onPress,
  labelStyle,
}: {
  readonly feature: IndoorFeature;
  readonly fillColor: string;
  readonly strokeColor: string;
  readonly label: string;
  readonly markerStyle: object;
  readonly onPress?: () => void;
  readonly labelStyle?: object;
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


function CrossBuildingBanner({
  storyError,
  storyLoading,
  onStartStoryMode,
}: {
  readonly storyError: string | null;
  readonly storyLoading: boolean;
  readonly onStartStoryMode: () => void;
}) {
  return (
    <View style={styles.crossBuildingBanner} testID="cross-building-banner">
      <Text style={styles.crossBuildingText}>
        These rooms are in different buildings.
      </Text>
      {storyError && (
        <Text style={styles.crossBuildingError}>{storyError}</Text>
      )}
      <TouchableOpacity
        style={styles.crossBuildingButton}
        onPress={onStartStoryMode}
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
  );
}

function StoryModeSection({
  storySteps,
  storyIndex,
  setStoryIndex,
  onExit,
}: {
  readonly storySteps: NavigationStep[];
  readonly storyIndex: number;
  readonly setStoryIndex: React.Dispatch<React.SetStateAction<number>>;
  readonly onExit: () => void;
}) {
  const currentStep = storySteps[storyIndex];
  const isFirst = storyIndex === 0;
  const isLast = storyIndex === storySteps.length - 1;
  const stepLabel = currentStep.kind === "indoor"
    ? `Indoor — ${(currentStep).buildingName}`
    : "Outdoor — Walking";

  return (
    <View style={styles.storyContainer} testID="story-mode-container">
      <View style={styles.storyHeader}>
        <Text style={styles.storyHeaderText} testID="story-step-indicator">
          Step {storyIndex + 1} of {storySteps.length}
          {" · "}
          {stepLabel}
        </Text>
        <View style={styles.storyDots}>
          {storySteps.map((step, i) => (
            <View
              key={`dot-${step.kind}-${step.startLabel}-${step.endLabel}`}
              style={[
                styles.storyDot,
                i === storyIndex && styles.storyDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.storyLabelBar}>
        <Text style={styles.storyLabel} testID="story-step-label">
          {currentStep.startLabel} → {currentStep.endLabel}
        </Text>
      </View>

      <View style={styles.storyMapContainer}>
        {currentStep.kind === "outdoor" ? (
          <StoryOutdoorMap
            route={(currentStep).route}
            startLabel={currentStep.startLabel}
            endLabel={currentStep.endLabel}
          />
        ) : (
          <StoryIndoorMap
            step={currentStep}
          />
        )}
      </View>

      <View style={styles.storyNavBar}>
        <TouchableOpacity
          style={[styles.storyNavButton, isFirst && styles.storyNavButtonDisabled]}
          onPress={() => setStoryIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          testID="story-prev-button"
        >
          <Text style={[styles.storyNavButtonText, isFirst && styles.storyNavButtonTextDisabled]}>
            ← Previous
          </Text>
        </TouchableOpacity>
        <Text style={styles.storyNavStep}>
          {storyIndex + 1} / {storySteps.length}
        </Text>
        <TouchableOpacity
          style={[styles.storyNavButton, isLast && styles.storyNavButtonDisabled]}
          onPress={() => setStoryIndex((i) => Math.min(storySteps.length - 1, i + 1))}
          disabled={isLast}
          testID="story-next-button"
        >
          <Text style={[styles.storyNavButtonText, isLast && styles.storyNavButtonTextDisabled]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.storyExitButton}
        onPress={onExit}
        testID="story-exit-button"
      >
        <Text style={styles.storyExitText}>Exit Story Mode</Text>
      </TouchableOpacity>
    </View>
  );
}

function TransitionMarkerItem({
  node,
  toFloor,
  direction,
}: {
  readonly node: GraphNode;
  readonly toFloor: number | null;
  readonly direction: Direction;
}) {
  const isElevator = node.type === NodeType.Elevator;
  const floorStr = formatFloorLabel(toFloor);
  let arrow = "";

  if (direction === "up") {
    arrow = "▲";
  } else if (direction === "down") {
    arrow = "▼";
    }

  return (
    <Marker
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
}

function RoomLabelsOverlay({
  polygonFeatures,
  selectedBuildingCode,
  selectedFloor,
  isHighlighted,
}: {
  readonly polygonFeatures: IndoorFeature[];
  readonly selectedBuildingCode: string | null;
  readonly selectedFloor: number | null;
  readonly isHighlighted: (feature: IndoorFeature) => boolean;
}) {
  const labelFeatures = polygonFeatures.filter((f) => !!f.properties?.ref);
  if (shouldLogIndoorMapDebug()) {
    console.log("[IndoorMapView] LABELS", {
      polygonFeaturesCount: polygonFeatures.length,
      labelFeaturesCount: labelFeatures.length,
      selectedBuilding: selectedBuildingCode,
      selectedFloor,
      sampleRefs: labelFeatures.slice(0, 5).map((f) => f.properties?.ref),
    });
  }
  return (
    <>
      {labelFeatures.map((feature, index) => {
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
                {shortLabel(feature.properties?.ref ?? "")}
              </Text>
            </View>
          </Marker>
        );
      })}
    </>
  );
}

function AmenityPointMarker({
  feature,
  index,
  onPress,
}: {
  readonly feature: IndoorFeature;
  readonly index: number;
  readonly onPress: () => void;
}) {
  const amenity = feature.properties?.amenity ?? "";
  const config = AMENITY_CONFIG[amenity];
  if (!config) return null;
  const coord = getPointCoordinate(feature);
  if (!coord) return null;
  return (
    <Marker
      coordinate={coord}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={Platform.OS === "android"}
      onPress={onPress}
      testID={`amenity-point-${amenity}-${index}`}
    >
      <View style={styles.facilityMarker}>
        <View style={[styles.amenityMarkerCircle, { backgroundColor: config.bgColor }]}>
          <Text style={styles.amenityMarkerText}>{config.label}</Text>
        </View>
      </View>
    </Marker>
  );
}

function RouteInfo({
  currentPath,
  accessible,
  pathCoordinates,
}: {
  readonly currentPath: GraphNode[] | null;
  readonly accessible: boolean;
  readonly pathCoordinates: { latitude: number; longitude: number }[];
}) {
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
  const floorLabels = floors.map((f) => formatFloorLabel(f)).join("→");
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
}

function HighlightedRoomInfo({
  highlightedFeature,
  selectedFloor,
}: {
  readonly highlightedFeature: IndoorFeature;
  readonly selectedFloor: number | null;
}) {
  const floorDisplay = selectedFloor !== null && selectedFloor < 0
    ? `B${Math.abs(selectedFloor)}`
    : selectedFloor;
  return (
    <>
      <Text style={styles.infoTitle}>{highlightedFeature.properties?.ref}</Text>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Floor: </Text>
        <Text style={styles.infoValue}>{floorDisplay}</Text>
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
  );
}

function BottomInfoSection({
  selectedPOI,
  onDismissPOI,
  startRoomRef,
  destinationRoomRef,
  highlightedFeature,
  currentPath,
  accessible,
  pathCoordinates,
  selectedFloor,
  useCurrentLocation,
}: {
  readonly selectedPOI: { amenity: string; ref?: string; name?: string } | null;
  readonly onDismissPOI: () => void;
  readonly startRoomRef: string | null;
  readonly destinationRoomRef: string | null;
  readonly highlightedFeature: IndoorFeature | null | undefined;
  readonly currentPath: GraphNode[] | null;
  readonly accessible: boolean;
  readonly pathCoordinates: { latitude: number; longitude: number }[];
  readonly selectedFloor: number | null;
  readonly useCurrentLocation: boolean;
}) {
  const hasStart = startRoomRef || useCurrentLocation;

  if (selectedPOI) {
    return (
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
          onPress={onDismissPOI}
          style={styles.poiDismiss}
          testID="poi-dismiss"
        >
          <Text style={styles.poiDismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasStart && !destinationRoomRef && !highlightedFeature) {
    return null;
  }

  return (
    <View style={styles.infoBar}>
      {hasStart && (
        <View style={styles.infoRow}>
          <View style={[styles.infoDot, styles.infoDotStart]} />
          <Text style={styles.infoLabel}>From: </Text>
          <Text style={styles.infoValue} testID="start-room-label">
            {useCurrentLocation ? "Your Location" : startRoomRef}
          </Text>
        </View>
      )}
      {destinationRoomRef && (
        <View style={[styles.infoRow, hasStart ? { marginTop: 4 } : undefined]}>
          <View style={[styles.infoDot, styles.infoDotDestination]} />
          <Text style={styles.infoLabel}>To: </Text>
          <Text style={styles.infoValue} testID="destination-room-label">{destinationRoomRef}</Text>
        </View>
      )}
      {hasStart && destinationRoomRef && (
        <RouteInfo
          currentPath={currentPath}
          accessible={accessible}
          pathCoordinates={pathCoordinates}
        />
      )}
      {highlightedFeature && !hasStart && !destinationRoomRef && (
        <HighlightedRoomInfo
          highlightedFeature={highlightedFeature}
          selectedFloor={selectedFloor}
        />
      )}
    </View>
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
    useCurrentLocation,
    currentLocationError,
    setStartFromCurrentLocation,
    clearCurrentLocationStart,
  } = useIndoorMap();

  const { getCurrentLocation, location, isLoading: locationLoading } = useUserLocation();

  useIndoorUsabilityTasks();

  const posthog = usePostHog();

  // Story mode state
  const [storySteps, setStorySteps] = useState<NavigationStep[] | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  const startSuggestions = useMemo(
    () => (startRoomRef || useCurrentLocation ? [] : getRoomSuggestions(startSearchQuery)),
    [startSearchQuery, startRoomRef, useCurrentLocation],
  );

  const destinationSuggestions = useMemo(
    () => (destinationRoomRef ? [] : getRoomSuggestions(destinationSearchQuery)),
    [destinationSearchQuery, destinationRoomRef],
  );

  const handleSelectStartSuggestion = (room: string) => {
    clearCurrentLocationStart();
    setStartSearchQuery(room);
    searchStartRoom(room);
  };

  const handleSelectDestinationSuggestion = (room: string) => {
    setDestinationSearchQuery(room);
    searchDestinationRoom(room);
  };

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

  // Animate map to building when selected or floor changes.
  // On iOS with Google Maps, Markers with custom views don't render their bitmaps
  // until the map is invalidated. A short animateToRegion forces the redraw.
  useEffect(() => {
    if (selectedBuilding && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedBuilding.centerLat,
          longitude: selectedBuilding.centerLng,
          latitudeDelta: MAP_CONSTANTS.INDOOR_BUILDING_DELTA,
          longitudeDelta: MAP_CONSTANTS.INDOOR_BUILDING_DELTA,
        },
        MAP_CONSTANTS.INDOOR_ANIMATION_MS,
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
  }, [polygonFeatures.length]);

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

  const handleClearCurrentLocation = () => {
    clearCurrentLocationStart();
  };

  const handleClearDestinationSearch = () => {
    setDestinationSearchQuery("");
    clearDestinationRoom();
  };

  const [locationRequested, setLocationRequested] = useState(false);

  const handleUseMyLocation = useCallback(async () => {
    // Clear any manually entered start room
    setStartSearchQuery("");
    clearStartRoom();
    setLocationRequested(true);
    await getCurrentLocation();
  }, [getCurrentLocation, setStartSearchQuery, clearStartRoom]);

  // When location updates after user requested it, set it in context
  useEffect(() => {
    if (locationRequested && location && selectedBuilding && selectedFloor !== null) {
      setStartFromCurrentLocation(
        location.coords.latitude,
        location.coords.longitude,
        selectedFloor,
      );
    }
  }, [locationRequested, location, selectedBuilding, selectedFloor, setStartFromCurrentLocation]);

  const handleStartRoomSubmit = useCallback((query: string) => {
    clearCurrentLocationStart();
    setLocationRequested(false);
    searchStartRoom(query);
  }, [clearCurrentLocationStart, searchStartRoom]);

  const handleStartRoomChange = useCallback((text: string) => {
    setStartSearchQuery(text);
  }, [setStartSearchQuery]);

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
    posthog.capture('indoor_building_selected', {
      building_code: building.code,
      building_name: building.name,
      campus: building.campus,
    });
    clearHighlight();
    setSelectedPOI(null);
    setSelectedBuilding(building);
    setSelectedFloor(building.floors[0]);
  };

  const handleFloorSelect = (floor: number) => {
    posthog.capture('indoor_floor_changed', {
      building_code: selectedBuilding?.code ?? '',
      floor,
    });
    clearHighlight();
    setSelectedPOI(null);
    setFloorTransitioning(true);
    if (floorTimer.current) clearTimeout(floorTimer.current);
    setSelectedFloor(floor);
    floorTimer.current = setTimeout(() => setFloorTransitioning(false), 150);
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
      latitudeDelta: MAP_CONSTANTS.INDOOR_BUILDING_DELTA,
      longitudeDelta: MAP_CONSTANTS.INDOOR_BUILDING_DELTA,
    }
    : {
      latitude: 45.497092,
      longitude: -73.5788,
      latitudeDelta: MAP_CONSTANTS.DEFAULT_CAMERA_DELTA,
      longitudeDelta: MAP_CONSTANTS.DEFAULT_CAMERA_DELTA,
    };

  logIndoorMapRender({
    floorTransitioning,
    pathCoordinatesLength: pathCoordinates.length,
    selectedFloor,
    willRenderPolyline: !!(!floorTransitioning && pathCoordinates.length > 1),
  });

  return (
    <View style={styles.container}>
      {/* Start: Current Location or Room Search */}
      <View style={styles.searchRow}>
        <View style={[styles.searchDot, styles.searchDotStart]} />
        {useCurrentLocation ? (
          <View style={styles.currentLocationRow}>
            <View style={[styles.currentLocationButton, styles.currentLocationButtonActive]}>
              {locationLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
              )}
              <Text style={[styles.currentLocationText, styles.currentLocationTextActive]}>
                Your Location
              </Text>
              <TouchableOpacity
                onPress={handleClearCurrentLocation}
                style={styles.currentLocationClear}
                testID="clear-current-location"
              >
                <Ionicons name="close-circle" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {currentLocationError && (
              <Text style={styles.currentLocationError}>{currentLocationError}</Text>
            )}
          </View>
        ) : (
          <View style={styles.searchBarFlex}>
            <RoomSearchBar
              value={startSearchQuery}
              onChangeText={handleStartRoomChange}
              onSubmit={handleStartRoomSubmit}
              onClear={handleClearStartSearch}
              error={startSearchError}
              placeholder="Start room (e.g., H-820)"
              testIDPrefix="room-search-start"
              suggestions={startSuggestions}
              onSelectSuggestion={handleSelectStartSuggestion}
            />
          </View>
        )}
      </View>
      {/* Use My Location Button */}
      {!useCurrentLocation && (
        <View style={styles.locationButtonRow}>
          <TouchableOpacity
            style={styles.useMyLocationButton}
            onPress={handleUseMyLocation}
            testID="use-my-location-button"
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#912338" />
            ) : (
              <Ionicons name="navigate" size={16} color="#912338" />
            )}
            <Text style={styles.useMyLocationText}>Use My Location</Text>
          </TouchableOpacity>
        </View>
      )}
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
            suggestions={destinationSuggestions}
            onSelectSuggestion={handleSelectDestinationSuggestion}
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
                    {formatFloorLabel(floor)}
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
        <CrossBuildingBanner
          storyError={storyError}
          storyLoading={storyLoading}
          onStartStoryMode={handleStartStoryMode}
        />
      )}

      {/* Story Mode UI */}
      {storySteps && (
        <StoryModeSection
          storySteps={storySteps}
          storyIndex={storyIndex}
          setStoryIndex={setStoryIndex}
          onExit={handleExitStoryMode}
        />
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
          onMapReady={handleMapReady}
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
          {elevatorFeatures.map((feature) => (
            <React.Fragment key={`elevator-${(feature.geometry.coordinates as number[][][])[0]?.[0]?.[0]}-${(feature.geometry.coordinates as number[][][])[0]?.[0]?.[1]}`}>
              <FacilityPolygon
                feature={feature}
                fillColor="#7C3AED"
                strokeColor="#7C3AED"
                label={ELEVATOR_LABEL}
                markerStyle={styles.facilityMarkerElevator}

              />
            </React.Fragment>
          ))}

          {/* Staircase polygons — always visible */}
          {staircaseFeatures.map((feature) => (
            <React.Fragment key={`staircase-${(feature.geometry.coordinates as number[][][])[0]?.[0]?.[0]}-${(feature.geometry.coordinates as number[][][])[0]?.[0]?.[1]}`}>
              <FacilityPolygon
                feature={feature}
                fillColor="rgba(245, 158, 11, 0.35)"
                strokeColor="#F59E0B"
                label={STAIRCASE_LABEL}
                markerStyle={styles.facilityMarkerStaircase}

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
          {amenityPointFeatures.map((feature, index) => (
            <AmenityPointMarker
              key={`amenity-point-${feature.properties?.amenity ?? ""}-${index}`}
              feature={feature}
              index={index}
              onPress={() => setSelectedPOI({
                amenity: feature.properties?.amenity ?? "",
                ref: feature.properties?.ref,
                name: feature.properties?.name,
              })}
            />
          ))}

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
          {transitionPoints.map(({ node, toFloor, direction }) => (
            <TransitionMarkerItem
              key={`transition-${node.id}`}
              node={node}
              toFloor={toFloor}
              direction={direction}
            />
          ))}

          {/* Room number labels */}
          <RoomLabelsOverlay
            polygonFeatures={polygonFeatures}
            selectedBuildingCode={selectedBuilding?.code ?? null}
            selectedFloor={selectedFloor}
            isHighlighted={isHighlighted}
          />
        </MapView>
      </View>}

      {!storySteps && (
        <BottomInfoSection
          selectedPOI={selectedPOI}
          onDismissPOI={() => setSelectedPOI(null)}
          startRoomRef={startRoomRef}
          destinationRoomRef={destinationRoomRef}
          highlightedFeature={highlightedFeature}
          currentPath={currentPath}
          accessible={accessible}
          pathCoordinates={pathCoordinates}
          selectedFloor={selectedFloor}
          useCurrentLocation={useCurrentLocation}
        />
      )}
    </View>
  );
}

/** Renders an indoor map for a story mode step, showing path on the first floor segment. */
function StoryIndoorMap({ step }: { readonly step: IndoorStep }) {
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
            key={`story-poly-${feature.properties?.ref ?? "anon"}-${index}`}
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
  currentLocationRow: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  currentLocationButtonActive: {
    backgroundColor: "#912338",
  },
  currentLocationText: {
    fontSize: 16,
    color: "#912338",
    fontWeight: "500",
    flex: 1,
  },
  currentLocationTextActive: {
    color: "#FFFFFF",
  },
  currentLocationClear: {
    padding: 4,
  },
  currentLocationError: {
    color: "#DC2626",
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  locationButtonRow: {
    flexDirection: "row",
    paddingHorizontal: 40,
    paddingBottom: 4,
    backgroundColor: "#FFFFFF",
  },
  useMyLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#912338",
  },
  useMyLocationText: {
    fontSize: 13,
    color: "#912338",
    fontWeight: "600",
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
