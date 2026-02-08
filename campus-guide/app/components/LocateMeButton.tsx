import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Building, Campus } from "@/constants/buildings";
import { ToastType } from "../types/ToastType";

interface LocateMeButtonProps {
  readonly onLocate: () => Promise<void>;
  readonly isLoading: boolean;
  readonly nearestBuilding: Building | null;
  readonly isOnCampus: boolean;
  readonly errorMsg: string | null;
  readonly currentCampus: Campus | null;
  readonly onCampusDetected?: (campus: Campus) => void;
  readonly onBuildingHighlight?: (buildingId: string | null) => void;
}

export default function LocateMeButton({
  onLocate,
  isLoading,
  nearestBuilding,
  isOnCampus,
  errorMsg,
  currentCampus,
  onCampusDetected,
  onBuildingHighlight,
}: LocateMeButtonProps) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (showToast) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto hide after 4 seconds
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowToast(false);
        });
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [showToast, fadeAnim]);

  useEffect(() => {
    if (!isLoading) {
      if (errorMsg) {
        setToastMessage(errorMsg);
        setToastType("error");
        setShowToast(true);
        onBuildingHighlight?.(null);
      } else if (isOnCampus && nearestBuilding) {
        setToastMessage(
          `You are near ${nearestBuilding.name} (${nearestBuilding.code})`,
        );
        setToastType("success");
        setShowToast(true);

        if (currentCampus) {
          onCampusDetected?.(currentCampus);
        }

        // Highlight the nearest building
        onBuildingHighlight?.(nearestBuilding.id);
      }
    }
  }, [isLoading, isOnCampus, nearestBuilding, errorMsg, currentCampus]);

  const handlePress = async () => {
    onBuildingHighlight?.(null);
    await onLocate();
  };

  const getToastStyle = () => {
    switch (toastType) {
      case "success":
        return styles.toastSuccess;
      case "error":
        return styles.toastError;
      default:
        return styles.toastInfo;
    }
  };

  const getToastIcon = () => {
    switch (toastType) {
      case "success":
        return "location";
      case "error":
        return "warning-outline";
      default:
        return "information-circle-outline";
    }
  };

  return (
    <>
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            getToastStyle(),
            { opacity: fadeAnim },
          ]}
        >
          <Ionicons
            name={getToastIcon()}
            size={20}
            color="#FFFFFF"
            style={styles.toastIcon}
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity
            onPress={() => {
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start(() => setShowToast(false));
            }}
            style={styles.toastCloseButton}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#912338" />
        ) : (
          <Ionicons name="locate" size={24} color="#912338" />
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 24,
    right: 16,
    backgroundColor: "#FFFFFF",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  toastContainer: {
    position: "absolute",
    bottom: 88,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 101,
  },
  toastSuccess: {
    backgroundColor: "#10B981",
  },
  toastError: {
    backgroundColor: "#EF4444",
  },
  toastInfo: {
    backgroundColor: "#3B82F6",
  },
  toastIcon: {
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  toastCloseButton: {
    marginLeft: 8,
    padding: 4,
  },
});
