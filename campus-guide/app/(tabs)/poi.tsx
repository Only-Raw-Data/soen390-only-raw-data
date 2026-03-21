import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Header from "@app/components/Header";
import useUserLocation from "@app/hooks/useUserLocation";
import { getPoiInfo } from "@/constants/poi";
import { poiToBuildingAdapter } from "@app/utils/poiUtils";
import { useDirections } from "@app/context/DirectionsContext";
import { usePOIContext } from "@app/context/POIContext";
import { CAMPUS_REGIONS, Campus } from "@constants/buildings";
import { PointOfInterest } from "@app/types/poi";

// ─── Radius options ──────────────────────────────────────────────────────────

const RADIUS_OPTIONS = [0.5, 1, 2, 3, 5]; // km

// ─── Category filter config ─────────────────────────────────────────────────

type Category = "all" | "coffee" | "dining" | "shopping" | "bar";

const CATEGORIES: {
  id: Category;
  label: string;
  icon: string;
  types: string[];
}[] = [
  { id: "all", label: "All", icon: "apps-outline", types: [] },
  { id: "coffee", label: "Coffee", icon: "cafe-outline", types: ["cafe"] },
  {
    id: "dining",
    label: "Dining",
    icon: "restaurant-outline",
    types: ["restaurant", "fast_food"],
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: "cart-outline",
    types: ["supermarket", "convenience"],
  },
  { id: "bar", label: "Bar", icon: "beer-outline", types: ["pub", "bar"] },
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatDistance(meters?: number): string {
  if (meters === undefined) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ─── POI list item ────────────────────────────────────────────────────────────

interface POIItemProps {
  poi: PointOfInterest;
  campus: Campus;
  onDirections: (poi: PointOfInterest) => void;
  onInfo: (poi: PointOfInterest) => void;
}

function POIItem({ poi, campus, onDirections, onInfo }: POIItemProps) {
  const info = getPoiInfo(poi.type);
  return (
    <View style={styles.poiCard} testID={`poi-item-${poi.id}`}>
      {/* Icon circle */}
      <View
        style={[styles.poiIconCircle, { backgroundColor: info.color + "22" }]}
      >
        <Ionicons name={info.icon as any} size={22} color={info.color} />
      </View>

      {/* Content */}
      <View style={styles.poiContent}>
        <Text style={styles.poiName} numberOfLines={1}>
          {poi.name}
        </Text>

        <View style={styles.poiMeta}>
          {poi.distance !== undefined && (
            <Text style={styles.poiDistance}>
              {formatDistance(poi.distance)}
            </Text>
          )}
          {poi.address && (
            <>
              <Text style={styles.poiMetaDot}>·</Text>
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={styles.poiAddress} numberOfLines={1}>
                {poi.address}
              </Text>
            </>
          )}
        </View>

        {poi.openingHours && (
          <Text style={styles.poiHours} numberOfLines={1}>
            {poi.openingHours}
          </Text>
        )}

        {/* Action buttons */}
        <View style={styles.poiActions}>
          <TouchableOpacity
            style={styles.poiDirectionsBtn}
            onPress={() => onDirections(poi)}
            testID={`directions-btn-${poi.id}`}
          >
            <Ionicons name="navigate-outline" size={14} color="#FFFFFF" />
            <Text style={styles.poiDirectionsBtnText}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.poiInfoBtn}
            onPress={() => onInfo(poi)}
            testID={`info-btn-${poi.id}`}
          >
            <Text style={styles.poiInfoBtnText}>Info</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Info Modal ───────────────────────────────────────────────────────────────

interface InfoModalProps {
  poi: PointOfInterest | null;
  onClose: () => void;
}

function InfoModal({ poi, onClose }: InfoModalProps) {
  if (!poi) return null;
  const info = getPoiInfo(poi.type);
  return (
    <Modal
      visible={!!poi}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="poi-info-modal"
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
        testID="modal-overlay"
      >
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          {/* Handle bar */}
          <View style={styles.modalHandle} />

          <View style={styles.modalIconRow}>
            <View
              style={[
                styles.modalIconCircle,
                { backgroundColor: info.color + "22" },
              ]}
            >
              <Ionicons name={info.icon as any} size={32} color={info.color} />
            </View>
          </View>

          <Text style={styles.modalName}>{poi.name}</Text>
          <Text style={styles.modalType}>{poi.type.replace(/_/g, " ")}</Text>

          {poi.distance !== undefined && (
            <View style={styles.modalRow}>
              <Ionicons name="walk-outline" size={16} color="#6B7280" />
              <Text style={styles.modalRowText}>
                {formatDistance(poi.distance)} away
              </Text>
            </View>
          )}

          {poi.address && (
            <View style={styles.modalRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.modalRowText}>{poi.address}</Text>
            </View>
          )}

          {poi.openingHours && (
            <View style={styles.modalRow}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.modalRowText}>{poi.openingHours}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={onClose}
            testID="modal-close-btn"
          >
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function POIScreen() {
  const router = useRouter();
  const { setDestinationBuilding, setStartBuilding, startBuilding } =
    useDirections();

  // POI context (shared state across tabs)
  const {
    pois,
    isLoading: loading,
    searchRadius,
    setSearchRadius,
    updateSearchCenter,
  } = usePOIContext();

  // Campus selector
  const [selectedCampus, setSelectedCampus] = useState<Campus>("SGW");

  // Get the center coordinates for the selected campus
  const campusCenter = CAMPUS_REGIONS[selectedCampus];

  // User location (fallback to campus center if unavailable)
  const { location: userLocation } = useUserLocation();

  const fetchLat = userLocation?.coords.latitude ?? campusCenter.latitude;
  const fetchLon = userLocation?.coords.longitude ?? campusCenter.longitude;

  // When campus or user location changes, update the context search center
  React.useEffect(() => {
    updateSearchCenter(fetchLat, fetchLon);
  }, [fetchLat, fetchLon, updateSearchCenter]);

  // Search + filters
  const [searchQuery, setSearchQuery] = useState("");
  // Convert searchRadius (meters in context) to km for UI
  const radiusKm = searchRadius / 1000;
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  // Info modal
  const [infoPoi, setInfoPoi] = useState<PointOfInterest | null>(null);

  // Client-side filtering
  const filteredPois = useMemo(() => {
    const categoryTypes =
      activeCategory === "all"
        ? []
        : (CATEGORIES.find((c) => c.id === activeCategory)?.types ?? []);

    return pois.filter((poi) => {
      const matchesCategory =
        activeCategory === "all" ||
        categoryTypes.some((t) => poi.type.includes(t));
      const matchesSearch =
        !searchQuery.trim() ||
        poi.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [pois, activeCategory, searchQuery]);

  // Handlers
  const handleDirections = useCallback(
    (poi: PointOfInterest) => {
      const building = poiToBuildingAdapter(poi, selectedCampus);
      if (!startBuilding) {
        setStartBuilding(building);
      } else {
        setDestinationBuilding(building);
      }
      router.push("/(tabs)/two");
    },
    [
      router,
      setStartBuilding,
      setDestinationBuilding,
      startBuilding,
      selectedCampus,
    ],
  );

  const handleInfo = useCallback((poi: PointOfInterest) => {
    setInfoPoi(poi);
  }, []);

  const handleCloseInfo = useCallback(() => {
    setInfoPoi(null);
  }, []);

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="poi-scroll-view"
      >
        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Points of Interest</Text>
        </View>

        {/* Campus selector */}
        <View style={styles.campusToggle}>
          {(["SGW", "Loyola"] as Campus[]).map((campus) => (
            <TouchableOpacity
              key={campus}
              testID={`campus-btn-${campus}`}
              style={[
                styles.campusBtn,
                selectedCampus === campus && styles.campusBtnActive,
              ]}
              onPress={() => setSelectedCampus(campus)}
            >
              <Text
                style={[
                  styles.campusBtnText,
                  selectedCampus === campus && styles.campusBtnTextActive,
                ]}
              >
                {campus}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search bar */}
        <View style={styles.searchWrapper}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search places..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              testID="clear-search-btn"
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Radius selector */}
        <View style={styles.sliderSection}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>Search Range</Text>
            <Text style={styles.sliderValue}>
              {radiusKm % 1 === 0 ? `${radiusKm} km` : `${radiusKm} km`}
            </Text>
          </View>
          <View style={styles.radiusPills} testID="radius-slider">
            {RADIUS_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                testID={`radius-option-${r}`}
                style={[
                  styles.radiusPill,
                  radiusKm === r && styles.radiusPillActive,
                ]}
                onPress={() => setSearchRadius(r * 1000)}
              >
                <Text
                  style={[
                    styles.radiusPillText,
                    radiusKm === r && styles.radiusPillTextActive,
                  ]}
                >
                  {r < 1 ? `${r * 1000}m` : `${r}km`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
          testID="category-chips"
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              testID={`category-chip-${cat.id}`}
              style={[
                styles.chip,
                activeCategory === cat.id && styles.chipActive,
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={activeCategory === cat.id ? "#FFFFFF" : "#6B7280"}
              />
              <Text
                style={[
                  styles.chipText,
                  activeCategory === cat.id && styles.chipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results header */}
        {!loading && (
          <Text style={styles.resultCount} testID="result-count">
            {filteredPois.length === 0
              ? "No places found nearby"
              : `Found ${filteredPois.length} place${filteredPois.length === 1 ? "" : "s"} nearby`}
          </Text>
        )}

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingContainer} testID="loading-indicator">
            <ActivityIndicator size="large" color="#912338" />
            <Text style={styles.loadingText}>Finding places nearby…</Text>
          </View>
        )}

        {/* POI list */}
        {!loading && filteredPois.length === 0 && (
          <View style={styles.emptyContainer} testID="empty-state">
            <Ionicons name="location-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No places found</Text>
            <Text style={styles.emptySubtext}>
              Try increasing the search range or choosing a different category.
            </Text>
          </View>
        )}

        {!loading &&
          filteredPois.map((poi) => (
            <POIItem
              key={poi.id}
              poi={poi}
              campus={selectedCampus}
              onDirections={handleDirections}
              onInfo={handleInfo}
            />
          ))}
      </ScrollView>

      {/* Info modal */}
      <InfoModal poi={infoPoi} onClose={handleCloseInfo} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Title
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  // Campus toggle
  campusToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  campusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  campusBtnActive: {
    backgroundColor: "#912338",
    borderColor: "#912338",
  },
  campusBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  campusBtnTextActive: {
    color: "#FFFFFF",
  },

  // Search
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },

  // Radius slider
  sliderSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#912338",
  },
  radiusPills: {
    flexDirection: "row",
    marginTop: 10,
    marginBottom: 6,
    gap: 6,
  },
  radiusPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  radiusPillActive: {
    backgroundColor: "#912338",
    borderColor: "#912338",
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  radiusPillTextActive: {
    color: "#FFFFFF",
  },

  // Category chips
  chipsScroll: {
    marginBottom: 8,
  },
  chipsContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  chipActive: {
    backgroundColor: "#912338",
    borderColor: "#912338",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },

  // Results
  resultCount: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  // Loading
  loadingContainer: {
    marginTop: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#9CA3AF",
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    marginTop: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // POI Card
  poiCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F1F1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  poiIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  poiContent: {
    flex: 1,
  },
  poiName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  poiMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  poiDistance: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  poiMetaDot: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  poiAddress: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  poiHours: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
    marginBottom: 4,
  },
  poiActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  poiDirectionsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#912338",
    paddingVertical: 8,
    borderRadius: 10,
  },
  poiDirectionsBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  poiInfoBtn: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  poiInfoBtnText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
  },

  // Info modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalIconRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  modalType: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    textTransform: "capitalize",
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  modalRowText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  modalCloseBtn: {
    marginTop: 20,
    backgroundColor: "#912338",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  modalCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
