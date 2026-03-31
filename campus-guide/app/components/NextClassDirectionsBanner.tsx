import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useNextClassDirections from "@hooks/useNextClassDirections";
import { useDirections } from "@context/DirectionsContext";
import useUserLocation from "@hooks/useUserLocation";

function formatMinutesUntilClassLabel(minutesUntilClass: number | null): string {
  if (minutesUntilClass != null && minutesUntilClass > 0) {
    return `in ${Math.ceil(minutesUntilClass)} min`;
  }
  if (minutesUntilClass != null && minutesUntilClass <= 0) {
    return "Starting now";
  }
  return "";
}

export default function NextClassDirectionsBanner() {
  const router = useRouter();
  const {
    nextClass,
    matchedBuilding,
    minutesUntilClass,
    shouldNotify,
    status,
    isLoading,
    dismissed,
    dismiss,
    isConnected,
  } = useNextClassDirections();

  const {
    setDestinationBuilding,
    setStartCoords,
    setStartBuilding,
    setTransportationMode,
    fetchRoute,
  } = useDirections();

  const { getRawLocation } = useUserLocation();

  const handleGetDirections = useCallback(async () => {
    if (!matchedBuilding) return;

    setDestinationBuilding(matchedBuilding);
    setStartBuilding(null);
    setTransportationMode("walk");

    const coords = await getRawLocation();
    if (coords) {
      setStartCoords(coords);
    }

    router.push("/(tabs)/two");

    setTimeout(() => {
      fetchRoute();
    }, 300);
  }, [
    matchedBuilding,
    setDestinationBuilding,
    setStartBuilding,
    setStartCoords,
    setTransportationMode,
    fetchRoute,
    getRawLocation,
    router,
  ]);

  if (!isConnected || !shouldNotify || dismissed) return null;

  const minutesText = formatMinutesUntilClassLabel(minutesUntilClass);

  const hasDirections = matchedBuilding !== null;

  let actionContent: React.ReactNode;
  if (isLoading) {
    actionContent = (
      <ActivityIndicator color="#FFFFFF" size="small" />
    );
  } else if (hasDirections) {
    actionContent = (
      <TouchableOpacity
        style={styles.directionsButton}
        activeOpacity={0.8}
        onPress={handleGetDirections}
      >
        <Ionicons name="navigate" size={14} color="#912338" />
        <Text style={styles.directionsButtonText}>Directions</Text>
      </TouchableOpacity>
    );
  } else {
    actionContent = (
      <View style={styles.noLocationBadge}>
        <Ionicons name="location-outline" size={12} color="#FBBF24" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="time-outline" size={20} color="#FFFFFF" />
        </View>

        <View style={styles.textWrapper}>
          <Text style={styles.title} numberOfLines={1}>
            {nextClass?.title ?? "Upcoming Class"}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {minutesText}
            {nextClass?.location ? ` \u2022 ${nextClass.location}` : ""}
            {status === "missing_location" ? " \u2022 No location set" : ""}
          </Text>
        </View>

        {actionContent}

        <TouchableOpacity
          style={styles.dismissButton}
          activeOpacity={0.7}
          onPress={dismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  textWrapper: {
    flex: 1,
    marginRight: 4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 1,
  },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  directionsButtonText: {
    color: "#912338",
    fontSize: 12,
    fontWeight: "700",
  },
  noLocationBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  dismissButton: {
    padding: 2,
  },
});
