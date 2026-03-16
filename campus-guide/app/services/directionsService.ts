import type { Campus } from "@/constants/buildings";
import {
  SHUTTLE_DISTANCE,
  SHUTTLE_DURATION,
  SHUTTLE_ROUTE_SGW_TO_LOYOLA,
} from "@/constants/shuttleRoute";
import { TransportationMode, TransitSegment, SegmentMode } from "@app/types/transportation";
import { decode } from "@googlemaps/polyline-codec";

export interface RouteData {
  coordinates: { latitude: number; longitude: number }[];
  duration: string;
  distance: string;
  segments?: TransitSegment[];
}

export interface FetchDirectionsOptions {
  startCampus?: Campus;
  destinationCampus?: Campus;
}

const modeMapping: Record<TransportationMode, string> = {
  walk: "WALK",
  car: "DRIVE",
  transit: "TRANSIT",
  shuttle: "TRANSIT",
};

export const fetchDirections = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TransportationMode,
  options?: FetchDirectionsOptions,
): Promise<RouteData | null> => {
  const { startCampus, destinationCampus } = options ?? {};

  // Shuttle: use fixed route when cross-campus; no API call
  if (
    mode === "shuttle" &&
    startCampus &&
    destinationCampus &&
    startCampus !== destinationCampus
  ) {
    const coordinates =
      startCampus === "SGW"
        ? [...SHUTTLE_ROUTE_SGW_TO_LOYOLA]
        : [...SHUTTLE_ROUTE_SGW_TO_LOYOLA].reverse();
    return {
      coordinates,
      duration: SHUTTLE_DURATION,
      distance: SHUTTLE_DISTANCE,
    };
  }

  if (mode === "shuttle") {
    return null;
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("Google Maps API Key is missing");
    return null;
  }

  const travelMode = modeMapping[mode] || "WALK";
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
    languageCode: "en-US",
    units: "METRIC",
  };

  const isTransit = travelMode === "TRANSIT"; // covers 'transit', 'rem', and 'shuttle' API calls

  const fieldMask = isTransit
    ? [
        "routes.duration",
        "routes.distanceMeters",
        "routes.polyline.encodedPolyline",
        "routes.legs.steps.travelMode",
        "routes.legs.steps.polyline.encodedPolyline",
        "routes.legs.steps.transitDetails.transitLine.vehicle.type",
        "routes.legs.steps.transitDetails.transitLine.nameShort",
      ].join(",")
    : "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Routes API error:",
        data.error?.message || response.statusText,
      );
      return null;
    }

    if (!data.routes || data.routes.length === 0) {
      // An empty routes array is a valid API outcome (not a crash-level error).
      console.warn("No routes found for request", {
        mode,
        origin,
        destination,
      });
      return null;
    }

    const route = data.routes[0];

    // Format duration (e.g., "300s" -> "5 mins")
    const durationSeconds = Number.parseInt(route.duration.replace("s", ""));
    const durationText =
      durationSeconds < 60
        ? `${durationSeconds} secs`
        : `${Math.round(durationSeconds / 60)} mins`;

    // Format distance (e.g., 2500 -> "2.5 km")
    const distanceKm = (route.distanceMeters / 1000).toFixed(1);
    const distanceText = `${distanceKm} km`;

    const decodedCoordinates = decode(route.polyline.encodedPolyline);
    const formattedCoordinates = decodedCoordinates.map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

    // Parse transit steps into typed segments
    let segments: TransitSegment[] | undefined;
    if (isTransit && route.legs) {
      segments = route.legs.flatMap((leg: any) =>
        (leg.steps ?? []).map((step: any): TransitSegment => {
          const stepCoords = step.polyline?.encodedPolyline
            ? decode(step.polyline.encodedPolyline).map(([lat, lng]) => ({
                latitude: lat,
                longitude: lng,
              }))
            : [];

          const rawMode: string = step.travelMode ?? "WALK";
          const vehicleType: string =
            step.transitDetails?.transitLine?.vehicle?.type ?? "";

          let segmentMode: SegmentMode = "WALK";
          if (rawMode === "TRANSIT") {
            const v = vehicleType.toUpperCase();
            if (v === "BUS" || v === "INTERCITY_BUS" || v === "TROLLEYBUS") {
              segmentMode = "BUS";
            } else if (v === "SUBWAY" || v === "HEAVY_RAIL" || v === "METRO_RAIL") {
              segmentMode = "SUBWAY";
            } else if (v === "TRAM" || v === "LIGHT_RAIL") {
              segmentMode = "TRAM";
            } else if (v === "RAIL" || v === "COMMUTER_TRAIN" || v === "HIGH_SPEED_TRAIN") {
              segmentMode = "RAIL";
            } else {
              segmentMode = "BUS";
            }
          }

          return {
            mode: segmentMode,
            coordinates: stepCoords,
            lineName: step.transitDetails?.transitLine?.nameShort,
          };
        })
      );
    }

    return {
      coordinates: formattedCoordinates,
      duration: durationText,
      distance: distanceText,
      ...(segments ? { segments } : {}),
    };
  } catch (error) {
    console.error("Error fetching routes:", error);
    return null;
  }
};
