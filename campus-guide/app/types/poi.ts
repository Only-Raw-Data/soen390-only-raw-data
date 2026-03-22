export interface PointOfInterest {
  id: number;
  name: string;
  type: string; // e.g., 'restaurant', 'cafe', 'fast_food', etc.
  lat: number;
  lon: number;
  distance?: number; // Distance from user in meters
  address?: string; // Optional address information if available
}
