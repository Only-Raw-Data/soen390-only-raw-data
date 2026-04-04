import {
  POI_LIMIT,
  POI_RADIUS,
  POI_COOLDOWN_MS,
  POI_CACHE_EXPIRY,
  POI_MAP,
  getPoiInfo,
} from "../poi";

describe("poi constants", () => {
  it("exports expected numeric constants", () => {
    expect(POI_LIMIT).toBe(15);
    expect(POI_RADIUS).toBe(500);
    expect(POI_COOLDOWN_MS).toBe(3000);
    expect(POI_CACHE_EXPIRY).toBe(60 * 60 * 24 * 7);
  });

  it("POI_MAP contains entries for all supported types", () => {
    expect(POI_MAP).toHaveProperty("cafe");
    expect(POI_MAP).toHaveProperty("restaurant");
    expect(POI_MAP).toHaveProperty("fast_food");
    expect(POI_MAP).toHaveProperty("pub");
    expect(POI_MAP).toHaveProperty("bar");
    expect(POI_MAP).toHaveProperty("supermarket");
    expect(POI_MAP).toHaveProperty("convenience");
  });
});

describe("getPoiInfo", () => {
  it("returns the matching entry when the type exactly matches a key", () => {
    expect(getPoiInfo("cafe")).toEqual({ icon: "cafe", color: "#D97706" });
    expect(getPoiInfo("restaurant")).toEqual({ icon: "restaurant", color: "#EF4444" });
    expect(getPoiInfo("fast_food")).toEqual({ icon: "restaurant", color: "#EF4444" });
    expect(getPoiInfo("pub")).toEqual({ icon: "beer", color: "#8B5CF6" });
    expect(getPoiInfo("bar")).toEqual({ icon: "beer", color: "#8B5CF6" });
    expect(getPoiInfo("supermarket")).toEqual({ icon: "cart", color: "#10B981" });
    expect(getPoiInfo("convenience")).toEqual({ icon: "cart", color: "#10B981" });
  });

  it("returns the matching entry when the type contains a key (substring match)", () => {
    // e.g. overpass may return "cafe;restaurant" or "fast_food_restaurant"
    expect(getPoiInfo("fast_food_burger")).toEqual({ icon: "restaurant", color: "#EF4444" });
    expect(getPoiInfo("coffee_cafe")).toEqual({ icon: "cafe", color: "#D97706" });
    expect(getPoiInfo("supermarket_24h")).toEqual({ icon: "cart", color: "#10B981" });
  });

  it("returns the gray fallback for an unknown type", () => {
    expect(getPoiInfo("pharmacy")).toEqual({ icon: "location", color: "#6B7280" });
    expect(getPoiInfo("unknown")).toEqual({ icon: "location", color: "#6B7280" });
    expect(getPoiInfo("")).toEqual({ icon: "location", color: "#6B7280" });
  });
});
