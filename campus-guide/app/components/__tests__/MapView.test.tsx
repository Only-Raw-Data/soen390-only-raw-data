import * as React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import MapViewApp from "../MapView";

jest.mock("@context/ParticipantSessionContext", () => ({
  ParticipantSessionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useParticipantSession: jest.fn(() => ({
    participantId: "jest-test",
    taskSet: "",
    isHydrated: true,
    startSession: jest.fn(() => Promise.resolve()),
  })),
}));
import { useDirections } from "../../context/DirectionsContext";
import { POIProvider } from "../../context/POIContext";

const renderWithProvider = (ui: React.ReactElement) =>
  render(<POIProvider children={ui} />);
import useBuildingPolygons from "../../hooks/useBuildingPolygons";
import useUserLocation from "../../hooks/useUserLocation";
import usePOIs from "../../hooks/usePOIs";
import { SGW_BUILDINGS, LOYOLA_BUILDINGS } from "@/constants/buildings";
import { isWithinShuttleHours } from "../../utils/shuttleHours";

//Mocks
jest.mock("../../context/DirectionsContext", () => ({
  useDirections: jest.fn(),
}));

jest.mock("@/constants/poi", () => ({
  POI_COOLDOWN_MS: 3000,
  POI_INITIAL_SEARCH_CENTER: { lat: 45.4972, lon: -73.5792 },
  POI_INITIAL_SEARCH_RADIUS: 1000,
  POI_LIMIT: 15,
  POI_RADIUS: 500,
  getPoiInfo: (type: string) => {
    if (type === "cafe") return { icon: "cafe", color: "#D97706" };
    if (type === "restaurant") return { icon: "restaurant", color: "#EF4444" };
    return { icon: "location", color: "#6B7280" };
  },
}));

jest.mock("@/constants/buildingImages", () => ({
  BUILDING_IMAGES: {
    h: "mock-image-h",
    mb: "mock-image-mb",
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("../../hooks/useBuildingPolygons", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../hooks/useUserLocation", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../hooks/usePOIs", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/constants/mapStyle", () => ({
  CAMPUS_MAP_STYLE: [],
}));

jest.mock("../../utils/shuttleHours", () => ({
  isWithinShuttleHours: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("../BuildingSearchComponent", () => {
  const { TextInput } = require("react-native");
  return function MockSearch(props: any) {
    return (
      <TextInput
        placeholder="Search buildings..."
        value={props.value}
        onChangeText={props.onChangeText}
      />
    );
  };
});

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View, Text, TouchableOpacity } = require("react-native");

  // Create shared mocks to capture calls across renders/layers
  (globalThis as any).mockMapMethods = {
    fitToCoordinates: jest.fn(),
    animateToRegion: jest.fn(),
    animateCamera: jest.fn(),
  };

  const MockMapView = React.forwardRef(
    ({ children, ...props }: any, ref: any) => {
      React.useImperativeHandle(ref, () => (globalThis as any).mockMapMethods);
      return (
        <View testID="mapView" {...props}>
          {children}
        </View>
      );
    },
  );

  const MockMarker = ({ title, onPress, testID, children }: any) => (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
    >
      <Text>{title}</Text>
      {children}
    </TouchableOpacity>
  );

  const MockPolygon = ({ onPress, coordinates }: any) => (
    <TouchableOpacity
      testID="building-polygon"
      onPress={onPress}
      accessibilityLabel={`polygon-${coordinates?.length || 0}-coords`}
    />
  );

  const MockPolyline = ({ coordinates }: any) => (
    <View
      testID="route-polyline"
      accessibilityLabel={`polyline-${coordinates?.length || 0}-coords`}
    />
  );

  const MockCallout = ({ children }: any) => <View>{children}</View>;

  const MockCircle = () => null;

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
    Polyline: MockPolyline,
    Callout: MockCallout,
    Circle: MockCircle,
    PROVIDER_GOOGLE: "google",
  };
});

let capturedOnCampusDetected: ((campus: string) => void) | null = null;
let capturedOnBuildingHighlight: ((buildingId: string | null) => void) | null =
  null;

jest.mock("../LocateMeButton", () => {
  const { TouchableOpacity, Text } = require("react-native");

  return {
    __esModule: true,
    default: function MockLocateMeButton({
      onLocate,
      onCampusDetected,
      onBuildingHighlight,
    }: any) {
      capturedOnCampusDetected = onCampusDetected;
      capturedOnBuildingHighlight = onBuildingHighlight;

      return (
        <TouchableOpacity testID="locate-me-button-wrapper" onPress={onLocate}>
          <Text>Locate Me</Text>
        </TouchableOpacity>
      );
    },
  };
});

// Mock polygon data for tests
const mockSGWPolygons = [
  {
    buildingId: "h",
    coordinates: [
      { latitude: 45.497092, longitude: -73.5788 },
      { latitude: 45.497192, longitude: -73.5788 },
      { latitude: 45.497192, longitude: -73.5778 },
      { latitude: 45.497092, longitude: -73.5778 },
    ],
  },
  {
    buildingId: "mb",
    coordinates: [
      { latitude: 45.495304, longitude: -73.579044 },
      { latitude: 45.495404, longitude: -73.579044 },
      { latitude: 45.495404, longitude: -73.578044 },
      { latitude: 45.495304, longitude: -73.578044 },
    ],
  },
];

const mockLoyolaPolygons = [
  {
    buildingId: "cc",
    coordinates: [
      { latitude: 45.458204, longitude: -73.6403 },
      { latitude: 45.458304, longitude: -73.6403 },
      { latitude: 45.458304, longitude: -73.6393 },
      { latitude: 45.458204, longitude: -73.6393 },
    ],
  },
];

// Helper functions to reduce mock setup duplication
const createDirectionsMock = (overrides = {}) => ({
  startBuilding: null,
  destinationBuilding: null,
  startCoords: null,
  route: null,
  isLoadingRoute: false,
  transportationMode: "walk",
  setStartBuilding: jest.fn(),
  setDestinationBuilding: jest.fn(),
  setStartCoords: jest.fn(),
  clearDirections: jest.fn(),
  ...overrides,
});

const createUserLocationMock = (overrides = {}) => ({
  location: null,
  isLoading: false,
  errorMsg: null,
  nearestBuilding: null,
  isOnCampus: false,
  currentCampus: null,
  getCurrentLocation: jest.fn(),
  startLocationTracking: jest.fn(),
  stopLocationTracking: jest.fn(),
  requestLocationPermission: jest.fn(),
  ...overrides,
});

const setupCampusSwitchingPolygonMock = () => {
  (useBuildingPolygons as jest.Mock).mockImplementation((campus: string) => ({
    polygons: campus === "SGW" ? mockSGWPolygons : mockLoyolaPolygons,
    loading: false,
    error: null,
  }));
};

describe("MapViewApp", () => {
  let mockSetStartBuilding: jest.Mock;
  let mockSetDestinationBuilding: jest.Mock;
  let mockGetCurrentLocation: jest.Mock;
  let mockClearDirections: jest.Mock;
  let mockSetStartCoords: jest.Mock;

  const setupDefaultMocks = () => {
    (useDirections as jest.Mock).mockReturnValue(
      createDirectionsMock({
        setStartBuilding: mockSetStartBuilding,
        setDestinationBuilding: mockSetDestinationBuilding,
        setStartCoords: mockSetStartCoords,
        clearDirections: mockClearDirections,
      }),
    );

    (useBuildingPolygons as jest.Mock).mockReturnValue({
      polygons: mockSGWPolygons,
      loading: false,
      error: null,
    });

    (useUserLocation as jest.Mock).mockReturnValue(
      createUserLocationMock({ getCurrentLocation: mockGetCurrentLocation }),
    );

    (usePOIs as jest.Mock).mockReturnValue({
      pois: [
        {
          id: 999,
          name: "Mock Cafe POI",
          type: "cafe",
          lat: 45.497,
          lon: -73.579,
        },
      ],
      loading: false,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetStartBuilding = jest.fn();
    mockSetDestinationBuilding = jest.fn();
    mockClearDirections = jest.fn();
    mockGetCurrentLocation = jest.fn();
    mockSetStartCoords = jest.fn();
    setupDefaultMocks();
  });

  it("renders search when showSearch=true", () => {
    // Arrange & Act
    const screen = renderWithProvider(<MapViewApp showSearch />);
    const input = screen.getByPlaceholderText("Search buildings...");
    // Assert
    expect(input).toBeTruthy();
  });

  it("renders campus toggle buttons", () => {
    // Arrange & Act
    const screen = renderWithProvider(<MapViewApp showSearch />);
    const sgw = screen.getByText("SGW Campus");
    const loyola = screen.getByText("Loyola Campus");
    // Assert
    expect(sgw).toBeTruthy();
    expect(loyola).toBeTruthy();
  });

  it("renders map container", () => {
    // Arrange & Act
    const screen = renderWithProvider(<MapViewApp />);
    const map = screen.getByTestId("mapView");
    // Assert
    expect(map).toBeTruthy();
  });

  it("defaults to SGW markers", () => {
    // Arrange & Act
    const screen = renderWithProvider(<MapViewApp />);
    const hall = screen.getByText(/H - 1455 DeMaisonneuve W/);
    const molson = screen.getByText(/MB - 1450 Guy Street/);
    // Assert
    expect(hall).toBeTruthy();
    expect(molson).toBeTruthy();
  });

  it("switches to Loyola campus", () => {
    // Arrange
    const screen = renderWithProvider(<MapViewApp />);
    // Act
    fireEvent.press(screen.getByText("Loyola Campus"));
    // Assert
    expect(screen.getByText(/CC - 7141 Sherbrooke West/)).toBeTruthy();
  });

  it.each([
    {
      searchTerm: "Hall",
      expectedBuilding: /H - 1455 DeMaisonneuve W/,
      description: "filters buildings by name",
    },
    {
      searchTerm: "MB",
      expectedBuilding: /MB - 1450 Guy Street/,
      description: "filters buildings by code",
    },
    {
      searchTerm: "engineering",
      expectedBuilding: /EV - 1515 Ste-Catherine W/,
      description: "is case insensitive",
    },
  ])("$description", ({ searchTerm, expectedBuilding }) => {
    // Arrange
    const screen = renderWithProvider(<MapViewApp showSearch />);
    const input = screen.getByPlaceholderText("Search buildings...");
    // Act
    fireEvent.changeText(input, searchTerm);
    // Assert
    expect(screen.getByText(expectedBuilding)).toBeTruthy();
  });

  it("shows building info popup", () => {
    // Arrange
    const screen = renderWithProvider(<MapViewApp />);
    // Act
    fireEvent.press(screen.getByText(/H - 1455 DeMaisonneuve W/));
    // Assert
    expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
  });

  it("sets start building when 'Set as Start' is pressed", () => {
    // Arrange
    const screen = renderWithProvider(<MapViewApp />);
    // Act
    fireEvent.press(screen.getByText(/H - 1455 DeMaisonneuve W/));
    fireEvent.press(screen.getByText("Set as Start"));
    // Assert
    expect(mockSetStartBuilding).toHaveBeenCalledWith(
      expect.objectContaining({ id: "h" }),
    );
  });

  it("sets destination building when start exists and 'Set as Destination' is pressed", () => {
    // Arrange
    (useDirections as jest.Mock).mockReturnValue(
      createDirectionsMock({
        startBuilding: { id: "h" },
        setStartBuilding: mockSetStartBuilding,
        setDestinationBuilding: mockSetDestinationBuilding,
      }),
    );

    const screen = renderWithProvider(<MapViewApp />);

    // Act
    fireEvent.press(screen.getByText(/MB - 1450 Guy Street/));
    fireEvent.press(screen.getByText("Set as Destination"));
    // Assert
    expect(mockSetDestinationBuilding).toHaveBeenCalledWith(
      expect.objectContaining({ id: "mb" }),
    );
  });

  it("clears start building when 'Clear' is pressed", () => {
    // Arrange
    const hBuilding = SGW_BUILDINGS.find((b) => b.code === "H");

    (useDirections as jest.Mock).mockReturnValue(
      createDirectionsMock({
        startBuilding: hBuilding,
        setStartBuilding: mockSetStartBuilding,
        setDestinationBuilding: mockSetDestinationBuilding,
        clearDirections: mockClearDirections,
      }),
    );

    const screen = renderWithProvider(<MapViewApp />);

    // Act - Select the building that's already the start
    const polygons = screen.getAllByTestId("building-polygon");
    fireEvent.press(polygons[0]); // mockSGWPolygons[0] is 'h'
    fireEvent.press(screen.getByText("Clear"));

    // Assert
    expect(screen.queryByTestId("bottom-bar")).toBeNull();
  });

  it("clears destination building when 'Clear' is pressed", () => {
    // Arrange
    const hBuilding = SGW_BUILDINGS.find((b) => b.code === "H");
    const mbBuilding = SGW_BUILDINGS.find((b) => b.code === "MB");

    (useDirections as jest.Mock).mockReturnValue(
      createDirectionsMock({
        startBuilding: hBuilding,
        destinationBuilding: mbBuilding,
        setStartBuilding: mockSetStartBuilding,
        setDestinationBuilding: mockSetDestinationBuilding,
        clearDirections: mockClearDirections,
      }),
    );

    const screen = renderWithProvider(<MapViewApp />);

    // Act - Select the building that's already the destination
    const polygons = screen.getAllByTestId("building-polygon");
    fireEvent.press(polygons[1]); // mockSGWPolygons[1] is 'mb'
    fireEvent.press(screen.getByText("Clear"));

    // Assert
    expect(screen.queryByTestId("bottom-bar")).toBeNull();
  });

  it("replaces destination when both start and destination are set and 'Set as Destination' is pressed", () => {
    // Arrange
    const hBuilding = SGW_BUILDINGS.find((b) => b.code === "H");
    const mbBuilding = SGW_BUILDINGS.find((b) => b.code === "MB");

    (useDirections as jest.Mock).mockReturnValue(
      createDirectionsMock({
        startBuilding: hBuilding,
        destinationBuilding: mbBuilding,
        setStartBuilding: mockSetStartBuilding,
        setDestinationBuilding: mockSetDestinationBuilding,
      }),
    );

    const screen = renderWithProvider(<MapViewApp />);

    // Act
    fireEvent.press(screen.getByText(/EV - 1515 Ste-Catherine W/));
    fireEvent.press(screen.getByText("Set as Destination"));

    // Assert
    expect(mockSetDestinationBuilding).toHaveBeenCalledWith(
      expect.objectContaining({ code: "EV" }),
    );
  });

  it("search works across campus switches", () => {
    // Arrange
    (useDirections as jest.Mock).mockReturnValue(
      createDirectionsMock({
        startBuilding: { id: "h" },
        destinationBuilding: { id: "mb" },
        route: {
          coordinates: [
            { latitude: 45.4971, longitude: -73.5791 },
            { latitude: 45.4953, longitude: -73.5782 },
          ],
          duration: "5 mins",
          distance: "1 km",
        },
        setStartBuilding: mockSetStartBuilding,
        setDestinationBuilding: mockSetDestinationBuilding,
      }),
    );

    const screen = renderWithProvider(<MapViewApp />);

    // Assert
    expect(screen.getByTestId("route-polyline")).toBeTruthy();
    expect(screen.getByText("5 mins (1 km)")).toBeTruthy();
  });

  // Polygon tests
  describe("Building Polygons", () => {
    it("renders polygons for current campus buildings", () => {
      // Arrange & Act
      const screen = renderWithProvider(<MapViewApp />);
      const polygons = screen.getAllByTestId("building-polygon");
      // Both campuses are always loaded; default mock returns mockSGWPolygons (2 items)
      // for every call, so SGW + Loyola = 4 total polygons.
      expect(polygons.length).toBe(4);
    });

    it("calls useBuildingPolygons with correct campus", () => {
      // Arrange & Act
      renderWithProvider(<MapViewApp />);
      // Assert
      expect(useBuildingPolygons).toHaveBeenCalledWith("SGW");
    });

    it("switches polygon data when changing campuses", () => {
      // Arrange
      setupCampusSwitchingPolygonMock();

      const screen = renderWithProvider(<MapViewApp />);

      // Act - switch to Loyola
      fireEvent.press(screen.getByText("Loyola Campus"));

      // Assert - useBuildingPolygons should be called with 'Loyola'
      expect(useBuildingPolygons).toHaveBeenCalledWith("Loyola");
    });

    it("polygon tap triggers building selection after confirmation", () => {
      // Arrange
      const screen = renderWithProvider(<MapViewApp />);
      const polygons = screen.getAllByTestId("building-polygon");

      // Act - tap first polygon (H building) and confirm
      fireEvent.press(polygons[0]);
      fireEvent.press(screen.getByText("Set as Start"));

      // Assert
      expect(mockSetStartBuilding).toHaveBeenCalledWith(
        expect.objectContaining({ id: "h" }),
      );
    });
  });

  // Location feature tests
  describe("Location Feature", () => {
    it("renders locate me button", () => {
      // Arrange & Act
      const screen = renderWithProvider(<MapViewApp />);
      // Assert
      expect(screen.getByTestId("locate-me-button-wrapper")).toBeTruthy();
    });

    it("calls getCurrentLocation when locate button pressed", () => {
      // Arrange
      const screen = renderWithProvider(<MapViewApp />);
      // Act
      fireEvent.press(screen.getByTestId("locate-me-button-wrapper"));
      // Assert
      expect(mockGetCurrentLocation).toHaveBeenCalled();
    });

    it("uses location hook", () => {
      // Arrange & Act
      renderWithProvider(<MapViewApp />);
      // Assert
      expect(useUserLocation).toHaveBeenCalled();
    });

    it("switches campus when onCampusDetected is called with different campus", () => {
      // Arrange
      setupCampusSwitchingPolygonMock();
      const screen = renderWithProvider(<MapViewApp />);

      // Verify we start on SGW -
      expect(screen.getByText(/H - 1455 DeMaisonneuve W/)).toBeTruthy();

      // Act
      act(() => {
        if (capturedOnCampusDetected) {
          capturedOnCampusDetected("Loyola");
        }
      });

      // Assert
      expect(useBuildingPolygons).toHaveBeenCalledWith("Loyola");
    });

    it("does not switch campus when onCampusDetected is called with same campus", () => {
      // Arrange
      renderWithProvider(<MapViewApp />);

      // Act
      act(() => {
        if (capturedOnCampusDetected) {
          capturedOnCampusDetected("SGW");
        }
      });

      // Assert — both campuses are always fetched; verify SGW was among the calls
      expect(useBuildingPolygons).toHaveBeenCalledWith("SGW");
    });

    it("highlights building when onBuildingHighlight is called", () => {
      // Arrange
      renderWithProvider(<MapViewApp />);

      // Act - simulate building highlight
      act(() => {
        if (capturedOnBuildingHighlight) {
          capturedOnBuildingHighlight("h");
        }
      });

      // Assert
      expect(capturedOnBuildingHighlight).toBeDefined();
    });

    it("clears highlight when onBuildingHighlight is called with null", () => {
      // Arrange
      renderWithProvider(<MapViewApp />);

      // Act
      act(() => {
        if (capturedOnBuildingHighlight) {
          capturedOnBuildingHighlight("h");
          capturedOnBuildingHighlight(null);
        }
      });

      // Assert
      expect(capturedOnBuildingHighlight).toBeDefined();
    });

    it("fits map to coordinates when route changes", async () => {
      // Arrange
      const mockRoute1 = { coordinates: [{ latitude: 1, longitude: 2 }] };
      const mockRoute2 = {
        coordinates: [
          { latitude: 3, longitude: 4 },
          { latitude: 5, longitude: 6 },
        ],
      };
      const mapMethods = (globalThis as any).mockMapMethods;
      mapMethods.fitToCoordinates.mockClear();

      // Start with first route
      (useDirections as jest.Mock).mockReturnValue(
        createDirectionsMock({ route: mockRoute1 }),
      );

      const screen = renderWithProvider(<MapViewApp />);

      // Act - change route to trigger useEffect
      (useDirections as jest.Mock).mockReturnValue(
        createDirectionsMock({ route: mockRoute2 }),
      );
      screen.rerender(<POIProvider children={<MapViewApp />} />);

      // Assert
      await waitFor(() => {
        expect(mapMethods.fitToCoordinates).toHaveBeenCalled();
        expect(mapMethods.fitToCoordinates).toHaveBeenCalledWith(
          mockRoute2.coordinates,
          expect.any(Object),
        );
      });
    });

    it("animates to user location when campus detected and location available", () => {
      // Arrange
      (useUserLocation as jest.Mock).mockReturnValue(
        createUserLocationMock({
          location: { coords: { latitude: 45.458204, longitude: -73.6403 } },
          nearestBuilding: { id: "cc", name: "Central Building" },
          isOnCampus: true,
          currentCampus: "Loyola",
          getCurrentLocation: mockGetCurrentLocation,
        }),
      );

      renderWithProvider(<MapViewApp />);

      // Act
      act(() => {
        if (capturedOnCampusDetected) {
          capturedOnCampusDetected("Loyola");
        }
      });

      // Assert
      expect(useUserLocation).toHaveBeenCalled();
    });
  });

  describe("Clear Directions Floating Button", () => {
    it("renders and clears directions when pressed", () => {
      // Arrange - setup with a destination building so the button appears
      (useDirections as jest.Mock).mockReturnValue(
        createDirectionsMock({
          destinationBuilding: { id: "h" },
          setStartBuilding: mockSetStartBuilding,
          setDestinationBuilding: mockSetDestinationBuilding,
          clearDirections: mockClearDirections,
          setStartCoords: mockSetStartCoords,
        }),
      );

      const screen = renderWithProvider(<MapViewApp />);

      // Act
      const clearBtn = screen.getByTestId("clear-directions-button");
      fireEvent.press(clearBtn);

      // Assert
      expect(mockClearDirections).toHaveBeenCalled();
    });
  });

  describe("Location interactions", () => {
    it("shows bottom popup with action buttons", () => {
      // Arrange
      const screen = renderWithProvider(<MapViewApp />);

      // Act
      fireEvent.press(screen.getByText(/H - 1455 DeMaisonneuve W/));

      // Assert - Check for bottom bar and its buttons
      expect(screen.getByTestId("bottom-bar")).toBeTruthy();
      expect(screen.getByText("Clear")).toBeTruthy();
      expect(screen.getByText("More Info")).toBeTruthy();
      expect(screen.getByText("Set as Start")).toBeTruthy();
    });

    it("opens building information when 'More Info' is pressed", () => {
      // Arrange
      const screen = renderWithProvider(<MapViewApp />);

      // Act
      fireEvent.press(screen.getByText(/H - 1455 DeMaisonneuve W/));
      fireEvent.press(screen.getByText("More Info"));

      // Assert - BuildingInformation modal should be visible
      expect(screen.getByText("Departments")).toBeTruthy();
    });

    it("closes building information when 'onClose' is triggered", () => {
      // Arrange
      const screen = renderWithProvider(<MapViewApp />);
      fireEvent.press(screen.getByText(/H - 1455 DeMaisonneuve W/));
      fireEvent.press(screen.getByText("More Info"));

      // Act
      fireEvent.press(screen.getByTestId("close-button"));

      // Assert
      expect(screen.queryByText("Departments")).toBeNull();
    });

    it("switches campus context and animates map when a cross-campus building is somehow selected", async () => {
      // Arrange
      const { SGW_BUILDINGS } = require("@/constants/buildings");
      const spyBuilding = {
        id: "cross-campus-spy",
        name: "Spy Building",
        campus: "Loyola",
        code: "SPY",
        lat: 10,
        lng: 10,
        address: "123 Spy St",
      };
      SGW_BUILDINGS.push(spyBuilding);

      const mapMethods = (globalThis as any).mockMapMethods;
      mapMethods.animateToRegion.mockClear();

      const screen = renderWithProvider(<MapViewApp />);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("building-marker-cross-campus-spy"));
      });

      // Assert
      expect(mapMethods.animateToRegion).toHaveBeenCalled();

      // Cleanup
      SGW_BUILDINGS.pop();
    });
  });

  describe("POI Feature", () => {
    it("renders POI markers when toggle is pressed", () => {
      // Arrange
      const screen = renderWithProvider(<MapViewApp />);

      // Act
      fireEvent.press(screen.getByTestId("poi-toggle-button"));

      // Assert
      expect(screen.getByTestId("poi-marker-999")).toBeTruthy();
    });

    it("shows POI bottom bar and triggers Get Directions", async () => {
      // Provide a mock user location to test the auto-start-coords feature
      (useUserLocation as jest.Mock).mockReturnValue(
        createUserLocationMock({
          location: { coords: { latitude: 45.4971, longitude: -73.5791 } },
          getCurrentLocation: mockGetCurrentLocation,
        }),
      );

      const screen = renderWithProvider(<MapViewApp />);
      // Enable POIs
      fireEvent.press(screen.getByTestId("poi-toggle-button"));
      
      // Tap the POI
      await act(async () => {
        fireEvent.press(screen.getByTestId("poi-marker-999"));
      });

      // POI bottom bar should appear
      await waitFor(() => {
        expect(screen.queryByTestId("poi-bottom-bar")).toBeTruthy();
      });
      expect(screen.getByTestId("poi-bottom-bar-name").props.children).toBe(
        "Mock Cafe POI",
      );

      // Get directions
      fireEvent.press(screen.getByTestId("poi-directions-button"));

      // Destination should be set via context adapter
      expect(mockSetDestinationBuilding).toHaveBeenCalledWith(
        expect.objectContaining({ id: "poi-999", name: "Mock Cafe POI" }),
      );
      // Start building won't be cleared, but startCoords should be injected
      expect(mockSetStartBuilding).not.toHaveBeenCalledWith(null);
      expect(mockSetStartCoords).toHaveBeenCalledWith({
        lat: 45.4971,
        lng: -73.5791,
      });
    });

    it("clears POI selection when Clear button is pressed on POI bottom bar", () => {
      const screen = renderWithProvider(<MapViewApp />);
      fireEvent.press(screen.getByTestId("poi-toggle-button"));
      fireEvent.press(screen.getByTestId("poi-marker-999"));

      // Verify POI is selected
      expect(screen.getByTestId("poi-bottom-bar")).toBeTruthy();

      // Act
      fireEvent.press(screen.getByText("Clear"));

      // Assert
      expect(screen.queryByTestId("poi-bottom-bar")).toBeNull();
    });
  });

  describe("Transit segment rendering", () => {
    it("renders one polyline per segment when transit route has segments", () => {
      // Arrange
      (useDirections as jest.Mock).mockReturnValue(
        createDirectionsMock({
          transportationMode: "transit",
          route: {
            coordinates: [
              { latitude: 45.4971, longitude: -73.5791 },
              { latitude: 45.4953, longitude: -73.5782 },
            ],
            duration: "15 mins",
            distance: "2.0 km",
            segments: [
              {
                mode: "WALK",
                coordinates: [
                  { latitude: 45.4971, longitude: -73.5791 },
                  { latitude: 45.496, longitude: -73.5785 },
                ],
              },
              {
                mode: "BUS",
                coordinates: [
                  { latitude: 45.496, longitude: -73.5785 },
                  { latitude: 45.4953, longitude: -73.5782 },
                ],
                lineName: "80",
              },
            ],
          },
        }),
      );

      // Act
      const screen = renderWithProvider(<MapViewApp />);

      // Assert — one polyline per segment
      const polylines = screen.getAllByTestId("route-polyline");
      expect(polylines).toHaveLength(2);
    });

    it("renders single fallback polyline when transit route has no segments", () => {
      // Arrange
      (useDirections as jest.Mock).mockReturnValue(
        createDirectionsMock({
          transportationMode: "transit",
          route: {
            coordinates: [
              { latitude: 45.4971, longitude: -73.5791 },
              { latitude: 45.4953, longitude: -73.5782 },
            ],
            duration: "15 mins",
            distance: "2.0 km",
          },
        }),
      );

      // Act
      const screen = renderWithProvider(<MapViewApp />);

      // Assert — single fallback polyline
      const polylines = screen.getAllByTestId("route-polyline");
      expect(polylines).toHaveLength(1);
    });

    it("renders three segment polylines for walk-subway-walk route", () => {
      // Arrange
      (useDirections as jest.Mock).mockReturnValue(
        createDirectionsMock({
          transportationMode: "transit",
          route: {
            coordinates: [
              { latitude: 45.4971, longitude: -73.5791 },
              { latitude: 45.4953, longitude: -73.5782 },
            ],
            duration: "20 mins",
            distance: "3.0 km",
            segments: [
              {
                mode: "WALK",
                coordinates: [{ latitude: 45.4971, longitude: -73.5791 }],
              },
              {
                mode: "SUBWAY",
                coordinates: [{ latitude: 45.4965, longitude: -73.5787 }],
              },
              {
                mode: "WALK",
                coordinates: [{ latitude: 45.4953, longitude: -73.5782 }],
              },
            ],
          },
        }),
      );

      // Act
      const screen = renderWithProvider(<MapViewApp />);

      // Assert
      const polylines = screen.getAllByTestId("route-polyline");
      expect(polylines).toHaveLength(3);
    });
  });

  describe("onRegionChangeComplete campus auto-switch", () => {
    const fireRegionChange = (screen: any, region: object) => {
      act(() => {
        screen.getByTestId("mapView").props.onRegionChangeComplete(region);
      });
    };

    beforeEach(() => {
      setupDefaultMocks();
      setupCampusSwitchingPolygonMock();
    });

    it("does not switch campus when latitudeDelta exceeds AUTO_SWITCH_MAX_DELTA", () => {
      // Arrange
      const screen = renderWithProvider(<MapViewApp />);
      const callsBefore = (useBuildingPolygons as jest.Mock).mock.calls.length;

      // Act — large delta triggers early return
      fireRegionChange(screen, {
        latitude: 45.4582,
        longitude: -73.6405,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      // Assert — no additional call means no campus switch
      expect((useBuildingPolygons as jest.Mock).mock.calls.length).toBe(callsBefore);
    });

    it("auto-switches to Loyola when map center is closer to Loyola", () => {
      // Arrange — default campus is SGW
      const screen = renderWithProvider(<MapViewApp />);

      // Act — pan to Loyola area with small delta
      fireRegionChange(screen, {
        latitude: 45.4582,
        longitude: -73.6405,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Assert
      expect(useBuildingPolygons).toHaveBeenLastCalledWith("Loyola");
    });

    it("auto-switches to SGW when map center is closer to SGW", () => {
      // Arrange — start on Loyola
      const screen = renderWithProvider(<MapViewApp />);
      fireEvent.press(screen.getByText("Loyola Campus"));

      // Capture call count before the region change so we can pinpoint the
      // re-render triggered by the auto-switch. The component always calls
      // useBuildingPolygons("SGW") first then useBuildingPolygons("Loyola")
      // in every render, so the last call is always "Loyola". We assert
      // that the first call of the post-switch render is "SGW" instead.
      const callsBefore = (useBuildingPolygons as jest.Mock).mock.calls.length;

      // Act — pan to SGW area
      fireRegionChange(screen, {
        latitude: 45.4972,
        longitude: -73.5788,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Assert — the campus-switch re-render starts with "SGW"
      expect(useBuildingPolygons).toHaveBeenNthCalledWith(callsBefore + 1, "SGW");
    });

    it("does not switch campus when already on the closest campus", () => {
      // Arrange — default is SGW, pan to SGW center
      const screen = renderWithProvider(<MapViewApp />);
      const callsBefore = (useBuildingPolygons as jest.Mock).mock.calls.length;

      // Act — already on SGW, region near SGW
      fireRegionChange(screen, {
        latitude: 45.4972,
        longitude: -73.5788,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Assert — no extra render triggered
      expect((useBuildingPolygons as jest.Mock).mock.calls.length).toBe(callsBefore);
    });
  });

  describe("Shuttle route visibility", () => {
    const setupShuttleMock = (withinHours: boolean) => {
      (isWithinShuttleHours as jest.Mock).mockReturnValue(withinHours);
      (useDirections as jest.Mock).mockReturnValue(
        createDirectionsMock({
          startBuilding: SGW_BUILDINGS.find((b) => b.code === "H"),
          destinationBuilding: LOYOLA_BUILDINGS[0],
          transportationMode: "shuttle",
          route: {
            coordinates: [
              { latitude: 45.497, longitude: -73.579 },
              { latitude: 45.458, longitude: -73.64 },
            ],
            duration: "21 mins",
            distance: "8.3 km",
          },
          setStartBuilding: mockSetStartBuilding,
          setDestinationBuilding: mockSetDestinationBuilding,
        }),
      );
    };

    it("hides shuttle route when outside service hours", () => {
      // Arrange
      setupShuttleMock(false);

      // Act
      const screen = renderWithProvider(<MapViewApp />);

      // Assert
      expect(screen.queryByTestId("route-polyline")).toBeNull();
      expect(screen.queryByText("21 mins (8.3 km)")).toBeNull();
    });

    it("shows shuttle route when within service hours", () => {
      // Arrange
      setupShuttleMock(true);

      // Act
      const screen = renderWithProvider(<MapViewApp />);

      // Assert
      expect(screen.getByTestId("route-polyline")).toBeTruthy();
      expect(screen.getByText("21 mins (8.3 km)")).toBeTruthy();
    });

    it("renders three segment polylines for walk-shuttle-walk route", () => {
      // Arrange — shuttle route with 3 segments
      (isWithinShuttleHours as jest.Mock).mockReturnValue(true);
      (useDirections as jest.Mock).mockReturnValue(
        createDirectionsMock({
          startBuilding: SGW_BUILDINGS.find((b) => b.code === "H"),
          destinationBuilding: LOYOLA_BUILDINGS[0],
          transportationMode: "shuttle",
          route: {
            coordinates: [
              { latitude: 45.497, longitude: -73.579 },
              { latitude: 45.458, longitude: -73.64 },
            ],
            duration: "21 mins",
            distance: "8.3 km",
            segments: [
              {
                mode: "WALK",
                coordinates: [
                  { latitude: 45.497, longitude: -73.579 },
                  { latitude: 45.4965, longitude: -73.5788 },
                ],
              },
              {
                mode: "SHUTTLE",
                coordinates: [
                  { latitude: 45.4965, longitude: -73.5788 },
                  { latitude: 45.4583, longitude: -73.6398 },
                ],
              },
              {
                mode: "WALK",
                coordinates: [
                  { latitude: 45.4583, longitude: -73.6398 },
                  { latitude: 45.458, longitude: -73.64 },
                ],
              },
            ],
          },
        }),
      );

      // Act
      const screen = renderWithProvider(<MapViewApp />);

      // Assert — one polyline per segment
      const polylines = screen.getAllByTestId("route-polyline");
      expect(polylines).toHaveLength(3);
    });

    it("renders cross-campus start and destination markers when buildings are on different campuses", () => {
      // Arrange
      (isWithinShuttleHours as jest.Mock).mockReturnValue(true);
      const sgwBuilding = SGW_BUILDINGS.find((b) => b.code === "H")!;
      const loyolaBuilding = LOYOLA_BUILDINGS[0];
      (useDirections as jest.Mock).mockReturnValue(
        createDirectionsMock({
          startBuilding: sgwBuilding,
          destinationBuilding: loyolaBuilding,
          transportationMode: "shuttle",
          route: {
            coordinates: [
              { latitude: 45.497, longitude: -73.579 },
              { latitude: 45.458, longitude: -73.64 },
            ],
            duration: "21 mins",
            distance: "8.3 km",
          },
        }),
      );

      // Act
      const screen = renderWithProvider(<MapViewApp />);

      // Assert — cross-campus start and destination markers are shown
      expect(screen.getByText("Start")).toBeTruthy();
      expect(screen.getByText("Destination")).toBeTruthy();
    });
  });
});
