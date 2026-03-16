import { fetchPOIs } from "../poiService";
import { haversineDistance } from "../../utils/locationUtils";
import { File, Directory } from "expo-file-system/next";

// Mock the native modules
jest.mock('expo-file-system/next', () => {
  return {
    Directory: jest.fn().mockImplementation(() => ({
      exists: true,
      create: jest.fn(),
    })),
    Paths: {
      cache: 'mock-cache-path'
    },
    File: jest.fn().mockImplementation(() => ({
      exists: false,
      text: jest.fn().mockResolvedValue('{}'),
      write: jest.fn().mockResolvedValue(true),
    }))
  };
});

// Mock the locationUtils
jest.mock("../../utils/locationUtils", () => ({
  haversineDistance: jest.fn().mockImplementation((lat1, lon1, lat2, lon2) => {
    // Simple mock distance for testing sorting
    return Math.abs(lat1 - lat2) * 1000 + Math.abs(lon1 - lon2) * 1000;
  })
}));

describe("fetchPOIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.EXPO_PUBLIC_OVERPASS_URL = "https://mock-overpass.api";
  });

  it("should fetch and parse POIs successfully", async () => {
    const mockResponse = {
      elements: [
        {
          type: "node",
          id: 1,
          lat: 45.4975,
          lon: -73.5780,
          tags: {
            name: "Mock Cafe",
            amenity: "cafe",
          }
        },
        {
          type: "way",
          id: 2,
          center: { lat: 45.4980, lon: -73.5775 },
          tags: {
            name: "Mock Restaurant",
            amenity: "restaurant",
            "addr:housenumber": "123",
            "addr:street": "Main St"
          }
        },
        {
          type: "node", // No name, should be filtered out
          id: 3,
          lat: 45.4970,
          lon: -73.5790,
          tags: {
            amenity: "pub"
          }
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const pois = await fetchPOIs(45.497092, -73.5788, 500, 10);

    // Should only have 2 POIs (the one without a name should be excluded)
    expect(pois).toHaveLength(2);
    
    // Check first POI details
    expect(pois[0].name).toBe("Mock Cafe");
    expect(pois[0].type).toBe("cafe");
    // Verify distance calculation and sorting occurred
    expect(haversineDistance).toHaveBeenCalled();
  });

  it("should handle API errors gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const pois = await fetchPOIs(45.497092, -73.5788, 500, 10);
    expect(pois).toEqual([]);
  });

  it("should use cache if available", async () => {
    const mockCachedPOIs = {
      timestamp: Date.now(), // Valid cache
      pois: [
        { id: 10, name: "Cached Place", type: "bar", lat: 45.5, lon: -73.6, distance: 100 }
      ],
      lat: 45.497,
      lon: -73.579,
      radius: 500
    };

    // Override File mock for this test
    const mockText = jest.fn().mockResolvedValue(JSON.stringify(mockCachedPOIs));
    (File as unknown as jest.Mock).mockImplementationOnce(() => ({
      exists: true,
      text: mockText,
    }));

    const pois = await fetchPOIs(45.497092, -73.5788, 500, 10);
    
    expect(mockText).toHaveBeenCalled();
    expect(pois).toHaveLength(1);
    expect(pois[0].name).toBe("Cached Place");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should create cache directory if it does not exist", async () => {
    const mockCreate = jest.fn();
    (Directory as unknown as jest.Mock).mockImplementation(() => ({
      exists: false,
      create: mockCreate,
    }));
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] }),
    });

    await fetchPOIs(45.497092, -73.5788);
    expect(mockCreate).toHaveBeenCalled();
  });

  it("should handle cache read JSON parse errors silently", async () => {
    const mockText = jest.fn().mockResolvedValue("{ bad json }");
    (File as unknown as jest.Mock).mockImplementation(() => ({
      exists: true,
      text: mockText,
      write: jest.fn().mockResolvedValue(true),
    }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] }),
    });

    const pois = await fetchPOIs(45.497, -73.578);
    // Since cache read fails, it fetches from network
    expect(global.fetch).toHaveBeenCalled();
    expect(pois).toEqual([]);
  });

  it("should handle cache write errors silently", async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    (File as unknown as jest.Mock).mockImplementation(() => ({
      exists: false,
      text: jest.fn().mockResolvedValue("{}"),
      write: jest.fn().mockRejectedValue(new Error("Write error")),
    }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ elements: [] }),
    });

    await fetchPOIs(45.497, -73.578);
    expect(console.warn).toHaveBeenCalledWith("Failed to cache POIs:", expect.any(Error));
  });

  it("should throw if Overpass URL is not configured", async () => {
    delete process.env.EXPO_PUBLIC_OVERPASS_URL;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    const pois = await fetchPOIs(45.497, -73.578);
    expect(pois).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith("Error fetching POIs:", expect.any(Error));
  });

  it("should skip nodes without lat/lon or tags", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { type: "node", id: 1, tags: { name: "Test" } }, // missing coords
          { type: "node", id: 2, lat: 45.5, lon: -73.5 } // missing tags
        ]
      }),
    });

    const pois = await fetchPOIs(45.497, -73.578);
    expect(pois).toEqual([]);
  });
});
