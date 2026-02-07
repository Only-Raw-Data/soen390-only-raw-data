import { renderHook, act } from "@testing-library/react-native";
import * as Location from "expo-location";
import { useUserLocation } from "../useUserLocation";
import { findNearestBuilding } from "../../utils/locationUtils";

// Mock expo-location
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {
    High: 5,
  },
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
}));

// Mock building constants (needed by locationUtils)
jest.mock("../../../constants/buildings", () => ({
  All_BUILDINGS: [],
  SGW_BUILDINGS: [],
  LOYOLA_BUILDINGS: [],
}));

// Mock locationUtils
jest.mock("../../utils/locationUtils", () => ({
  findNearestBuilding: jest.fn(),
}));

// Test building fixtures
const H_BUILDING = {
  id: "h",
  name: "Henry F. Hall Building",
  code: "H",
  lat: 45.497092,
  lng: -73.5788,
  campus: "SGW",
  address: "1455 DeMaisonneuve W",
  x: 0,
  y: 0,
};

const CC_BUILDING = {
  id: "cc",
  name: "Central Building",
  code: "CC",
  lat: 45.458204,
  lng: -73.6403,
  campus: "Loyola",
  address: "7141 Sherbrooke West",
  x: 0,
  y: 0,
};

// Helper to create mock location objects
const createMockLocation = (
  latitude: number,
  longitude: number,
): Location.LocationObject => ({
  coords: {
    latitude,
    longitude,
    altitude: null,
    accuracy: 10,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
});

// Test coordinates
const COORDS = {
  H_BUILDING: { lat: 45.497092, lng: -73.5788 },
  CC_BUILDING: { lat: 45.458204, lng: -73.6403 },
  OFF_CAMPUS: { lat: 45.5017, lng: -73.5673 },
};

// Helper to setup permission mock
const mockPermission = (status: "granted" | "denied") => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
    status,
  });
};

// Helper to setup findNearestBuilding mock for on-campus
const mockFindOnCampus = (building: any) => {
  (findNearestBuilding as jest.Mock).mockReturnValue({
    building,
    distance: 0,
    campus: building.campus,
  });
};

// Helper to setup findNearestBuilding mock for off-campus
const mockFindOffCampus = () => {
  (findNearestBuilding as jest.Mock).mockReturnValue({
    building: H_BUILDING,
    distance: 5000,
    campus: "SGW",
  });
};

describe("useUserLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useUserLocation());

    expect(result.current.location).toBeNull();
    expect(result.current.errorMsg).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.nearestBuilding).toBeNull();
    expect(result.current.isOnCampus).toBe(false);
    expect(result.current.currentCampus).toBeNull();
  });

  it("handles permission denied", async () => {
    //Arrange
    mockPermission("denied");
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.getCurrentLocation();
    });

    //Assert
    expect(result.current.errorMsg).toContain("Location permission denied");
    expect(result.current.isLoading).toBe(false);
  });

  it("gets current location when permission granted", async () => {
    //Arrange
    mockPermission("granted");
    mockFindOnCampus(H_BUILDING);
    const mockLocation = createMockLocation(
      COORDS.H_BUILDING.lat,
      COORDS.H_BUILDING.lng,
    );
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      mockLocation,
    );
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.getCurrentLocation();
    });

    //Assert
    expect(result.current.location?.coords.latitude).toBe(
      COORDS.H_BUILDING.lat,
    );
    expect(result.current.location?.coords.longitude).toBe(
      COORDS.H_BUILDING.lng,
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("identifies nearest building when on campus", async () => {
    //Arrange
    mockPermission("granted");
    mockFindOnCampus(H_BUILDING);
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      createMockLocation(COORDS.H_BUILDING.lat, COORDS.H_BUILDING.lng),
    );
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.getCurrentLocation();
    });

    //Assert
    expect(result.current.isOnCampus).toBe(true);
    expect(result.current.nearestBuilding?.id).toBe("h");
    expect(result.current.currentCampus).toBe("SGW");
  });

  it("shows not on campus when far from buildings", async () => {
    //Arrange
    mockPermission("granted");
    mockFindOffCampus();
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      createMockLocation(COORDS.OFF_CAMPUS.lat, COORDS.OFF_CAMPUS.lng),
    );
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.getCurrentLocation();
    });

    //Assert
    expect(result.current.isOnCampus).toBe(false);
    expect(result.current.nearestBuilding).toBeNull();
    expect(result.current.errorMsg).toContain("don't appear to be on campus");
  });

  it("handles location tracking subscription", async () => {
    //Arrange
    const mockRemove = jest.fn();
    mockPermission("granted");
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({
      remove: mockRemove,
    });
    const { result, unmount } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.startLocationTracking();
    });

    //Assert
    expect(Location.watchPositionAsync).toHaveBeenCalled();
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it("stops location tracking when requested", async () => {
    //Arrange
    const mockRemove = jest.fn();
    mockPermission("granted");
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({
      remove: mockRemove,
    });
    const { result } = renderHook(() => useUserLocation());
    await act(async () => {
      await result.current.startLocationTracking();
    });

    //Act
    act(() => {
      result.current.stopLocationTracking();
    });

    //Assert
    expect(mockRemove).toHaveBeenCalled();
  });

  it("handles location error gracefully", async () => {
    //Arrange
    mockPermission("granted");
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error("Location unavailable"),
    );
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.getCurrentLocation();
    });

    //Assert
    expect(result.current.errorMsg).toContain("Failed to get your location");
    expect(result.current.isLoading).toBe(false);
  });

  it("identifies Loyola campus correctly", async () => {
    //Arrange
    mockPermission("granted");
    mockFindOnCampus(CC_BUILDING);
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      createMockLocation(COORDS.CC_BUILDING.lat, COORDS.CC_BUILDING.lng),
    );
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.getCurrentLocation();
    });

    //Assert
    expect(result.current.isOnCampus).toBe(true);
    expect(result.current.nearestBuilding?.id).toBe("cc");
    expect(result.current.currentCampus).toBe("Loyola");
  });

  it("handles requestLocationPermission throwing an error", async () => {
    //Arrange
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(
      new Error("Permission request failed"),
    );
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.getCurrentLocation();
    });

    //Assert
    expect(result.current.errorMsg).toContain(
      "Failed to request location permission",
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("returns nearest building via getNearestBuilding on success", async () => {
    //Arrange
    mockPermission("granted");
    (findNearestBuilding as jest.Mock).mockReturnValue({
      building: H_BUILDING,
      distance: 0,
      campus: "SGW",
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(
      createMockLocation(COORDS.H_BUILDING.lat, COORDS.H_BUILDING.lng),
    );
    const { result } = renderHook(() => useUserLocation());

    //Act
    let building: any;
    await act(async () => {
      building = await result.current.getNearestBuilding();
    });

    //Assert
    expect(building).not.toBeNull();
    expect(building.id).toBe("h");
    expect(result.current.isLoading).toBe(false);
  });

  it("returns null from getNearestBuilding when permission denied", async () => {
    //Arrange
    mockPermission("denied");
    const { result } = renderHook(() => useUserLocation());

    //Act
    let building: any;
    await act(async () => {
      building = await result.current.getNearestBuilding();
    });

    //Assert
    expect(building).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("returns null and sets error from getNearestBuilding when location fails", async () => {
    //Arrange
    mockPermission("granted");
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error("Location unavailable"),
    );
    const { result } = renderHook(() => useUserLocation());

    //Act
    let building: any;
    await act(async () => {
      building = await result.current.getNearestBuilding();
    });

    //Assert
    expect(building).toBeNull();
    expect(result.current.errorMsg).toBe("Failed to get current location");
    expect(result.current.isLoading).toBe(false);
  });

  it("resets loading state via resetLoadingState", async () => {
    //Arrange
    mockPermission("denied");
    const { result } = renderHook(() => useUserLocation());
    await act(async () => {
      await result.current.requestLocationPermission();
    });

    //Act
    act(() => {
      result.current.resetLoadingState();
    });

    //Assert
    expect(result.current.isLoading).toBe(false);
  });

  it("denies permission for startLocationTracking and returns early", async () => {
    //Arrange
    mockPermission("denied");
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.startLocationTracking();
    });

    //Assert
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    expect(result.current.errorMsg).toContain("Location permission denied");
  });

  it("removes existing subscription before starting a new one", async () => {
    //Arrange
    const mockRemoveFirst = jest.fn();
    const mockRemoveSecond = jest.fn();
    mockPermission("granted");
    (Location.watchPositionAsync as jest.Mock)
      .mockResolvedValueOnce({ remove: mockRemoveFirst })
      .mockResolvedValueOnce({ remove: mockRemoveSecond });
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.startLocationTracking();
    });
    await act(async () => {
      await result.current.startLocationTracking();
    });

    //Assert
    expect(mockRemoveFirst).toHaveBeenCalled();
  });

  it("handles startLocationTracking error gracefully", async () => {
    //Arrange
    mockPermission("granted");
    (Location.watchPositionAsync as jest.Mock).mockRejectedValue(
      new Error("Tracking failed"),
    );
    const { result } = renderHook(() => useUserLocation());

    //Act
    await act(async () => {
      await result.current.startLocationTracking();
    });

    //Assert
    expect(result.current.errorMsg).toContain(
      "Failed to start location tracking",
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("updates state when location tracking callback fires", async () => {
    //Arrange
    mockPermission("granted");
    let trackingCallback: (location: Location.LocationObject) => void;
    (Location.watchPositionAsync as jest.Mock).mockImplementation(
      (
        _options: any,
        callback: (location: Location.LocationObject) => void,
      ) => {
        trackingCallback = callback;
        return Promise.resolve({ remove: jest.fn() });
      },
    );
    const { result } = renderHook(() => useUserLocation());
    await act(async () => {
      await result.current.startLocationTracking();
    });

    //Act - simulate a location update on campus
    mockFindOnCampus(H_BUILDING);
    act(() => {
      trackingCallback!(
        createMockLocation(COORDS.H_BUILDING.lat, COORDS.H_BUILDING.lng),
      );
    });

    //Assert
    expect(result.current.isOnCampus).toBe(true);
    expect(result.current.nearestBuilding?.id).toBe("h");

    //Act - simulate a location update off campus
    mockFindOffCampus();
    act(() => {
      trackingCallback!(
        createMockLocation(COORDS.OFF_CAMPUS.lat, COORDS.OFF_CAMPUS.lng),
      );
    });

    //Assert
    expect(result.current.isOnCampus).toBe(false);
    expect(result.current.nearestBuilding).toBeNull();
    expect(result.current.errorMsg).toContain("don't appear to be on campus");
  });

  it("does nothing when stopLocationTracking is called without active subscription", () => {
    //Arrange
    const { result } = renderHook(() => useUserLocation());

    //Act
    act(() => {
      result.current.stopLocationTracking();
    });

    //Assert
    expect(result.current.isLoading).toBe(false);
  });
});
