import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";
import { Building, Campus } from "@/constants/buildings";
import { findNearestBuilding } from "../utils/locationUtils";

const DEV_MODE_ENABLED = false;

const DEV_MOCK_LOCATION = {
  latitude: 45.497092,
  longitude: -73.5788,
};

async function getMockPosition(): Promise<Location.LocationObject> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    coords: {
      latitude: DEV_MOCK_LOCATION.latitude,
      longitude: DEV_MOCK_LOCATION.longitude,
      altitude: null,
      accuracy: 10,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

async function getRealPosition(): Promise<Location.LocationObject> {
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
}

const getPosition = DEV_MODE_ENABLED ? getMockPosition : getRealPosition;

export interface UserLocationState {
  location: Location.LocationObject | null;
  errorMsg: string | null;
  permissionStatus: Location.PermissionStatus | null;
  isLoading: boolean;
  nearestBuilding: Building | null;
  isOnCampus: boolean;
  currentCampus: Campus | null;
}

const MAX_CAMPUS_DISTANCE_METERS = 200;

function createLocationStateUpdate(
  location: Location.LocationObject,
  offCampusMessage: string,
): Partial<UserLocationState> {
  const { building, distance, campus } = findNearestBuilding(
    location.coords.latitude,
    location.coords.longitude,
  );
  const isOnCampus = distance <= MAX_CAMPUS_DISTANCE_METERS;

  return {
    location,
    nearestBuilding: isOnCampus ? building : null,
    isOnCampus,
    currentCampus: isOnCampus ? campus : null,
    isLoading: false,
    errorMsg: isOnCampus ? null : offCampusMessage,
  };
}

export default function useUserLocation() {
  const [state, setState] = useState<UserLocationState>({
    location: null,
    errorMsg: null,
    permissionStatus: null,
    isLoading: false,
    nearestBuilding: null,
    isOnCampus: false,
    currentCampus: null,
  });

  const [locationSubscription, setLocationSubscription] =
    useState<Location.LocationSubscription | null>(null);

  const requestLocationPermission = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, errorMsg: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setState((prev) => ({ ...prev, permissionStatus: status }));
      if (status !== "granted") {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          errorMsg: "Location permission denied. Please enable location access in your device settings to use this feature.",
        }));
        return false;
      }
      return true;
    } catch (error) {
      console.warn("Failed to request location permission:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errorMsg: "Failed to request location permission.",
      }));
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const location = await getPosition();
      const stateUpdate = createLocationStateUpdate(
        location,
        "You don't appear to be on campus. Move closer to a Concordia campus to see your nearest building.",
      );
      setState((prev) => ({ ...prev, ...stateUpdate }));
    } catch (error) {
      console.warn("Failed to get current location:", error);
      setState((prev) => ({ ...prev, isLoading: false, errorMsg: "Failed to get your location. Please try again." }));
    }
  }, [requestLocationPermission]);

  const startLocationTracking = useCallback(async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    if (locationSubscription) {
      locationSubscription.remove();
    }

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const stateUpdate = createLocationStateUpdate(location, "You don't appear to be on campus.");
          setState((prev) => ({ ...prev, ...stateUpdate }));
        },
      );
      setLocationSubscription(subscription);
    } catch (error) {
      console.warn("Failed to start location tracking:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errorMsg: "Failed to start location tracking.",
      }));
    }
  }, [requestLocationPermission, locationSubscription]);

  const stopLocationTracking = useCallback(() => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  }, [locationSubscription]);

  const getNearestBuilding = useCallback(async (): Promise<Building | null> => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { building } = findNearestBuilding(
        location.coords.latitude,
        location.coords.longitude,
      );
      return building;
    } catch (error) {
      console.warn("Failed to get nearest building:", error);
      setState((prev) => ({ ...prev, errorMsg: "Failed to get current location" }));
      return null;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [requestLocationPermission]);

  const getRawLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
    } catch (error) {
      console.warn("Failed to get raw location:", error);
      return null;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [requestLocationPermission]);

  const resetLoadingState = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  useEffect(() => {
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [locationSubscription]);

  return {
    ...state,
    getCurrentLocation,
    getNearestBuilding,
    getRawLocation,
    resetLoadingState,
    startLocationTracking,
    stopLocationTracking,
    requestLocationPermission,
  };
}