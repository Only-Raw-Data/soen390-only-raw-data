import { Building, All_BUILDINGS, Campus } from '@/constants/buildings';

// Calculates the distance between two geographic coordinates using the Haversine formula.
export function calculateDistance(
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

export interface NearestBuildingResult {
  building: Building | null;
  distance: number;
  campus: Campus | null;
}

// Finds the nearest campus building to a given location.
export function findNearestBuilding(
  latitude: number,
  longitude: number
): NearestBuildingResult {
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

