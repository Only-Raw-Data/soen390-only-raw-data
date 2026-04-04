export const POI_LIMIT = 15;
export const POI_RADIUS = 500;
export const POI_COOLDOWN_MS = 3000;
export const POI_INITIAL_SEARCH_CENTER = { lat: 45.4972, lon: -73.5792 };
export const POI_INITIAL_SEARCH_RADIUS = 1000;
export const POI_CACHE_DIR = "poi_cache";
export const POI_CACHE_FILE = "poi_cache.json";
export const POI_CACHE_EXPIRY = 60 * 60 * 24 * 7; // 7 days
export const POI_CACHE_PATH = `${POI_CACHE_DIR}/${POI_CACHE_FILE}`;
export const POI_CACHE_KEY = "poi_cache";

export const POI_MAP = {
  cafe: { icon: "cafe", color: "#D97706" }, // Amber
  restaurant: { icon: "restaurant", color: "#EF4444" }, // Red
  fast_food: { icon: "restaurant", color: "#EF4444" }, // Red
  pub: { icon: "beer", color: "#8B5CF6" }, // Purple
  bar: { icon: "beer", color: "#8B5CF6" }, // Purple
  supermarket: { icon: "cart", color: "#10B981" }, // Green
  convenience: { icon: "cart", color: "#10B981" }, // Green
} as const;

export const getPoiInfo = (type: string) => {
  const match = Object.entries(POI_MAP).find(([key]) => type.includes(key));
  if (match) {
    return match[1];
  }
  return { icon: "location", color: "#6B7280" } as const; // Gray fallback
};