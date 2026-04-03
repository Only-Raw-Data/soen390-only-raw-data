import {
  SHUTTLE_DISTANCE,
  SHUTTLE_DURATION,
  SHUTTLE_ROUTE_SGW_TO_LOYOLA,
} from "@/constants/shuttleRoute";
import { fetchDirections } from "../directionsService";
import { TransportationMode } from "@app/types/transportation";

// Mock fetch
globalThis.fetch = jest.fn();

const SAMPLE_POLYLINE = "a~l~Fjk~uOnA?jxD";
const SAMPLE_ORIGIN = { lat: 45.4971, lng: -73.5791 };
const SAMPLE_DEST   = { lat: 45.4953, lng: -73.5782 };

function mockRoute(overrides: Record<string, unknown> = {}) {
  return {
    polyline: { encodedPolyline: SAMPLE_POLYLINE },
    duration: "600s",
    distanceMeters: 2500,
    ...overrides,
  };
}

function mockFetchOk(routeOverrides: Record<string, unknown> = {}) {
  (globalThis.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ routes: [mockRoute(routeOverrides)] }),
  });
}

function callFetchDirections(mode: TransportationMode = "walk") {
  return fetchDirections(SAMPLE_ORIGIN, SAMPLE_DEST, mode);
}

function makeTransitStepResponse(steps: unknown[]) {
  return mockRoute({ legs: [{ steps }] });
}

function makeVehicleStep(vehicleType: string) {
  return {
    travelMode: "TRANSIT",
    polyline: { encodedPolyline: SAMPLE_POLYLINE },
    transitDetails: { transitLine: { vehicle: { type: vehicleType } } },
  };
}

describe("directionsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = "test-api-key";
  });

  it("fetches directions successfully using Routes API v2", async () => {
    // Arrange
    mockFetchOk();

    // Act
    const result = await callFetchDirections("walk");

    // Assert
    expect(result).not.toBeNull();
    expect(result?.duration).toBe("10 mins");
    expect(result?.distance).toBe("2.5 km");
    expect(result?.coordinates.length).toBeGreaterThan(0);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Goog-Api-Key": "test-api-key",
          "X-Goog-FieldMask": expect.any(String),
        }),
      }),
    );
  });

  it("handles API errors with Routes API v2", async () => {
    // Arrange
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: "Unauthorized",
      json: jest.fn().mockResolvedValue({ error: { message: "Invalid API Key" } }),
    });

    // Act & Assert
    expect(await fetchDirections({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }, "walk")).toBeNull();
  });

  it("handles network errors", async () => {
    // Arrange
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    // Act & Assert
    expect(await callFetchDirections()).toBeNull();
  });

  it("returns null when API key is missing", async () => {
    // Arrange
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    // Act & Assert
    expect(await callFetchDirections()).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns null when no routes are found", async () => {
    // Arrange
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ routes: [] }),
    });

    // Act & Assert
    expect(await callFetchDirections()).toBeNull();
  });

  it("formats duration in seconds when under 60 seconds", async () => {
    // Arrange
    mockFetchOk({ duration: "45s", distanceMeters: 100 });

    // Act
    const result = await callFetchDirections();

    // Assert
    expect(result?.duration).toBe("45 secs");
  });

  it.each([
    { mode: "car" as const, expectedTravelMode: "DRIVE" },
    { mode: "transit" as const, expectedTravelMode: "TRANSIT" },
  ])(
    "uses $expectedTravelMode mode for $mode transportation",
    async ({ mode, expectedTravelMode }) => {
      // Arrange
      mockFetchOk({ duration: "300s", distanceMeters: 5000 });

      // Act
      await callFetchDirections(mode);

      // Assert
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(`"travelMode":"${expectedTravelMode}"`),
        }),
      );
    },
  );

  describe("shuttle mode", () => {
    it("returns walk+shuttle+walk segments for cross-campus SGW to Loyola", async () => {
      // Arrange
      const origin = { lat: 45.497092, lng: -73.5788 };
      const destination = { lat: 45.4585, lng: -73.639 };
      const options = { startCampus: "SGW" as const, destinationCampus: "Loyola" as const };

      // Act
      const result = await fetchDirections(origin, destination, "shuttle", options);

      // Assert — walking legs attempt API calls (2 fetches); failures use straight-line fallback
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(result).not.toBeNull();
      expect(result?.duration).toBe(SHUTTLE_DURATION);
      expect(result?.distance).toBe(SHUTTLE_DISTANCE);
      // Three segments: walk to boarding stop, shuttle bus, walk to destination
      expect(result?.segments).toHaveLength(3);
      expect(result?.segments?.[0].mode).toBe("WALK");
      expect(result?.segments?.[1].mode).toBe("SHUTTLE");
      expect(result?.segments?.[2].mode).toBe("WALK");
      expect(result?.segments?.[1].coordinates).toEqual(SHUTTLE_ROUTE_SGW_TO_LOYOLA);
      expect(result?.shuttleStops).toBeDefined();
    });

    it("returns walk+shuttle+walk segments for cross-campus Loyola to SGW with reversed polyline", async () => {
      // Arrange
      const origin = { lat: 45.4585, lng: -73.639 };
      const destination = { lat: 45.497092, lng: -73.5788 };
      const options = { startCampus: "Loyola" as const, destinationCampus: "SGW" as const };

      // Act
      const result = await fetchDirections(origin, destination, "shuttle", options);

      // Assert — walking legs attempt API calls (2 fetches); failures use straight-line fallback
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(result).not.toBeNull();
      expect(result?.duration).toBe(SHUTTLE_DURATION);
      expect(result?.distance).toBe(SHUTTLE_DISTANCE);
      expect(result?.segments).toHaveLength(3);
      expect(result?.segments?.[0].mode).toBe("WALK");
      expect(result?.segments?.[1].mode).toBe("SHUTTLE");
      expect(result?.segments?.[2].mode).toBe("WALK");
      const expectedReversed = [...SHUTTLE_ROUTE_SGW_TO_LOYOLA].reverse();
      expect(result?.segments?.[1].coordinates).toEqual(expectedReversed);
      expect(result?.shuttleStops).toBeDefined();
    });

    it("returns null for shuttle same-campus without calling API", async () => {
      // Arrange
      const options = { startCampus: "SGW" as const, destinationCampus: "SGW" as const };

      // Act
      const result = await fetchDirections(
        { lat: 45.497092, lng: -73.5788 },
        { lat: 45.496, lng: -73.579 },
        "shuttle",
        options,
      );

      // Assert
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("returns null for shuttle when options are not provided", async () => {
      // Arrange
      const origin = { lat: 45.497092, lng: -73.5788 };
      const destination = { lat: 45.4585, lng: -73.639 };

      // Act
      const result = await fetchDirections(origin, destination, "shuttle");

      // Assert
      expect(globalThis.fetch).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("transit segment parsing", () => {
    it("requests step-level field mask for transit mode", async () => {
      // Arrange
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ routes: [mockRoute({ legs: [] })] }),
      });

      // Act
      await callFetchDirections("transit");

      // Assert
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Goog-FieldMask": expect.stringContaining("routes.legs.steps.travelMode"),
          }),
        }),
      );
    });

    it("does not request step-level fields for non-transit modes", async () => {
      // Arrange
      mockFetchOk({ duration: "300s", distanceMeters: 1000 });

      // Act
      await callFetchDirections("walk");

      // Assert
      const calledWith = (globalThis.fetch as jest.Mock).mock.calls[0][1];
      expect(calledWith.headers["X-Goog-FieldMask"]).not.toContain("legs.steps");
    });

    it("parses walk and bus steps into typed segments", async () => {
      // Arrange
      const steps = [
        { travelMode: "WALK", polyline: { encodedPolyline: SAMPLE_POLYLINE } },
        {
          travelMode: "TRANSIT",
          polyline: { encodedPolyline: SAMPLE_POLYLINE },
          transitDetails: { transitLine: { vehicle: { type: "BUS" }, nameShort: "80" } },
        },
      ];
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ routes: [makeTransitStepResponse(steps)] }),
      });

      // Act
      const result = await callFetchDirections("transit");

      // Assert
      expect(result?.segments).toHaveLength(2);
      expect(result?.segments?.[0].mode).toBe("WALK");
      expect(result?.segments?.[1].mode).toBe("BUS");
      expect(result?.segments?.[1].lineName).toBe("80");
    });

    it.each([
      { vehicleType: "SUBWAY",        expected: "SUBWAY" },
      { vehicleType: "METRO_RAIL",    expected: "SUBWAY" },
      { vehicleType: "TRAM",          expected: "TRAM"   },
      { vehicleType: "LIGHT_RAIL",    expected: "TRAM"   },
      { vehicleType: "RAIL",          expected: "RAIL"   },
      { vehicleType: "COMMUTER_TRAIN",expected: "RAIL"   },
      { vehicleType: "INTERCITY_BUS", expected: "BUS"    },
      { vehicleType: "UNKNOWN_VEHICLE",expected: "BUS"   },
    ])("classifies $vehicleType as $expected segment mode", async ({ vehicleType, expected }) => {
      // Arrange
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          routes: [makeTransitStepResponse([makeVehicleStep(vehicleType)])],
        }),
      });

      // Act
      const result = await callFetchDirections("transit");

      // Assert
      expect(result?.segments?.[0].mode).toBe(expected);
    });

    it("returns no segments when transit response has no legs", async () => {
      // Arrange
      mockFetchOk();

      // Act
      const result = await callFetchDirections("transit");

      // Assert
      expect(result?.segments).toBeUndefined();
    });

    it("returns no segments for non-transit modes", async () => {
      // Arrange
      mockFetchOk({ duration: "300s", distanceMeters: 1000 });

      // Act
      const result = await callFetchDirections("car");

      // Assert
      expect(result?.segments).toBeUndefined();
    });

    it("handles step with missing polyline gracefully", async () => {
      // Arrange
      (globalThis.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          routes: [makeTransitStepResponse([{ travelMode: "WALK" }])],
        }),
      });

      // Act
      const result = await callFetchDirections("transit");

      // Assert
      expect(result?.segments?.[0].coordinates).toEqual([]);
    });
  });

  it("returns null when routes array is undefined", async () => {
    // Arrange
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    // Act & Assert
    expect(await callFetchDirections()).toBeNull();
  });
});
