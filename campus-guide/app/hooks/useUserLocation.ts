import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Building, Campus } from '@/constants/buildings';
import { findNearestBuilding } from '../utils/locationUtils';

// DEV MODE to mock location for testing. Setting to false will use users real location and changing to true will use mock location defined.
const DEV_MODE_ENABLED = __DEV__ && false;

// Example mock locations for testing:
// SGW Campus buildings:
//   H Building: { latitude: 45.497092, longitude: -73.5788 }
//   MB Building: { latitude: 45.495304, longitude: -73.579044 }
//   EV Building: { latitude: 45.495376, longitude: -73.577997 }
// Loyola Campus buildings:
//   CC Building: { latitude: 45.458204, longitude: -73.6403 }
//   VL Building: { latitude: 45.459026, longitude: -73.638606 }
const DEV_MOCK_LOCATION = {
  latitude: 45.497092, 
  longitude: -73.5788,
};

export interface UserLocationState {
  location: Location.LocationObject | null;
  errorMsg: string | null;
  permissionStatus: Location.PermissionStatus | null;
  isLoading: boolean;
  nearestBuilding: Building | null;
  isOnCampus: boolean;
  currentCampus: Campus | null;
}

// Maximum distance (in meters) to be considered "on campus"
const MAX_CAMPUS_DISTANCE_METERS = 200;

// Helper to create location state update from coordinates
function createLocationStateUpdate(
  location: Location.LocationObject,
  offCampusMessage: string
): Partial<UserLocationState> {
  const { building, distance, campus } = findNearestBuilding(
    location.coords.latitude,
    location.coords.longitude
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

export function useUserLocation() {
  const [state, setState] = useState<UserLocationState>({
    location: null,
    errorMsg: null,
    permissionStatus: null,
    isLoading: false,
    nearestBuilding: null,
    isOnCampus: false,
    currentCampus: null,
  });

  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  // Request permission and start location tracking
  const requestLocationPermission = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, errorMsg: null }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      setState((prev) => ({
        ...prev,
        permissionStatus: status,
      }));

      if (status !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          errorMsg: 'Location permission denied. Please enable location access in your device settings to use this feature.',
        }));
        return false;
      }

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errorMsg: 'Failed to request location permission.',
      }));
      return false;
    }
  }, []);

  // Get current location once
  const getCurrentLocation = useCallback(async () => {
    // DEV MODE: Use mock location for testing
    if (DEV_MODE_ENABLED) {
      setState((prev) => ({ ...prev, isLoading: true }));
      
      // Simulate a small delay like real location fetch
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const mockLocation: Location.LocationObject = {
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

      const stateUpdate = createLocationStateUpdate(mockLocation, "You don't appear to be on campus.");
      setState((prev) => ({
        ...prev,
        ...stateUpdate,
        permissionStatus: 'granted' as Location.PermissionStatus,
      }));
      
      console.log('DEV MODE: Using mock location', DEV_MOCK_LOCATION);
      return;
    }

    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const stateUpdate = createLocationStateUpdate(
        location,
        "You don't appear to be on campus. Move closer to a Concordia campus to see your nearest building."
      );
      setState((prev) => ({ ...prev, ...stateUpdate }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errorMsg: 'Failed to get your location. Please try again.',
      }));
    }
  }, [requestLocationPermission]);

  // Start continuous location tracking
  const startLocationTracking = useCallback(async () => {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      return;
    }

    // Stop existing subscription if any
    if (locationSubscription) {
      locationSubscription.remove();
    }

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        (location) => {
          const stateUpdate = createLocationStateUpdate(location, "You don't appear to be on campus.");
          setState((prev) => ({ ...prev, ...stateUpdate }));
        }
      );

      setLocationSubscription(subscription);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errorMsg: 'Failed to start location tracking.',
      }));
    }
  }, [requestLocationPermission, locationSubscription]);

  const stopLocationTracking = useCallback(() => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  }, [locationSubscription]);

  // Get nearest building directly (for use in DirectionsHeader etc.)
  const getNearestBuilding = useCallback(async (): Promise<Building | null> => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    try {
      const location = await Location.getCurrentPositionAsync({});
      const { building } = findNearestBuilding(location.coords.latitude, location.coords.longitude);
      return building;
    } catch {
      setState((prev) => ({
        ...prev,
        errorMsg: 'Failed to get current location',
      }));
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
    resetLoadingState,
    startLocationTracking,
    stopLocationTracking,
    requestLocationPermission,
  };
}

