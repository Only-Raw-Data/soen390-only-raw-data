import { TransportationMode } from '../types/transportation';
import { decode } from '@googlemaps/polyline-codec';

export interface RouteData {
  coordinates: { latitude: number; longitude: number }[];
  duration: string;
  distance: string;
}

const modeMapping: Record<TransportationMode, string> = {
  walk: 'WALK',
  car: 'DRIVE',
  transit: 'TRANSIT',
  shuttle: 'TRANSIT',
};

export const fetchDirections = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TransportationMode
): Promise<RouteData | null> => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('Google Maps API Key is missing');
    return null;
  }

  const travelMode = modeMapping[mode] || 'WALK';
  const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;

  const requestBody = {
    origin: {
      location: {
        latLng: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
      },
    },
    travelMode: travelMode,
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
    },
    languageCode: 'en-US',
    units: 'METRIC',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Routes API error:', data.error?.message || response.statusText);
      return null;
    }

    if (!data.routes || data.routes.length === 0) {
      console.error('No routes found');
      return null;
    }

    const route = data.routes[0];
    
    // Format duration (e.g., "300s" -> "5 mins")
    const durationSeconds = parseInt(route.duration.replace('s', ''));
    const durationText = durationSeconds < 60 
      ? `${durationSeconds} secs` 
      : `${Math.round(durationSeconds / 60)} mins`;

    // Format distance (e.g., 2500 -> "2.5 km")
    const distanceKm = (route.distanceMeters / 1000).toFixed(1);
    const distanceText = `${distanceKm} km`;

    const decodedCoordinates = decode(route.polyline.encodedPolyline)
    const formattetCoordinates = decodedCoordinates.map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

    return {
      coordinates: formattetCoordinates,
      duration: durationText,
      distance: distanceText,
    };
  } catch (error) {
    console.error('Error fetching routes:', error);
    return null;
  }
};
