import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Building, All_BUILDINGS, Campus, SGW_BUILDINGS, LOYOLA_BUILDINGS } from '@/constants/buildings';

// ============================================
// DEV MODE: Set to true to simulate location
// ============================================
const DEV_MODE_ENABLED = __DEV__ && true; // Change to `true` to enable mock location

// Mock location - change these coordinates to test different buildings
// SGW Campus buildings:
//   H Building: { latitude: 45.497092, longitude: -73.5788 }
//   MB Building: { latitude: 45.495304, longitude: -73.579044 }
//   EV Building: { latitude: 45.495376, longitude: -73.577997 }
// Loyola Campus buildings:
//   CC Building: { latitude: 45.458204, longitude: -73.6403 }
//   VL Building: { latitude: 45.459026, longitude: -73.638606 }
const DEV_MOCK_LOCATION = {
  latitude: 45.497092,  // H Building (SGW)
  longitude: -73.5788,
};
// ============================================

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

// Haversine formula to calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find the nearest building to a given location
function findNearestBuilding(
  latitude: number,
  longitude: number
): { building: Building | null; distance: number; campus: Campus | null } {
  let nearestBuilding: Building | null = null;
  let minDistance = Infinity;

  for (const building of All_BUILDINGS) {
    const distance = calculateDistance(latitude, longitude, building.lat, building.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestBuilding = building;
    }
  }

  return {
    building: nearestBuilding,
    distance: minDistance,
    campus: nearestBuilding?.campus || null,
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

      const { building, distance, campus } = findNearestBuilding(
        mockLocation.coords.latitude,
        mockLocation.coords.longitude
      );

      const isOnCampus = distance <= MAX_CAMPUS_DISTANCE_METERS;

      setState((prev) => ({
        ...prev,
        location: mockLocation,
        nearestBuilding: isOnCampus ? building : null,
        isOnCampus,
        currentCampus: isOnCampus ? campus : null,
        isLoading: false,
        errorMsg: isOnCampus
          ? null
          : "You don't appear to be on campus.",
        permissionStatus: 'granted' as Location.PermissionStatus,
      }));
      
      console.log('🧪 DEV MODE: Using mock location', DEV_MOCK_LOCATION);
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

      const { building, distance, campus } = findNearestBuilding(
        location.coords.latitude,
        location.coords.longitude
      );

      const isOnCampus = distance <= MAX_CAMPUS_DISTANCE_METERS;

      setState((prev) => ({
        ...prev,
        location,
        nearestBuilding: isOnCampus ? building : null,
        isOnCampus,
        currentCampus: isOnCampus ? campus : null,
        isLoading: false,
        errorMsg: isOnCampus
          ? null
          : "You don't appear to be on campus. Move closer to a Concordia campus to see your nearest building.",
      }));
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
          const { building, distance, campus } = findNearestBuilding(
            location.coords.latitude,
            location.coords.longitude
          );

          const isOnCampus = distance <= MAX_CAMPUS_DISTANCE_METERS;

          setState((prev) => ({
            ...prev,
            location,
            nearestBuilding: isOnCampus ? building : null,
            isOnCampus,
            currentCampus: isOnCampus ? campus : null,
            isLoading: false,
            errorMsg: isOnCampus
              ? null
              : "You don't appear to be on campus.",
          }));
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

  // Stop location tracking
  const stopLocationTracking = useCallback(() => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  }, [locationSubscription]);

  // Cleanup on unmount
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
    startLocationTracking,
    stopLocationTracking,
    requestLocationPermission,
  };
}

