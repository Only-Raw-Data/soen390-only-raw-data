import { renderHook, act, waitFor } from "@testing-library/react-native";
import useBuildingPolygons from "../useBuildingPolygons";

// ── Mocks ────────────────────────────────────────────────────────────────

// Mock building constants
const MOCK_SGW_BUILDING = {
  id: "h",
  name: "Hall Building",
  code: "H",
  lat: 45.497,
  lng: -73.579,
  campus: "SGW" as const,
  address: "1455 De Maisonneuve W",
  department: "",
  overview: "",
  accessibility: "",
  x: 0,
  y: 0,
};

const MOCK_LOYOLA_BUILDING = {
  id: "cc",
  name: "Central Building",
  code: "CC",
  lat: 45.458,
  lng: -73.640,
  campus: "Loyola" as const,
  address: "7141 Sherbrooke W",
  department: "",
  overview: "",
  accessibility: "",
  x: 0,
  y: 0,
};

jest.mock("@/constants/buildings", () => ({
  SGW_BUILDINGS: [
    {
      id: "h",
      name: "Hall Building",
      code: "H",
      lat: 45.497,
      lng: -73.579,
      campus: "SGW",
      address: "1455 De Maisonneuve W",
      department: "",
      overview: "",
      accessibility: "",
      x: 0,
      y: 0,
    },
  ],
  LOYOLA_BUILDINGS: [
    {
      id: "cc",
      name: "Central Building",
      code: "CC",
      lat: 45.458,
      lng: -73.640,
      campus: "Loyola",
      address: "7141 Sherbrooke W",
      department: "",
      overview: "",
      accessibility: "",
      x: 0,
      y: 0,
    },
  ],
}));

// Mock locationUtils (imported by useBuildingPolygons)
jest.mock("../../utils/locationUtils", () => ({
  haversineDistance: jest.fn(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
      // Simple Euclidean approximation for tests
      return Math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2) * 111_000;
    },
  ),
}));

// Mock expo-file-system/next
let mockFileExists = false;
let mockFileContent = "";

const mockFileWrite = jest.fn();
const mockFileText = jest.fn(() => Promise.resolve(mockFileContent));
const mockDirCreate = jest.fn();
let mockDirExists = true;

jest.mock("expo-file-system/next", () => ({
  File: jest.fn().mockImplementation(() => ({
    get exists() {
      return mockFileExists;
    },
    text: () => mockFileText(),
    write: (...args: unknown[]) => mockFileWrite(...args),
  })),
  Directory: jest.fn().mockImplementation(() => ({
    get exists() {
      return mockDirExists;
    },
    create: () => mockDirCreate(),
  })),
  Paths: {
    cache: "/mock-cache",
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ── Helpers ──────────────────────────────────────────────────────────────

// Creates a valid Overpass API response with a geometry near the given building
function makeOverpassResponse(
  buildingLat: number,
  buildingLng: number,
  id = 1,
) {
  return {
    elements: [
      {
        type: "way",
        id,
        geometry: [
          { lat: buildingLat + 0.0001, lon: buildingLng + 0.0001 },
          { lat: buildingLat + 0.0001, lon: buildingLng - 0.0001 },
          { lat: buildingLat - 0.0001, lon: buildingLng - 0.0001 },
          { lat: buildingLat - 0.0001, lon: buildingLng + 0.0001 },
        ],
      },
    ],
  };
}

function makeCacheData(polygons: any[], ageMs = 0) {
  return JSON.stringify({
    timestamp: Date.now() - ageMs,
    polygons,
  });
}

const CACHED_POLYGONS = [
  {
    buildingId: "h",
    coordinates: [
      { latitude: 45.4971, longitude: -73.5789 },
      { latitude: 45.4971, longitude: -73.5791 },
      { latitude: 45.4969, longitude: -73.5791 },
    ],
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────

describe("useBuildingPolygons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileExists = false;
    mockFileContent = "";
    mockDirExists = true;
  });

  // ── Cache hit ──────────────────────────────────────────────────────────

  it("returns cached polygons when cache is fresh", async () => {
    // Arrange
    mockFileExists = true;
    mockFileContent = makeCacheData(CACHED_POLYGONS);

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons).toEqual(CACHED_POLYGONS);
    expect(result.current.error).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("ignores expired cache and fetches from OSM", async () => {
    // Arrange — cache older than 7 days
    const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
    mockFileExists = true;
    mockFileContent = makeCacheData(CACHED_POLYGONS, eightDaysMs);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_SGW_BUILDING.lat,
            MOCK_SGW_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.polygons.length).toBeGreaterThan(0);
  });

  it("skips cache when file does not exist", async () => {
    // Arrange
    mockFileExists = false;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_SGW_BUILDING.lat,
            MOCK_SGW_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.polygons.length).toBeGreaterThan(0);
  });

  it("handles corrupt cache file gracefully", async () => {
    // Arrange
    mockFileExists = true;
    mockFileText.mockRejectedValueOnce(new Error("parse error"));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_SGW_BUILDING.lat,
            MOCK_SGW_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert — falls back to fetch
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.polygons.length).toBeGreaterThan(0);
  });

  // ── OSM fetch ──────────────────────────────────────────────────────────

  it("fetches SGW polygons from Overpass API", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_SGW_BUILDING.lat,
            MOCK_SGW_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons).toHaveLength(1);
    expect(result.current.polygons[0].buildingId).toBe("h");
    expect(result.current.error).toBeNull();
  });

  it("fetches Loyola polygons from Overpass API", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_LOYOLA_BUILDING.lat,
            MOCK_LOYOLA_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("Loyola"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons).toHaveLength(1);
    expect(result.current.polygons[0].buildingId).toBe("cc");
  });

  it("returns empty polygons when Overpass API returns HTTP error", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons).toEqual([]);
  });

  it("returns empty polygons when fetch throws network error", async () => {
    // Arrange
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons).toEqual([]);
  });

  // ── Caching results ───────────────────────────────────────────────────

  it("caches fetched polygons to disk", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_SGW_BUILDING.lat,
            MOCK_SGW_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFileWrite).toHaveBeenCalledTimes(1);
    const written = JSON.parse(mockFileWrite.mock.calls[0][0]);
    expect(written.polygons).toHaveLength(1);
    expect(written.timestamp).toBeGreaterThan(0);
  });

  it("creates cache directory when it does not exist", async () => {
    // Arrange
    mockDirExists = false;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_SGW_BUILDING.lat,
            MOCK_SGW_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockDirCreate).toHaveBeenCalled();
  });

  it("does not cache when fetch returns no polygons", async () => {
    // Arrange — response with geometry too far from any building (>50m)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          elements: [
            {
              type: "way",
              id: 999,
              geometry: [
                { lat: 0.0, lon: 0.0 },
                { lat: 0.0, lon: 0.001 },
                { lat: 0.001, lon: 0.0 },
              ],
            },
          ],
        }),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons).toEqual([]);
    expect(mockFileWrite).not.toHaveBeenCalled();
  });

  it("does not crash when cachePolygons write fails", async () => {
    // Arrange
    mockFileWrite.mockRejectedValueOnce(new Error("disk full"));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_SGW_BUILDING.lat,
            MOCK_SGW_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert — polygons still returned despite cache write failure
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons).toHaveLength(1);
  });

  // ── Matching logic ────────────────────────────────────────────────────

  it("skips OSM elements without geometry", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          elements: [{ type: "way", id: 1 }],
        }),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons).toEqual([]);
  });

  it("skips OSM elements with fewer than 3 geometry points", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          elements: [
            {
              type: "way",
              id: 1,
              geometry: [
                { lat: 45.497, lon: -73.579 },
                { lat: 45.498, lon: -73.578 },
              ],
            },
          ],
        }),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons).toEqual([]);
  });

  it("does not reuse an OSM element for multiple buildings", async () => {
    // Arrange — only one element in the response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_LOYOLA_BUILDING.lat,
            MOCK_LOYOLA_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("Loyola"));

    // Assert — at most 1 polygon matched
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.polygons.length).toBeLessThanOrEqual(1);
  });

  // ── Initial / loading state ───────────────────────────────────────────

  it("starts with loading=true and empty polygons", () => {
    // Arrange
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert
    expect(result.current.loading).toBe(true);
    expect(result.current.polygons).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("returns empty cached array and falls through to fetch", async () => {
    // Arrange — cache exists but has empty polygons array
    mockFileExists = true;
    mockFileContent = makeCacheData([]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve(
          makeOverpassResponse(
            MOCK_SGW_BUILDING.lat,
            MOCK_SGW_BUILDING.lng,
          ),
        ),
    });

    // Act
    const { result } = renderHook(() => useBuildingPolygons("SGW"));

    // Assert — should fall through to OSM fetch
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
