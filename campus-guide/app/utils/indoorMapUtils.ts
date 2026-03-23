import { IndoorFeature } from "@app/types/indoorMap";

export function shouldLogIndoorMapDebug() {
  return process.env.NODE_ENV !== "test" || process.env.INDOOR_MAP_DEBUG === "1";
}

export function hasNoCoordinates(coords: { latitude: number; longitude: number }[]) {
  return coords.length === 0;
}

export function getPolygonCentroid(coords: { latitude: number; longitude: number }[]) {
  let latSum = 0;
  let lngSum = 0;
  for (const c of coords) {
    latSum += c.latitude;
    lngSum += c.longitude;
  }
  return {
    latitude: latSum / coords.length,
    longitude: lngSum / coords.length,
  };
}

export function shortLabel(roomRef: string): string {
  return roomRef.replace(/^[A-Z]+S?/i, "");
}

export function convertCoordinates(feature: IndoorFeature): { latitude: number; longitude: number }[] {
  if (feature.geometry.type !== "Polygon") return [];
  const coords = feature.geometry.coordinates as number[][][];
  return coords[0].map((coord) => ({
    latitude: coord[1],
    longitude: coord[0],
  }));
}

export function getPointCoordinate(feature: IndoorFeature): { latitude: number; longitude: number } | null {
  if (feature.geometry.type !== "Point") return null;
  const coords = feature.geometry.coordinates as number[];
  if (coords.length < 2) return null;
  return { latitude: coords[1], longitude: coords[0] };
}

export function logIndoorMapRender(info: object) {
  if (shouldLogIndoorMapDebug()) {
    console.log("[IndoorMapView] RENDER", info);
  }
}

export function handleMapReady() {
  if (shouldLogIndoorMapDebug()) {
    console.log("[IndoorMapView] MAP READY");
  }
}

export const ROOM_STYLE_START = { fill: "rgba(22, 163, 74, 0.4)", stroke: "#16A34A", width: 3 };
export const ROOM_STYLE_DESTINATION = { fill: "rgba(37, 99, 235, 0.4)", stroke: "#2563EB", width: 3 };
export const ROOM_STYLE_HIGHLIGHTED = { fill: "rgba(37, 99, 235, 0.4)", stroke: "#2563EB", width: 3 };
export const ROOM_STYLE_DEFAULT = { fill: "rgba(145, 35, 56, 0.15)", stroke: "#912338", width: 1 };
export const ELEVATOR_LABEL = "EL";
export const STAIRCASE_LABEL = "ST";

export const AMENITY_CONFIG: Record<string, {
  label: string;
  displayName: string;
  fillColor: string;
  strokeColor: string;
  bgColor: string;
}> = {
  toilets: { label: "\u{1F6BB}", displayName: "Washroom", fillColor: "#3B82F659", strokeColor: "#3B82F6", bgColor: "#3B82F6" },
  fountain: { label: "\u{1F4A7}", displayName: "Water Fountain", fillColor: "#06B6D459", strokeColor: "#06B6D4", bgColor: "#06B6D4" },
  vending_machine: { label: "VM", displayName: "Vending Machine", fillColor: "#A855F759", strokeColor: "#A855F7", bgColor: "#A855F7" },
  eating_area: { label: "\u{1F37D}\uFE0F", displayName: "Eating Area", fillColor: "#F9731659", strokeColor: "#F97316", bgColor: "#F97316" },
  information: { label: "\u2139\uFE0F", displayName: "Information", fillColor: "#14B8A659", strokeColor: "#14B8A6", bgColor: "#14B8A6" },
  printer: { label: "\u{1F5A8}\uFE0F", displayName: "Printer", fillColor: "#6B728059", strokeColor: "#6B7280", bgColor: "#6B7280" },
  fire_station: { label: "\u{1F9EF}", displayName: "Fire Station", fillColor: "#EF444459", strokeColor: "#EF4444", bgColor: "#EF4444" },
};
