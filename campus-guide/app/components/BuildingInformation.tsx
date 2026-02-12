import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Building } from "./../../constants/buildings";
import { BUILDING_IMAGES } from "./../../constants/buildingImages";

interface BuildingInformationProps {
  readonly building: Building;
  readonly onGetDirections: (building: Building) => void;
  readonly onClose: () => void;
  readonly getDirectionsButtonText: string;
}

const hasValidContent = (value: string | undefined | null): boolean => {
  return Boolean(value && value !== "NA" && value !== "");
};

export default function BuildingInformation({
  building,
  onGetDirections,
  onClose,
  getDirectionsButtonText,
}: BuildingInformationProps) {
  const [showOverview, setShowOverview] = useState(false);

  const toggleOverview = () => {
    setShowOverview((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {BUILDING_IMAGES[building.id] && (
            <View style={styles.imageContainer}>
              <Image
                testID="building-image"
                source={BUILDING_IMAGES[building.id]}
                style={styles.buildingImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{building.code}</Text>
            </View>
            <View style={styles.details}>
              <Text style={styles.name} testID="building-info-name">{building.name}</Text>
              <Text style={styles.campus}>{building.campus} Campus</Text>
              <Text style={styles.address}>{building.address}</Text>
            </View>
          </View>

          {/* Department Section */}
          {hasValidContent(building.department) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business-outline" size={16} color="#912338" />
                <Text style={styles.sectionTitle}>Departments</Text>
              </View>
              <Text style={styles.departmentText}>{building.department}</Text>
            </View>
          )}

          {/* Accessibility Section */}
          {hasValidContent(building.accessibility) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="accessibility-outline"
                  size={16}
                  color="#912338"
                />
                <Text style={styles.sectionTitle}>Accessibility</Text>
              </View>
              <Text style={styles.accessibilityText}>
                {building.accessibility}
              </Text>
            </View>
          )}

          {/* Overview Section */}
          {hasValidContent(building.overview) && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.overviewHeader}
                onPress={toggleOverview}
              >
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#912338"
                  />
                  <Text style={styles.sectionTitle}>Overview</Text>
                </View>
                <Ionicons
                  name={showOverview ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
              {showOverview && (
                <Text style={styles.overviewText}>{building.overview}</Text>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => onGetDirections(building)}
            >
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
              <Text style={styles.directionsButtonText}>
                {getDirectionsButtonText || "Get Directions"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Close Button */}
      <TouchableOpacity
        testID="close-button"
        onPress={onClose}
        style={styles.closeButton}
      >
        <Ionicons name="close" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 40,
  },
  scrollView: {
    maxHeight: "100%",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  imageContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  buildingImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    gap: 12,
  },
  codeBadge: {
    backgroundColor: "#912338",
    borderRadius: 8,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    height: 60,
  },
  codeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 20,
  },
  details: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  campus: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 4,
  },
  address: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  section: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#912338",
  },
  departmentText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  accessibilityText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overviewText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  directionsButton: {
    flex: 1,
    backgroundColor: "#912338",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  directionsButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 4,
  },
});
