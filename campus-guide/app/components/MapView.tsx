import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import BuildingSearchHeader from "./BuildingSearchComponent";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Campus,
  Building,
  SGW_BUILDINGS,
  LOYOLA_BUILDINGS,
  CAMPUS_REGIONS,
} from "./../../constants/buildings";
import { useDirections } from "../context/DirectionsContext";
import MapView, {
  Callout,
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
  Polyline,
} from "react-native-maps";
import useBuildingPolygons from "../hooks/useBuildingPolygons";
import { CAMPUS_MAP_STYLE } from "../../constants/mapStyle";
import BuildingInformation from "./BuildingInformation";
import LocateMeButton from "./LocateMeButton";
import useUserLocation from "../hooks/useUserLocation";

interface MapViewAppProps {
  readonly googleMapsApiKey?: string;
  readonly showSearch?: boolean;
}

export default function MapViewApp({
  showSearch,
  googleMapsApiKey,
}: MapViewAppProps) {
  const {
    startBuilding,
    destinationBuilding,
    setStartBuilding,
    setDestinationBuilding,
    clearDirections,
    route,
  } = useDirections();

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

  const allBuildingsList = [...SGW_BUILDINGS, ...LOYOLA_BUILDINGS];
  const filteredBuildings = allBuildingsList.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleCampusChange = (campus: Campus) => {
    setSelectedCampus(campus);
    setSelectedBuilding(null);
    
    // Animate map to the new campus
    if (mapRef.current) {
      mapRef.current.animateToRegion(CAMPUS_REGIONS[campus], 1000);
    }
  };

  const handleBuildingPress = (building: Building) => {
    // Switch campus context (markers/polygons) if the building is on the other campus
    if (building.id !== selectedBuilding?.id && building.campus !== selectedCampus) {
      setSelectedCampus(building.campus);
      
      // Animate to the new campus to avoid disorientation
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: building.lat,
          longitude: building.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    }
    
    setSelectedBuilding(building);
    setInfoBuilding(null);
  };

  const getMarkerTitle = (building: Building) => {
    if (startBuilding?.id === building.id) return "START - "+building.code+" - "+building.address;
    if (destinationBuilding?.id === building.id) return "DESTINATION - "+building.code+" - "+building.address;
    return building.code+" - "+building.address;
  };

  const getMarkerColor = (building: Building) => {
    if (startBuilding?.id === building.id) return "#10B981";
    if (destinationBuilding?.id === building.id) return "#FFEA00";
    return "#912338";
  };

  const getStrokeColorForBuilding = (isStart: boolean, isDest: boolean) => {
    if (isStart) return "#10B981";
    if (isDest) return "#FFEA00";
    return "#912338";
  };

  const getPolygonColors = (buildingId: string) => {
    const isStart = startBuilding?.id === buildingId;
    const isDest = destinationBuilding?.id === buildingId;
    const isHighlighted = highlightedBuildingId === buildingId;

    // User location highlight takes precedence for visual emphasis
    if (isHighlighted) {
      return {
        fillColor: "rgba(59, 130, 246, 0.4)", // Blue with transparency
        strokeColor: "#3B82F6",
        strokeWidth: 4,
      };
    }

    return {
      fillColor: "rgba(145, 35, 56, 0.3)", // Maroon with transparency
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
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        1000,
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

  // Fit route in view when it changes
  React.useEffect(() => {
    const coords = route?.coordinates;

    if ((coords?.length ?? 0) > 0 && mapRef.current?.fitToCoordinates) {
      console.log("Fitting map to coordinates:", coords?.length);
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 150, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [route]);

  return (
    <View style={styles.container}>
      {showSearch && (
        <BuildingSearchHeader
          value={searchQuery}
          onChangeText={setSearchQuery}
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
            // Only auto-switch if zoomed in enough to see buildings (guard against flip-flopping)
            if (region.latitudeDelta > 0.02) return;

            // Auto-switch campus markers based on the map center
            const sgwCenter = CAMPUS_REGIONS.SGW;
            const loyolaCenter = CAMPUS_REGIONS.Loyola;
            
            const distToSGW = Math.sqrt(
              Math.pow(region.latitude - sgwCenter.latitude, 2) + 
              Math.pow(region.longitude - sgwCenter.longitude, 2)
            );
            const distToLoyola = Math.sqrt(
              Math.pow(region.latitude - loyolaCenter.latitude, 2) + 
              Math.pow(region.longitude - loyolaCenter.longitude, 2)
            );

            if (distToSGW < distToLoyola && selectedCampus !== "SGW") {
              setSelectedCampus("SGW");
            } else if (distToLoyola < distToSGW && selectedCampus !== "Loyola") {
              setSelectedCampus("Loyola");
            }
          }}
        >
          {/* Render Building Polygons */}
          {buildingPolygons.map((polygon) => {
            const colors = getPolygonColors(polygon.buildingId);
            const building = allBuildingsList.find((b) => b.id === polygon.buildingId);
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
          {filteredBuildings
            .filter(b => b.campus === selectedCampus)
            .map((building) => (
            <Marker
              key={building.id}
              testID={`building-marker-${building.id}`}
              coordinate={{ latitude: building.lat, longitude: building.lng }}
              title={getMarkerTitle(building)}
              onPress={() => handleBuildingPress(building)}
              pinColor={getMarkerColor(building)}
            >
            </Marker>
          ))}
          {/* Render Directions Polyline */}
          {route && (
            <Polyline
              key={`route-${route.distance}-${route.duration}-${route.coordinates.length}`}
              coordinates={route.coordinates}
              strokeWidth={4}
              strokeColor="#3B82F6"
              zIndex={10}
            />
          )}
          
          {/* Add markers for start and destination if they are from different campuses */}
          {route && startBuilding && destinationBuilding && startBuilding.campus !== destinationBuilding.campus && (
            <>
               <Marker 
                key={`start-marker-${startBuilding.id}`}
                coordinate={{ latitude: startBuilding.lat, longitude: startBuilding.lng }}
                pinColor="#10B981"
                title="Start"
              />
              <Marker 
                key={`dest-marker-${destinationBuilding.id}`}
                coordinate={{ latitude: destinationBuilding.lat, longitude: destinationBuilding.lng }}
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
            onPress={() => {
              clearDirections();
              setSelectedBuilding(null);
            }}
          >
            <Ionicons name="close-circle" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Travel Time Display */}
      {route && (
        <View style={styles.travelTimeContainer}>
          <View style={styles.travelTimeBadge}>
            <Ionicons name="time-outline" size={16} color="#FFFFFF" />
            <Text style={styles.travelTimeText}>
              {route.duration} ({route.distance})
            </Text>
          </View>
        </View>
      )}

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
          getDirectionsButtonText={startBuilding ?  "Set as Destination" : "Set as Start" }
        />
      )}

      {selectedBuilding && (
        <View style={styles.bottomBar} testID="bottom-bar">
          <View style={styles.bottomBarInfo}>
            <Text style={styles.bottomBarCode} testID="bottom-bar-code">{selectedBuilding.code}</Text>
            <Text style={styles.bottomBarName} numberOfLines={1} testID="bottom-bar-name">
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
});
