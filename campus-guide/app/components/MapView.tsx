import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import BuildingSearchHeader from "./BuildingSearchComponent";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import {
  Campus,
  Building,
  SGW_BUILDINGS,
  LOYOLA_BUILDINGS,
  CAMPUS_REGIONS,
} from "@/constants/buildings";
import { MAP_CONSTANTS } from "@/constants/map";
import { getPoiInfo } from "@/constants/poi";
import { useDirections } from "../context/DirectionsContext";
import { usePOIContext } from "../context/POIContext";
import MapView, {
  Callout,
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
  Polyline,
} from "react-native-maps";
import useBuildingPolygons from "../hooks/useBuildingPolygons";
import { CAMPUS_MAP_STYLE } from "@/constants/mapStyle";
import BuildingInformation from "./BuildingInformation";
import LocateMeButton from "./LocateMeButton";
import useUserLocation from "../hooks/useUserLocation";
import { isWithinShuttleHours } from "../utils/shuttleHours";
import { SegmentMode } from "@app/types/transportation";
import { PointOfInterest } from "../types/poi";
import { poiToBuildingAdapter } from "../utils/poiUtils";
import { useMapUsabilityTasks } from "@hooks/useMapUsabilityTasks";
import { useActionRepeatSignal } from "@hooks/useActionRepeatSignal";

function BuildingMarkerItem({
  building,
  isCurrentLocation,
  isStart,
  isDest,
  onPress,
}: {
  readonly building: Building;
  readonly isCurrentLocation: boolean;
  readonly isStart: boolean;
  readonly isDest: boolean;
  readonly onPress: () => void;
}) {
  const [trackChanges, setTrackChanges] = React.useState(true);

  React.useEffect(() => {
    // 500ms delay gives Android enough time to render custom view before capturing the map snapshot
    const timer = setTimeout(() => setTrackChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      key={building.id}
      testID={`building-marker-${building.id}`}
      coordinate={{ latitude: building.lat, longitude: building.lng }}
      title={`${building.code} - ${building.address}`}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={trackChanges}
    >
      <View
        style={[
          styles.labelMarker,
          isCurrentLocation && styles.labelMarkerCurrent,
          isStart && styles.labelMarkerStart,
          isDest && styles.labelMarkerDest,
        ]}
      >
        <Text
          style={[
            styles.labelMarkerText,
            isCurrentLocation && styles.labelMarkerTextCurrent,
            (isStart || isDest) && styles.labelMarkerTextAlt,
          ]}
          numberOfLines={1}
        >
          {building.code}
        </Text>
      </View>

      {isCurrentLocation && (
        <Callout tooltip>
          <View style={styles.youAreHereCallout}>
            <View style={styles.youAreHereDot} />
            <Text style={styles.youAreHereText}>You are here</Text>
          </View>
        </Callout>
      )}
    </Marker>
  );
}

function POIMarkerItem({
  poi,
  onPress,
}: {
  readonly poi: PointOfInterest;
  readonly onPress: () => void;
}) {
  const [trackChanges, setTrackChanges] = React.useState(true);
  const { icon: poiIcon, color: poiColor } = getPoiInfo(poi.type);

  React.useEffect(() => {
    // 500ms delay gives Android enough time to render icon font before capturing the map snapshot
    const timer = setTimeout(() => setTrackChanges(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: poi.lat, longitude: poi.lon }}
      title={poi.name}
      description={poi.type}
      tracksViewChanges={trackChanges}
      testID={`poi-marker-${poi.id}`}
      onPress={onPress}
    >
      <View style={[styles.poiMarkerContainer, { backgroundColor: poiColor }]}>
        <Ionicons name={poiIcon as any} size={14} color="#FFFFFF" />
      </View>
      <Callout tooltip>
        <View
          style={[
            styles.youAreHereCallout,
            { borderColor: poiColor, width: 140 },
          ]}
        >
          <Text
            style={[styles.youAreHereText, { color: poiColor }]}
            numberOfLines={1}
          >
            {poi.name}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: "#6B7280",
              textTransform: "capitalize",
            }}
            numberOfLines={1}
          >
            {poi.type.replace("_", " ")}
          </Text>
        </View>
      </Callout>
    </Marker>
  );
}

const SEGMENT_COLORS: Record<SegmentMode, string> = {
  WALK: "#3B82F6",
  BUS: "#16A34A",
  SUBWAY: "#F97316",
  TRAM: "#DC2626",
  RAIL: "#DC2626",
};

interface MapViewAppProps {
  readonly googleMapsApiKey?: string;
  readonly showSearch?: boolean;
  /** Usability tasks 1–2: only on the main Map tab */
  readonly enableUsabilityTaskTracking?: boolean;
}

export default function MapViewApp({
  showSearch,
  googleMapsApiKey,
  enableUsabilityTaskTracking = false,
}: MapViewAppProps) {
  const {
    startBuilding,
    destinationBuilding,
    startCoords,
    setStartBuilding,
    setDestinationBuilding,
    setStartCoords,
    clearDirections,
    route,
    transportationMode,
  } = useDirections();

  const posthog = usePostHog();
  const trackActionRepeat = useActionRepeatSignal();

  const isShuttleCrossCampus =
    transportationMode === "shuttle" &&
    startBuilding &&
    destinationBuilding &&
    startBuilding.campus !== destinationBuilding.campus;
  const showRoute = route && (!isShuttleCrossCampus || isWithinShuttleHours());

  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [selectedCampus, setSelectedCampus] = useState<Campus>("SGW");
  // Building pressed on the map - used for showing details and getting directions
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedBuildingId, setHighlightedBuildingId] = useState<
    string | null
  >(null);
  // State for building info modal
  const [infoBuilding, setInfoBuilding] = useState<Building | null>(null);

  // Fetch building polygons for the current campus
  const { polygons: buildingPolygons } = useBuildingPolygons(selectedCampus);

  // User location hook
  const {
    location: userLocation,
    isLoading: locationLoading,
    errorMsg: locationError,
    nearestBuilding,
    isOnCampus,
    currentCampus,
    getCurrentLocation,
  } = useUserLocation();

  // POI context (centralized state across tabs)
  const {
    showPOIs,
    setShowPOIs,
    pois,
    isLoading: poisLoading,
    selectedPOI,
    setSelectedPOI,
    updateSearchCenter,
  } = usePOIContext();

  const allBuildingsList = [...SGW_BUILDINGS, ...LOYOLA_BUILDINGS];

  useMapUsabilityTasks(enableUsabilityTaskTracking, selectedCampus, infoBuilding);

  const onBuildingSearchSubmit = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    posthog.capture("map_building_searched", { query: q });
  }, [searchQuery, posthog]);

  const handleCampusChange = (campus: Campus) => {
    trackActionRepeat("map_campus_toggle");
    posthog.capture('map_campus_switched', { campus });
    setSelectedCampus(campus);
    setSelectedBuilding(null);
    setSelectedPOI(null);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        CAMPUS_REGIONS[campus],
        MAP_CONSTANTS.ANIMATION_DURATION_MS,
      );
    }
  };

  const handleBuildingPress = (building: Building) => {
    posthog.capture('map_building_tapped', {
      building_code: building.code,
      building_name: building.name,
      campus: building.campus,
    });
    if (
      building.id !== selectedBuilding?.id &&
      building.campus !== selectedCampus
    ) {
      setSelectedCampus(building.campus);

      // Animate to the new campus to avoid disorientation
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: building.lat,
            longitude: building.lng,
            latitudeDelta: MAP_CONSTANTS.CAMPUS_CAMERA_DELTA,
            longitudeDelta: MAP_CONSTANTS.CAMPUS_CAMERA_DELTA,
          },
          MAP_CONSTANTS.ANIMATION_DURATION_MS,
        );
      }
    }

    setSelectedBuilding(building);
    setSelectedPOI(null);
    setInfoBuilding(null);
  };

  const getMarkerTitle = (building: Building) => {
    if (startBuilding?.id === building.id)
      return "START - " + building.code + " - " + building.address;
    if (destinationBuilding?.id === building.id)
      return "DESTINATION - " + building.code + " - " + building.address;
    return building.code + " - " + building.address;
  };

  const getStrokeColorForBuilding = (isStart: boolean, isDest: boolean) => {
    if (isStart) return "#10B981";
    if (isDest) return "#FFEA00";
    return "#912338";
  };

  const getPolygonColors = (buildingId: string) => {
    const isStart = startBuilding?.id === buildingId;
    const isDest = destinationBuilding?.id === buildingId;
    const isCurrentLocation = highlightedBuildingId === buildingId;

    if (isCurrentLocation) {
      return {
        fillColor: "#16A34A73",
        strokeColor: "#9123384D",
        strokeWidth: 5,
      };
    }

    return {
      fillColor: "rgba(145, 35, 56, 0.3)",
      strokeColor: getStrokeColorForBuilding(isStart, isDest),
      strokeWidth: isStart || isDest ? 3 : 2,
    };
  };

  // Handle campus switch when user is located
  const handleCampusDetected = (campus: Campus) => {
    if (campus !== selectedCampus) {
      setSelectedCampus(campus);
    }

    // Animate to user location if available
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
          latitudeDelta: MAP_CONSTANTS.DEFAULT_CAMERA_DELTA,
          longitudeDelta: MAP_CONSTANTS.DEFAULT_CAMERA_DELTA,
        },
        MAP_CONSTANTS.ANIMATION_DURATION_MS,
      );
    }
  };

  // Handle building highlight
  const handleBuildingHighlight = (buildingId: string | null) => {
    setHighlightedBuildingId(buildingId);
  };

  const handleGetDirections = (building: Building) => {
    // Only set if not already set, or replace destination if we want to navigate to a new one
    if (!startBuilding) {
      setStartBuilding(building);
    } else if (building.id !== startBuilding.id) {
      setDestinationBuilding(building);
    }

    setSelectedBuilding(null); // Close the bottom bar
    setInfoBuilding(null); // Close the detail popup
    router.push("/(tabs)/two");
  };

  const handleGetDirectionsForPOI = (poi: PointOfInterest) => {
    const adaptedBuilding = poiToBuildingAdapter(poi, selectedCampus);
    setDestinationBuilding(adaptedBuilding);

    // Automatically use the user's current location as the start point if no start is explicitly set
    if (!startBuilding && !startCoords && userLocation?.coords) {
      setStartCoords({
        lat: userLocation.coords.latitude,
        lng: userLocation.coords.longitude,
      });
    }

    setSelectedPOI(null);
    router.push("/(tabs)/two");
  };

  // Fit route in view when it changes (and when shuttle, only if within service hours)
  React.useEffect(() => {
    if (!showRoute) return;
    const coords = route?.coordinates;

    if ((coords?.length ?? 0) > 0 && mapRef.current?.fitToCoordinates) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: MAP_CONSTANTS.ROUTE_EDGE_PADDING,
        animated: true,
      });
    }
  }, [route, showRoute]);

  return (
    <View style={styles.container}>
      {showSearch && (
        <BuildingSearchHeader
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={onBuildingSearchSubmit}
        />
      )}
      <View style={styles.campusToggleContainer}>
        <View style={styles.campusToggle}>
          <TouchableOpacity
            onPress={() => handleCampusChange("SGW")}
            style={[
              styles.campusButton,
              selectedCampus === "SGW" && styles.campusButtonActive,
            ]}
          >
            <Text
              style={[
                styles.campusButtonText,
                selectedCampus === "SGW" && styles.campusButtonTextActive,
              ]}
            >
              SGW Campus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleCampusChange("Loyola")}
            style={[
              styles.campusButton,
              selectedCampus === "Loyola" && styles.campusButtonActive,
            ]}
          >
            <Text
              style={[
                styles.campusButtonText,
                selectedCampus === "Loyola" && styles.campusButtonTextActive,
              ]}
            >
              Loyola Campus
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={CAMPUS_REGIONS[selectedCampus]}
          showsUserLocation={true}
          showsMyLocationButton={false}
          customMapStyle={CAMPUS_MAP_STYLE}
          onRegionChangeComplete={(region) => {
            // Smart POI center update: debounced, only on meaningful movement
            // If POIs are enabled, auto-fetches new data instead of clearing toggle
            updateSearchCenter(region.latitude, region.longitude);

            // Only auto-switch if zoomed in enough to see buildings (guard against flip-flopping)
            if (region.latitudeDelta > MAP_CONSTANTS.AUTO_SWITCH_MAX_DELTA)
              return;

            // Auto-switch campus markers based on the map center
            const sgwCenter = CAMPUS_REGIONS.SGW;
            const loyolaCenter = CAMPUS_REGIONS.Loyola;

            const distToSGW = Math.sqrt(
              Math.pow(region.latitude - sgwCenter.latitude, 2) +
                Math.pow(region.longitude - sgwCenter.longitude, 2),
            );
            const distToLoyola = Math.sqrt(
              Math.pow(region.latitude - loyolaCenter.latitude, 2) +
                Math.pow(region.longitude - loyolaCenter.longitude, 2),
            );

            if (distToSGW < distToLoyola && selectedCampus !== "SGW") {
              setSelectedCampus("SGW");
            } else if (
              distToLoyola < distToSGW &&
              selectedCampus !== "Loyola"
            ) {
              setSelectedCampus("Loyola");
            }
          }}
        >
          {/* Render Building Polygons */}
          {buildingPolygons.map((polygon) => {
            const colors = getPolygonColors(polygon.buildingId);
            const building = allBuildingsList.find(
              (b: Building) => b.id === polygon.buildingId,
            );
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

          {/* Marker Rendering */}
          {(selectedCampus === "SGW" ? SGW_BUILDINGS : LOYOLA_BUILDINGS)
            .filter(
              (b) =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.code.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((building) => (
              <BuildingMarkerItem
                key={building.id}
                building={building}
                isCurrentLocation={highlightedBuildingId === building.id}
                isStart={startBuilding?.id === building.id}
                isDest={destinationBuilding?.id === building.id}
                onPress={() => handleBuildingPress(building)}
              />
            ))}

          {/* POI Markers */}
          {showPOIs &&
            pois.map((poi) => (
              <POIMarkerItem
                key={`poi-${poi.id}`}
                poi={poi}
                onPress={() => {
                  setSelectedPOI(poi);
                  setSelectedBuilding(null);
                  setInfoBuilding(null);
                }}
              />
            ))}

          {/* Render Directions Polyline */}
          {showRoute && (
            <>
              {/* Walking — dashed */}
              {transportationMode === "walk" && (
                <Polyline
                  coordinates={route.coordinates}
                  strokeWidth={4}
                  strokeColor="#3B82F6"
                  lineDashPattern={[8, 6]}
                  zIndex={10}
                />
              )}

              {/* Driving — solid */}
              {transportationMode === "car" && (
                <Polyline
                  coordinates={route.coordinates}
                  strokeWidth={5}
                  strokeColor="#F59E0B"
                  zIndex={10}
                />
              )}

              {/* Transit — per-segment polylines (walk/bus/metro/tram/rail) */}
              {transportationMode === "transit" &&
              route.segments &&
              route.segments.length > 0
                ? route.segments.map((seg, i) => {
                    const isWalk = seg.mode === "WALK";
                    const color = SEGMENT_COLORS[seg.mode];
                    const segKey = `transit-seg-${seg.mode}-${i}-${seg.coordinates[0]?.latitude ?? i}`;
                    return (
                      <Polyline
                        // @ts-ignore - key is a React reserved prop, missing in MapPolylineProps but required in map()
                        key={segKey}
                        coordinates={seg.coordinates}
                        strokeWidth={isWalk ? 3 : 5}
                        strokeColor={color}
                        lineDashPattern={isWalk ? [6, 5] : undefined}
                        zIndex={10}
                      />
                    );
                  })
                : transportationMode === "transit" && (
                    <Polyline
                      coordinates={route.coordinates}
                      strokeWidth={4}
                      strokeColor="#8B5CF6"
                      lineDashPattern={[16, 8]}
                      zIndex={10}
                    />
                  )}

              {/* Shuttle — dotted */}
              {transportationMode === "shuttle" && (
                <Polyline
                  coordinates={route.coordinates}
                  strokeWidth={4}
                  strokeColor="#EC4899"
                  lineDashPattern={[2, 6]}
                  zIndex={10}
                />
              )}
            </>
          )}

          {/* Add markers for start and destination if they are from different campuses */}
          {showRoute &&
            startBuilding &&
            destinationBuilding &&
            startBuilding.campus !== destinationBuilding.campus && (
              <>
                <Marker
                  key={`start-marker-${startBuilding.id}`}
                  coordinate={{
                    latitude: startBuilding.lat,
                    longitude: startBuilding.lng,
                  }}
                  pinColor="#10B981"
                  title="Start"
                />
                <Marker
                  key={`dest-marker-${destinationBuilding.id}`}
                  coordinate={{
                    latitude: destinationBuilding.lat,
                    longitude: destinationBuilding.lng,
                  }}
                  pinColor="#FFEA00"
                  title="Destination"
                />
              </>
            )}
        </MapView>

        {/* Clear Selection Button */}
        {(startBuilding || destinationBuilding) && (
          <TouchableOpacity
            style={styles.clearSelectionButton}
            testID="clear-directions-button"
            onPress={() => {
              clearDirections();
              setSelectedBuilding(null);
              setSelectedPOI(null);
            }}
          >
            <Ionicons name="close-circle" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Travel Time Display */}
      {showRoute && (
        <View style={styles.travelTimeContainer}>
          <View style={styles.travelTimeBadge}>
            <Ionicons name="time-outline" size={16} color="#FFFFFF" />
            <Text style={styles.travelTimeText}>
              {route.duration} ({route.distance})
            </Text>
          </View>
        </View>
      )}

      {showPOIs && poisLoading && (
        <View style={styles.poiLoadingIndicator}>
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.poiToggleButton,
          showPOIs && styles.poiToggleButtonActive,
        ]}
        onPress={() => setShowPOIs(!showPOIs)}
        testID="poi-toggle-button"
      >
        <Ionicons
          name="restaurant"
          size={24}
          color={showPOIs ? "#FFFFFF" : "#8B5CF6"}
        />
      </TouchableOpacity>

      <LocateMeButton
        onLocate={getCurrentLocation}
        isLoading={locationLoading}
        nearestBuilding={nearestBuilding}
        isOnCampus={isOnCampus}
        errorMsg={locationError}
        currentCampus={currentCampus}
        onCampusDetected={handleCampusDetected}
        onBuildingHighlight={handleBuildingHighlight}
      />

      {infoBuilding && (
        <BuildingInformation
          building={infoBuilding}
          onGetDirections={handleGetDirections}
          onClose={() => setInfoBuilding(null)}
          getDirectionsButtonText={
            startBuilding ? "Set as Destination" : "Set as Start"
          }
        />
      )}

      {selectedBuilding && (
        <View style={styles.bottomBar} testID="bottom-bar">
          <View style={styles.bottomBarInfo}>
            <View style={styles.bottomBarCodeRow}>
              <Text style={styles.bottomBarCode} testID="bottom-bar-code">
                {selectedBuilding.code}
              </Text>
              {highlightedBuildingId === selectedBuilding.id && (
                <View style={styles.youAreHereBadge}>
                  <Ionicons name="location" size={12} color="#FFFFFF" />
                  <Text style={styles.youAreHereBadgeText}>You are here</Text>
                </View>
              )}
            </View>
            <Text
              style={styles.bottomBarName}
              numberOfLines={1}
              testID="bottom-bar-name"
            >
              {selectedBuilding.name}
            </Text>
            <Text style={styles.bottomBarAddress} numberOfLines={1}>
              {selectedBuilding.address}
            </Text>
          </View>
          <View style={styles.bottomBarActions}>
            <TouchableOpacity
              style={styles.bottomBarButtonSecondary}
              onPress={() => {
                setSelectedBuilding(null);
              }}
            >
              <Text style={styles.bottomBarButtonSecondaryText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomBarButtonSecondary}
              onPress={() => {
                setInfoBuilding(selectedBuilding);
              }}
            >
              <Text style={styles.bottomBarButtonSecondaryText}>More Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomBarButtonPrimary}
              onPress={() => handleGetDirections(selectedBuilding)}
            >
              <Text style={styles.bottomBarButtonPrimaryText}>
                {startBuilding ? "Set as Destination" : "Set as Start"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedPOI && (
        <View style={styles.bottomBar} testID="poi-bottom-bar">
          <View style={styles.bottomBarInfo}>
            <View
              style={[
                styles.bottomBarCodeRow,
                { alignItems: "center", gap: 6 },
              ]}
            >
              <Ionicons
                name={getPoiInfo(selectedPOI.type).icon as any}
                size={16}
                color={getPoiInfo(selectedPOI.type).color}
              />
              <Text
                style={[
                  styles.bottomBarCode,
                  { color: getPoiInfo(selectedPOI.type).color },
                ]}
                testID="poi-bottom-bar-code"
              >
                {selectedPOI.type.replaceAll("_", " ").toUpperCase()}
              </Text>
            </View>
            <Text
              style={styles.bottomBarName}
              numberOfLines={1}
              testID="poi-bottom-bar-name"
            >
              {selectedPOI.name}
            </Text>
            <Text style={styles.bottomBarAddress} numberOfLines={1}>
              {selectedPOI.address || "Point of Interest"}
            </Text>
          </View>
          <View style={styles.bottomBarActions}>
            <TouchableOpacity
              style={styles.bottomBarButtonSecondary}
              onPress={() => setSelectedPOI(null)}
            >
              <Text style={styles.bottomBarButtonSecondaryText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomBarButtonPrimary}
              onPress={() => handleGetDirectionsForPOI(selectedPOI)}
              testID="poi-directions-button"
            >
              <Text style={styles.bottomBarButtonPrimaryText}>
                Get Directions
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 10,
  },
  searchInputWrapper: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: 10,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    fontSize: 16,
  },
  campusToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 10,
  },
  campusToggle: {
    flexDirection: "row",
    gap: 8,
  },
  campusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  campusButtonActive: {
    backgroundColor: "#912338",
  },
  campusButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  campusButtonTextActive: {
    color: "#FFFFFF",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#E5E7EB",
  },
  mapBackground: {
    flex: 1,
    backgroundColor: "#D1D5DB",
  },
  gridContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#9CA3AF",
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#9CA3AF",
  },
  campusLabel: {
    position: "absolute",
    top: 16,
    left: "50%",
    transform: [{ translateX: -100 }],
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: 200,
    alignItems: "center",
  },
  campusLabelTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  campusLabelSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  markerContainer: {
    position: "absolute",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 10,
    alignItems: "center",
  },
  markerWrapper: {
    alignItems: "center",
  },
  statusBadge: {
    position: "absolute",
    top: -18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 30,
  },
  startBadge: {
    backgroundColor: "#10B981",
  },
  destBadge: {
    backgroundColor: "#912338",
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#B52D45",
    borderWidth: 3,
    borderColor: "#912338",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerSelected: {
    width: 44,
    height: 44,
    backgroundColor: "#912338",
    borderColor: "#6D1A2A",
    zIndex: 20,
  },
  markerCurrent: {
    backgroundColor: "#3B82F6",
    borderColor: "#60A5FA",
  },
  markerStart: {
    borderColor: "#10B981",
    borderWidth: 4,
  },
  markerDest: {
    borderColor: "#912338",
    borderWidth: 4,
  },
  markerText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  currentLocationLabel: {
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentLocationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  locateButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 30,
  },
  poiToggleButton: {
    position: "absolute",
    bottom: 80,
    right: 16,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    borderWidth: 2,
    borderColor: "#8B5CF6",
  },
  poiToggleButtonActive: {
    backgroundColor: "#8B5CF6",
  },
  poiLoadingIndicator: {
    position: "absolute",
    bottom: 144,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 8,
    borderRadius: 20,
    zIndex: 100,
  },
  poiMarkerContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  mapWrapper: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  travelTimeContainer: {
    position: "absolute",
    top: 140, // Below campus toggle
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  travelTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  travelTimeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  icontainer: {
    width: 220,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "white",
  },
  ititle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  isubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
  ibutton: {
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#912338",
    alignItems: "center",
  },
  ibuttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
  bottomBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomBarInfo: {
    marginBottom: 10,
  },
  bottomBarCode: {
    fontSize: 20,
    fontWeight: "800",
    color: "#912338",
  },
  bottomBarName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  bottomBarAddress: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  bottomBarActions: {
    flexDirection: "row",
    gap: 10,
  },
  bottomBarButtonPrimary: {
    flex: 1,
    backgroundColor: "#912338",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  bottomBarButtonPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  bottomBarButtonSecondary: {
    width: 90,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  bottomBarButtonSecondaryText: {
    color: "#374151",
    fontWeight: "800",
  },
  clearSelectionButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#912338",
    padding: 12,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 30,
  },
  currentLocationLegend: {
    position: "absolute",
    top: 140,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 50,
    maxWidth: "55%",
  },
  currentLocationLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    flexShrink: 0,
  },
  currentLocationLegendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
    flexShrink: 1,
  },
  youAreHereCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  youAreHereDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  youAreHereText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomBarCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  youAreHereBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  youAreHereBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  labelMarker: {
    backgroundColor: "#912338",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  labelMarkerCurrent: {
    backgroundColor: "#16A34A",
    borderColor: "#FFFFFF",
    borderWidth: 1.5,
  },
  labelMarkerStart: {
    backgroundColor: "#10B981",
  },
  labelMarkerDest: {
    backgroundColor: "#D97706",
  },
  labelMarkerText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  labelMarkerTextCurrent: {
    color: "#FFFFFF",
  },
  labelMarkerTextAlt: {
    color: "#FFFFFF",
  },
});
