import type { Campus } from "@/constants/buildings";
import { SGW_BUILDINGS, LOYOLA_BUILDINGS } from "@/constants/buildings";
import {
  SHUTTLE_DISTANCE,
  SHUTTLE_DURATION,
  SHUTTLE_ROUTE_SGW_TO_LOYOLA,
} from "@/constants/shuttleRoute";
import { TransportationMode, TransitSegment, SegmentMode } from "@app/types/transportation";
import { decode } from "@googlemaps/polyline-codec";

export interface ShuttleStop {
  latitude: number;
  longitude: number;
  name: string;
}

export interface RouteData {
  coordinates: { latitude: number; longitude: number }[];
  duration: string;
  distance: string;
  segments?: TransitSegment[];
  shuttleStops?: { departure: ShuttleStop; arrival: ShuttleStop };
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

/** Given one campus, returns the other (SGW ↔ Loyola). Returns undefined for unknown values. */
function inferOppositeCampus(campus: Campus | undefined): Campus | undefined {
  if (campus === "Loyola") return "SGW";
  if (campus === "SGW") return "Loyola";
  return undefined;
}

function straightLine(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): { latitude: number; longitude: number }[] {
  return [
    { latitude: from.lat, longitude: from.lng },
    { latitude: to.lat, longitude: to.lng },
  ];
}

async function fetchShuttleRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  effectiveStartCampus: Campus,
  destinationCampus: Campus,
): Promise<RouteData | null> {
  const hallBuilding = SGW_BUILDINGS.find((b) => b.id === "h");
  const vanierBuilding = LOYOLA_BUILDINGS.find((b) => b.id === "vl");

  if (!hallBuilding || !vanierBuilding) {
    const coordinates =
      effectiveStartCampus === "SGW"
        ? [...SHUTTLE_ROUTE_SGW_TO_LOYOLA]
        : [...SHUTTLE_ROUTE_SGW_TO_LOYOLA].reverse();
    return { coordinates, duration: SHUTTLE_DURATION, distance: SHUTTLE_DISTANCE };
  }

  const departureStop =
    effectiveStartCampus === "SGW"
      ? { lat: hallBuilding.lat, lng: hallBuilding.lng }
      : { lat: vanierBuilding.lat, lng: vanierBuilding.lng };
  const arrivalStop =
    effectiveStartCampus === "SGW"
      ? { lat: vanierBuilding.lat, lng: vanierBuilding.lng }
      : { lat: hallBuilding.lat, lng: hallBuilding.lng };

  const shuttleCoords =
    effectiveStartCampus === "SGW"
      ? [...SHUTTLE_ROUTE_SGW_TO_LOYOLA]
      : [...SHUTTLE_ROUTE_SGW_TO_LOYOLA].reverse();

  let walkToStop: RouteData | null = null;
  let walkFromStop: RouteData | null = null;
  try {
    [walkToStop, walkFromStop] = await Promise.all([
      fetchDirections(origin, departureStop, "walk"),
      fetchDirections(arrivalStop, destination, "walk"),
    ]);
  } catch (error) {
    console.warn(
      "[directionsService] Failed to fetch shuttle walking legs — falling back to straight-line segments:",
      error,
    );
  }

  const walkToCoords =
    walkToStop && walkToStop.coordinates.length > 0
      ? walkToStop.coordinates
      : straightLine(origin, departureStop);

  const walkFromCoords =
    walkFromStop && walkFromStop.coordinates.length > 0
      ? walkFromStop.coordinates
      : straightLine(arrivalStop, destination);

  const segments: TransitSegment[] = [
    { mode: "WALK", coordinates: walkToCoords },
    { mode: "SHUTTLE", coordinates: shuttleCoords },
    { mode: "WALK", coordinates: walkFromCoords },
  ];

  const departureName =
    effectiveStartCampus === "SGW" ? hallBuilding.name : vanierBuilding.name;
  const arrivalName =
    effectiveStartCampus === "SGW" ? vanierBuilding.name : hallBuilding.name;

  return {
    coordinates: segments.flatMap((s) => s.coordinates),
    duration: SHUTTLE_DURATION,
    distance: SHUTTLE_DISTANCE,
    segments,
    shuttleStops: {
      departure: {
        latitude: departureStop.lat,
        longitude: departureStop.lng,
        name: departureName,
      },
      arrival: {
        latitude: arrivalStop.lat,
        longitude: arrivalStop.lng,
        name: arrivalName,
      },
    },
  };
}

function classifyVehicleType(vehicleType: string): SegmentMode {
  const v = vehicleType.toUpperCase();
  if (v === "BUS" || v === "INTERCITY_BUS" || v === "TROLLEYBUS") return "BUS";
  if (v === "SUBWAY" || v === "HEAVY_RAIL" || v === "METRO_RAIL") return "SUBWAY";
  if (v === "TRAM" || v === "LIGHT_RAIL") return "TRAM";
  if (v === "RAIL" || v === "COMMUTER_TRAIN" || v === "HIGH_SPEED_TRAIN") return "RAIL";
  return "BUS";
}

function parseTransitSegments(route: any): TransitSegment[] {
  return (route.legs ?? []).flatMap((leg: any) =>
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

      const segmentMode: SegmentMode =
        rawMode === "TRANSIT" ? classifyVehicleType(vehicleType) : "WALK";

      return {
        mode: segmentMode,
        coordinates: stepCoords,
        lineName: step.transitDetails?.transitLine?.nameShort,
      };
    }),
  );
}

export const fetchDirections = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mode: TransportationMode,
  options?: FetchDirectionsOptions,
): Promise<RouteData | null> => {
  const { startCampus, destinationCampus } = options ?? {};

  const effectiveStartCampus: Campus | undefined =
    startCampus ?? inferOppositeCampus(destinationCampus);

  if (
    mode === "shuttle" &&
    effectiveStartCampus &&
    destinationCampus &&
    effectiveStartCampus !== destinationCampus
  ) {
    return fetchShuttleRoute(origin, destination, effectiveStartCampus, destinationCampus);
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

  const isTransit = travelMode === "TRANSIT";

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
      console.warn("No routes found for request", {
        mode,
        origin,
        destination,
      });
      return null;
    }

    const route = data.routes[0];

    const durationSeconds = Number.parseInt(route.duration.replace("s", ""));
    const durationText =
      durationSeconds < 60
        ? `${durationSeconds} secs`
        : `${Math.round(durationSeconds / 60)} mins`;

    const distanceKm = (route.distanceMeters / 1000).toFixed(1);
    const distanceText = `${distanceKm} km`;

    const decodedCoordinates = decode(route.polyline.encodedPolyline);
    const formattedCoordinates = decodedCoordinates.map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

    const segments: TransitSegment[] | undefined =
      isTransit && route.legs ? parseTransitSegments(route) : undefined;

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
