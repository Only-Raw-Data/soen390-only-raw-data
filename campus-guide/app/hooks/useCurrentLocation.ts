import { useState } from 'react';
import * as Location from 'expo-location';
import { All_BUILDINGS, Building } from '../../constants/buildings';

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
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

export function findNearestBuilding(
  latitude: number,
  longitude: number,
  buildings: Building[] = All_BUILDINGS,
): Building | null {
  if (buildings.length === 0) return null;

  let nearest: Building | null = null;
  let minDistance = Infinity;

  for (const building of buildings) {
    const distance = haversineDistance(latitude, longitude, building.lat, building.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = building;
    }
  }

  return nearest;
}

export function useCurrentLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNearestBuilding = async (): Promise<Building | null> => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      const nearest = findNearestBuilding(
        location.coords.latitude,
        location.coords.longitude,
      );

      setLoading(false);
      return nearest;
    } catch (e) {
      setError('Failed to get current location');
      setLoading(false);
      return null;
    }
  };

  return { getNearestBuilding, loading, error };
}
