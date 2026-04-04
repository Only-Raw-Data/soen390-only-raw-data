import { planCrossBuildingRoute, planCrossBuildingRouteFromGps } from "../crossBuildingRouteService";
import { fetchDirections } from "../directionsService";

// Mock the directions service
jest.mock("../directionsService", () => ({
  fetchDirections: jest.fn(),
}));

const mockFetchDirections = fetchDirections as jest.MockedFunction<typeof fetchDirections>;

describe("planCrossBuildingRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchDirections.mockResolvedValue({
      coordinates: [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.495, longitude: -73.579 },
      ],
      duration: "3 mins",
      distance: "0.3 km",
    });
  });

  it("returns 1 indoor step for same-building rooms", async () => {
    // Arrange — H851.02 and H857 are both in Hall building
    // Act
    const steps = await planCrossBuildingRoute("H-851.02", "H-857");

    // Assert
    expect(steps).not.toBeNull();
    expect(steps).toHaveLength(1);
    expect(steps![0].kind).toBe("indoor");
    expect(steps![0].startLabel).toContain("H851.02");
    expect(steps![0].endLabel).toContain("H857");
  });

  it("returns multiple steps for cross-building rooms", async () => {
    // Arrange — H820 is in Hall, MBS2.210 is in JMSB
    // Act
    const steps = await planCrossBuildingRoute("H-820", "MBS2.210");

    // Assert
    expect(steps).not.toBeNull();
    expect(steps!.length).toBeGreaterThanOrEqual(1);
    // Should contain an outdoor step
    const outdoorStep = steps!.find((s) => s.kind === "outdoor");
    expect(outdoorStep).toBeDefined();
    expect(outdoorStep!.startLabel).toContain("Hall");
    expect(outdoorStep!.endLabel).toContain("Molson");
  });

  it("returns null for unknown start room", async () => {
    // Arrange + Act
    const steps = await planCrossBuildingRoute("FAKE-999", "H-820");

    // Assert
    expect(steps).toBeNull();
  });

  it("returns null for unknown destination room", async () => {
    // Arrange + Act
    const steps = await planCrossBuildingRoute("H-820", "FAKE-999");

    // Assert
    expect(steps).toBeNull();
  });

  it("uses fallback route when fetchDirections fails", async () => {
    // Arrange
    mockFetchDirections.mockRejectedValue(new Error("Network error"));

    // Act
    const steps = await planCrossBuildingRoute("H-820", "MBS2.210");

    // Assert — should still return steps with a fallback outdoor route
    expect(steps).not.toBeNull();
    const outdoorStep = steps!.find((s) => s.kind === "outdoor");
    expect(outdoorStep).toBeDefined();
  });

  it("uses fallback route when fetchDirections returns null", async () => {
    // Arrange
    mockFetchDirections.mockResolvedValue(null);

    // Act
    const steps = await planCrossBuildingRoute("H-820", "MBS2.210");

    // Assert
    expect(steps).not.toBeNull();
    const outdoorStep = steps!.find((s) => s.kind === "outdoor");
    expect(outdoorStep).toBeDefined();
  });

  it("passes the given transportMode to fetchDirections", async () => {
    // Arrange
    mockFetchDirections.mockResolvedValue({
      coordinates: [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.495, longitude: -73.579 },
      ],
      duration: "10 mins",
      distance: "1.5 km",
    });

    // Act
    await planCrossBuildingRoute("H-820", "MBS2.210", false, "transit");

    // Assert — fetchDirections must be called with the provided mode
    expect(mockFetchDirections).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "transit",
    );
  });

  it("stores transportMode on the outdoor step", async () => {
    // Act
    const steps = await planCrossBuildingRoute("H-820", "MBS2.210", false, "car");

    // Assert
    const outdoorStep = steps!.find((s) => s.kind === "outdoor") as any;
    expect(outdoorStep).toBeDefined();
    expect(outdoorStep.transportMode).toBe("car");
  });

  it("defaults to walk transport mode when none provided", async () => {
    // Act
    const steps = await planCrossBuildingRoute("H-820", "MBS2.210");

    // Assert
    expect(mockFetchDirections).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "walk",
    );
    const outdoorStep = steps!.find((s) => s.kind === "outdoor") as any;
    expect(outdoorStep.transportMode).toBe("walk");
  });
});

describe("planCrossBuildingRouteFromGps", () => {
  const gpsCoords = { lat: 45.5, lng: -73.56 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchDirections.mockResolvedValue({
      coordinates: [
        { latitude: 45.5, longitude: -73.56 },
        { latitude: 45.497, longitude: -73.579 },
      ],
      duration: "8 mins",
      distance: "0.6 km",
    });
  });

  it("returns outdoor + indoor steps for a valid destination room", async () => {
    // Act
    const steps = await planCrossBuildingRouteFromGps(gpsCoords, "H-820");

    // Assert
    expect(steps).not.toBeNull();
    expect(steps!.length).toBeGreaterThanOrEqual(1);
    const outdoorStep = steps!.find((s) => s.kind === "outdoor");
    expect(outdoorStep).toBeDefined();
    expect(outdoorStep!.startLabel).toBe("Your Location");
  });

  it("returns null for an unknown destination room", async () => {
    // Act
    const steps = await planCrossBuildingRouteFromGps(gpsCoords, "FAKE-999");

    // Assert
    expect(steps).toBeNull();
  });

  it("uses fallback route when fetchDirections fails", async () => {
    // Arrange
    mockFetchDirections.mockRejectedValue(new Error("Network error"));

    // Act
    const steps = await planCrossBuildingRouteFromGps(gpsCoords, "H-820");

    // Assert — should still return steps using the straight-line fallback
    expect(steps).not.toBeNull();
    const outdoorStep = steps!.find((s) => s.kind === "outdoor");
    expect(outdoorStep).toBeDefined();
  });

  it("uses fallback route when fetchDirections returns null", async () => {
    // Arrange
    mockFetchDirections.mockResolvedValue(null);

    // Act
    const steps = await planCrossBuildingRouteFromGps(gpsCoords, "H-820");

    // Assert
    expect(steps).not.toBeNull();
  });

  it("passes the given transportMode to fetchDirections", async () => {
    // Act
    await planCrossBuildingRouteFromGps(gpsCoords, "H-820", false, "shuttle");

    // Assert
    expect(mockFetchDirections).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "shuttle",
    );
  });

  it("stores transportMode on the outdoor step", async () => {
    // Act
    const steps = await planCrossBuildingRouteFromGps(gpsCoords, "H-820", false, "transit");

    // Assert
    const outdoorStep = steps!.find((s) => s.kind === "outdoor") as any;
    expect(outdoorStep).toBeDefined();
    expect(outdoorStep.transportMode).toBe("transit");
  });

  it("defaults to walk when no transport mode is provided", async () => {
    // Act
    await planCrossBuildingRouteFromGps(gpsCoords, "H-820");

    // Assert
    expect(mockFetchDirections).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "walk",
    );
  });
});
