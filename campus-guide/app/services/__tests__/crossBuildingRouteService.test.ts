import { planCrossBuildingRoute } from "../crossBuildingRouteService";
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
});
