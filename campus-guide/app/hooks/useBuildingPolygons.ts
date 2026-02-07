import { useState, useEffect } from "react";
import { File, Directory, Paths } from "expo-file-system/next";
import {
  Campus,
  Building,
  SGW_BUILDINGS,
  LOYOLA_BUILDINGS,
} from "@/constants/buildings";
import { BuildingPolygon } from "../types/buildingPolygon";

const OVERPASS_URL = process.env.EXPO_PUBLIC_OVERPASS_URL as string;
const CACHE_DIR_NAME = "building_polygons";
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// if (!OVERPASS_URL) {
//   throw new Error("OVERPASS_URL is not defined in environment variables");
// }

// Re-export BuildingPolygon for backwards compatibility
export { BuildingPolygon } from "../types/buildingPolygon";

interface CacheData {
  timestamp: number;
  polygons: BuildingPolygon[];
}

interface OverpassNode {
  lat: number;
  lon: number;
}

interface OverpassElement {
  type: string;
  id: number;
  geometry?: OverpassNode[];
  center?: { lat: number; lon: number };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function getCacheDir(): Directory {
  return new Directory(Paths.cache, CACHE_DIR_NAME);
}

function getCacheFile(campus: Campus): File {
  return new File(getCacheDir(), `${campus.toLowerCase()}_polygons.json`);
}

async function getCachedPolygons(
  campus: Campus,
): Promise<BuildingPolygon[] | null> {
  try {
    const cacheFile = getCacheFile(campus);

    if (!cacheFile.exists) {
      return null;
    }

    const content = await cacheFile.text();
    const cached: CacheData = JSON.parse(content);

    // Check if cache is still valid (within 7 days)
    if (Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return cached.polygons;
    }

    return null;
  } catch {
    return null;
  }
}

async function cachePolygons(
  campus: Campus,
  polygons: BuildingPolygon[],
): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    if (!cacheDir.exists) {
      cacheDir.create();
    }

    const cacheFile = getCacheFile(campus);
    const cacheData: CacheData = {
      timestamp: Date.now(),
      polygons,
    };
    await cacheFile.write(JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Failed to cache building polygons:", error);
  }
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
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

function matchBuildingsToPolygons(
  buildings: Building[],
  osmElements: OverpassElement[],
): BuildingPolygon[] {
  const polygons: BuildingPolygon[] = [];
  const usedElements = new Set<number>();

  // For each building, find the closest OSM building polygon
  for (const building of buildings) {
    let bestMatch: OverpassElement | null = null;
    let bestDistance = Infinity;

    for (const element of osmElements) {
      if (usedElements.has(element.id)) continue;
      if (!element.geometry || element.geometry.length < 3) continue;

      // Calculate center of polygon
      let centerLat = 0;
      let centerLon = 0;
      for (const node of element.geometry) {
        centerLat += node.lat;
        centerLon += node.lon;
      }
      centerLat /= element.geometry.length;
      centerLon /= element.geometry.length;

      const distance = haversineDistance(
        building.lat,
        building.lng,
        centerLat,
        centerLon,
      );

      // Only match if within 50 meters
      if (distance < bestDistance && distance < 50) {
        bestDistance = distance;
        bestMatch = element;
      }
    }

    if (bestMatch && bestMatch.geometry) {
      usedElements.add(bestMatch.id);
      polygons.push({
        buildingId: building.id,
        coordinates: bestMatch.geometry.map((node) => ({
          latitude: node.lat,
          longitude: node.lon,
        })),
      });
    }
  }

  return polygons;
}

async function fetchPolygonsFromOSM(
  campus: Campus,
): Promise<BuildingPolygon[]> {
  const buildings = campus === "SGW" ? SGW_BUILDINGS : LOYOLA_BUILDINGS;

  // Define bounding boxes for each campus with some padding
  const bbox =
    campus === "SGW"
      ? "45.492,-73.583,45.500,-73.573" // SGW campus area
      : "45.454,-73.645,45.462,-73.636"; // Loyola campus area

  const query = `
        [out:json][timeout:25];
        (
            way["building"](${bbox});
            relation["building"](${bbox});
        );
        out geom;
    `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data: OverpassResponse = await response.json();
    return matchBuildingsToPolygons(buildings, data.elements);
  } catch (error) {
    console.warn("Failed to fetch building polygons from OSM:", error);
    return [];
  }
}

export function useBuildingPolygons(campus: Campus) {
  const [polygons, setPolygons] = useState<BuildingPolygon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPolygons() {
      setLoading(true);
      setError(null);

      try {
        // Check cache first
        const cached = await getCachedPolygons(campus);
        if (cached && cached.length > 0) {
          if (!cancelled) {
            setPolygons(cached);
            setLoading(false);
          }
          return;
        }

        // Fetch from OpenStreetMap
        const fetched = await fetchPolygonsFromOSM(campus);

        if (!cancelled) {
          setPolygons(fetched);
          setLoading(false);

          // Cache results if we got any
          if (fetched.length > 0) {
            await cachePolygons(campus, fetched);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setLoading(false);
        }
      }
    }

    loadPolygons();

    return () => {
      cancelled = true;
    };
  }, [campus]);

  return { polygons, loading, error };
}
