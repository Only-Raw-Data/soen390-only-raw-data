import { PointOfInterest } from "../types/poi";
import { haversineDistance } from "../utils/locationUtils";
import { File, Directory, Paths } from "expo-file-system/next";
import { POI_LIMIT, POI_RADIUS, POI_CACHE_DIR, POI_CACHE_EXPIRY } from "../../constants/poi";

const OVERPASS_URL = process.env.EXPO_PUBLIC_OVERPASS_URL as string;

interface CacheData {
  timestamp: number;
  pois: PointOfInterest[];
  lat: number;
  lon: number;
  radius: number;
}

interface OverpassNode {
  lat: number;
  lon: number;
}

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function getCacheDir(): Directory {
  return new Directory(Paths.cache, POI_CACHE_DIR);
}

// Create a stable cache key based on coarse location and radius
function getCacheKey(lat: number, lon: number, radius: number): string {
  // Round to 3 decimal places (approx 110m resolution) to group nearby requests
  const coarseLat = lat.toFixed(3);
  const coarseLon = lon.toFixed(3);
  return `pois_${coarseLat}_${coarseLon}_${radius}.json`;
}

function getCacheFile(lat: number, lon: number, radius: number): File {
  return new File(getCacheDir(), getCacheKey(lat, lon, radius));
}

async function getCachedPOIs(
  lat: number,
  lon: number,
  radius: number,
): Promise<PointOfInterest[] | null> {
  try {
    const cacheFile = getCacheFile(lat, lon, radius);

    if (!cacheFile.exists) {
      return null;
    }

    const content = await cacheFile.text();
    const cached: CacheData = JSON.parse(content);

    // Check if cache is still valid
    if (Date.now() - cached.timestamp < POI_CACHE_EXPIRY * 1000) {
      return cached.pois;
    }

    return null;
  } catch {
    return null;
  }
}

async function cachePOIs(
  lat: number,
  lon: number,
  radius: number,
  pois: PointOfInterest[],
): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    if (!cacheDir.exists) {
      cacheDir.create();
    }

    const cacheFile = getCacheFile(lat, lon, radius);
    const cacheData: CacheData = {
      timestamp: Date.now(),
      pois,
      lat,
      lon,
      radius,
    };
    await cacheFile.write(JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Failed to cache POIs:", error);
  }
}

function mapOverpassElementToPOI(element: OverpassElement, userLat: number, userLon: number): PointOfInterest | null {
  const lat = element.lat || element.center?.lat;
  const lon = element.lon || element.center?.lon;

  if (!lat || !lon || !element.tags) {
    return null;
  }

  const name = element.tags.name;
  if (!name) return null; // We only want named POIs

  const type = element.tags.amenity || element.tags.shop || "unknown";
  
  // Calculate distance from user
  const distance = haversineDistance(userLat, userLon, lat, lon);

  // Construct a basic address if parts are available
  const addressParts = [];
  if (element.tags['addr:housenumber']) addressParts.push(element.tags['addr:housenumber']);
  if (element.tags['addr:street']) addressParts.push(element.tags['addr:street']);
  const address = addressParts.length > 0 ? addressParts.join(' ') : undefined;

  return {
    id: element.id,
    name,
    type,
    lat,
    lon,
    distance,
    address,
  };
}

/**
 * Fetches Points of Interest around a specific coordinate
 * @param lat Latitude
 * @param lon Longitude
 * @param radius Radius in meters
 * @param limit Maximum number of POIs to return
 * @returns Sorted array of Points of Interest
 */
export async function fetchPOIs(
  lat: number,
  lon: number,
  radius: number = POI_RADIUS,
  limit: number = POI_LIMIT
): Promise<PointOfInterest[]> {
  try {
    // 1. Check Cache
    const cached = await getCachedPOIs(lat, lon, radius);
    if (cached) {
      // Re-sort and slice to be safe, though cache should be correct
      return cached
        .map(poi => ({ ...poi, distance: haversineDistance(lat, lon, poi.lat, poi.lon) }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, limit);
    }

    const overpassUrl = process.env.EXPO_PUBLIC_OVERPASS_URL;
    if (!overpassUrl) {
      throw new Error("Overpass URL is not configured");
    }

    // 2. Fetch from Overpass API
    // We look for amenities like cafe, restaurant, fast_food, pub, bar
    // and shops like supermarket, convenience
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"cafe|restaurant|fast_food|pub|bar"](around:${radius},${lat},${lon});
        way["amenity"~"cafe|restaurant|fast_food|pub|bar"](around:${radius},${lat},${lon});
        node["shop"~"supermarket|convenience"](around:${radius},${lat},${lon});
        way["shop"~"supermarket|convenience"](around:${radius},${lat},${lon});
      );
      out center;
    `;

    const response = await fetch(overpassUrl, {
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

    // 3. Process and filter results
    const pois: PointOfInterest[] = data.elements
      .map(element => mapOverpassElementToPOI(element, lat, lon))
      .filter((poi): poi is PointOfInterest => poi !== null); // Remove nulls (unnamed or missing coords)

    // Ensure uniqueness based on ID (sometimes node and way might overlap or just distinct IDs)
    const uniquePois = Array.from(new Map(pois.map(poi => [poi.id, poi])).values());

    // 4. Sort by distance
    uniquePois.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    // 5. Cache all found within radius
    await cachePOIs(lat, lon, radius, uniquePois);

    // 6. Return limited result
    return uniquePois.slice(0, limit);
  } catch (error) {
    console.warn("Error fetching POIs:", error);
    return [];
  }
}
