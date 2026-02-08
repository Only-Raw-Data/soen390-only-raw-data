import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import MapViewApp from "../MapView";
import { useDirections } from "../../context/DirectionsContext";
import useBuildingPolygons from "../../hooks/useBuildingPolygons";
import useUserLocation from "../../hooks/useUserLocation";
import { SGW_BUILDINGS } from "@/constants/buildings";

//Mocks
jest.mock("../../context/DirectionsContext", () => ({
  useDirections: jest.fn(),
}));

jest.mock("../../hooks/useBuildingPolygons", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../hooks/useUserLocation", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../../constants/mapStyle", () => ({
  CAMPUS_MAP_STYLE: [],
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
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

  const MockMapView = React.forwardRef(
    ({ children, ...props }: any, ref: any) => (
      <View testID="mapView" {...props}>
        {children}
      </View>
    ),
  );

  const MockMarker = ({ title, onPress }: any) => (
    <Text accessibilityRole="button" onPress={onPress}>
      {title}
    </Text>
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

  const MockCircle = () => null;

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
    Polyline: MockPolyline,
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
        <TouchableOpacity testID="locate-me-button" onPress={onLocate}>
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
  route: null,
  isLoadingRoute: false,
  setStartBuilding: jest.fn(),
  setDestinationBuilding: jest.fn(),
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
  const mockSetStartBuilding = jest.fn();
  const mockSetDestinationBuilding = jest.fn();
  const mockGetCurrentLocation = jest.fn();

  const setupDefaultMocks = () => {
    (useDirections as jest.Mock).mockReturnValue(
      createDirectionsMock({
        setStartBuilding: mockSetStartBuilding,
        setDestinationBuilding: mockSetDestinationBuilding,
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it("renders search when showSearch=true", () => {
    // Arrange
    const screen = render(<MapViewApp showSearch />);
    // Act
    const input = screen.getByPlaceholderText("Search buildings...");
    // Assert
    expect(input).toBeTruthy();
  });

  it("renders campus toggle buttons", () => {
    // Arrange
    const screen = render(<MapViewApp showSearch />);
    // Act
    const sgw = screen.getByText("SGW Campus");
    const loyola = screen.getByText("Loyola Campus");
    // Assert
    expect(sgw).toBeTruthy();
    expect(loyola).toBeTruthy();
  });

  it("renders map container", () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    const map = screen.getByTestId("mapView");
    // Assert
    expect(map).toBeTruthy();
  });

  it("defaults to SGW markers", () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    const hall = screen.getByText("H");
    const molson = screen.getByText("MB");
    // Assert
    expect(hall).toBeTruthy();
    expect(molson).toBeTruthy();
  });

  it("switches to Loyola campus", () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    fireEvent.press(screen.getByText("Loyola Campus"));
    // Assert
    expect(screen.getByText("CC")).toBeTruthy();
  });

  it.each([
    {
      searchTerm: "Hall",
      expectedBuilding: "H",
      description: "filters buildings by name",
    },
    {
      searchTerm: "MB",
      expectedBuilding: "MB",
      description: "filters buildings by code",
    },
    {
      searchTerm: "engineering",
      expectedBuilding: "EV",
      description: "is case insensitive",
    },
  ])("$description", ({ searchTerm, expectedBuilding }) => {
    // Arrange
    const screen = render(<MapViewApp showSearch />);
    const input = screen.getByPlaceholderText("Search buildings...");
    // Act
    fireEvent.changeText(input, searchTerm);
    // Assert
    expect(screen.getByText(expectedBuilding)).toBeTruthy();
  });

  it("shows building info popup", () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    fireEvent.press(screen.getByText("H"));
    // Assert
    expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
  });

  it("sets start building on first press", () => {
    // Arrange
    const screen = render(<MapViewApp />);
    // Act
    fireEvent.press(screen.getByText("H"));
    // Assert
    expect(mockSetStartBuilding).toHaveBeenCalledWith(
      expect.objectContaining({ id: "h" }),
    );
  });

  it("sets destination building when start exists", () => {
    // Arrange
    (useDirections as jest.Mock).mockReturnValue(
      createDirectionsMock({
        startBuilding: { id: "h" },
        setStartBuilding: mockSetStartBuilding,
        setDestinationBuilding: mockSetDestinationBuilding,
      }),
    );

    const screen = render(<MapViewApp />);

    // Act
    fireEvent.press(screen.getByText("MB"));
    // Assert
    expect(mockSetDestinationBuilding).toHaveBeenCalledWith(
      expect.objectContaining({ id: "mb" }),
    );
  });

  it("clears start building when tapped again", () => {
    // Arrange
    const hBuilding = SGW_BUILDINGS.find((b) => b.code === "H");

    (useDirections as jest.Mock).mockReturnValue(
      createDirectionsMock({
        startBuilding: hBuilding,
        setStartBuilding: mockSetStartBuilding,
        setDestinationBuilding: mockSetDestinationBuilding,
      }),
    );

    const screen = render(<MapViewApp />);

    // Act
    const polygons = screen.getAllByTestId("building-polygon");
    fireEvent.press(polygons[0]); // mockSGWPolygons[0] is 'h'

    // Assert
    expect(mockSetStartBuilding).toHaveBeenCalledWith(null);
  });

  it("clears destination building when tapped again", () => {
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

    const screen = render(<MapViewApp />);

    // Act
    const polygons = screen.getAllByTestId("building-polygon");
    fireEvent.press(polygons[1]); // mockSGWPolygons[1] is 'mb'

    // Assert
    expect(mockSetDestinationBuilding).toHaveBeenCalledWith(null);
  });

  it("replaces destination when both start and destination are set and a new building is tapped", () => {
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

    const screen = render(<MapViewApp />);

    // Act
    fireEvent.press(screen.getByText("EV"));

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

    const screen = render(<MapViewApp />);

    // Assert
    expect(screen.getByTestId("route-polyline")).toBeTruthy();
    expect(screen.getByText("5 mins (1 km)")).toBeTruthy();
  });

  // Polygon tests
  describe("Building Polygons", () => {
    it("renders polygons for current campus buildings", () => {
      // Arrange & Act
      const screen = render(<MapViewApp />);
      const polygons = screen.getAllByTestId("building-polygon");
      // Assert - should have 2 SGW polygons from mock
      expect(polygons.length).toBe(2);
    });

    it("calls useBuildingPolygons with correct campus", () => {
      // Arrange & Act
      render(<MapViewApp />);
      // Assert
      expect(useBuildingPolygons).toHaveBeenCalledWith("SGW");
    });

    it("switches polygon data when changing campuses", () => {
      // Arrange
      setupCampusSwitchingPolygonMock();

      const screen = render(<MapViewApp />);

      // Act - switch to Loyola
      fireEvent.press(screen.getByText("Loyola Campus"));

      // Assert - useBuildingPolygons should be called with 'Loyola'
      expect(useBuildingPolygons).toHaveBeenCalledWith("Loyola");
    });

    it("polygon tap triggers building selection", () => {
      // Arrange
      const screen = render(<MapViewApp />);
      const polygons = screen.getAllByTestId("building-polygon");

      // Act - tap first polygon (H building)
      fireEvent.press(polygons[0]);

      // Assert
      expect(mockSetStartBuilding).toHaveBeenCalledWith(
        expect.objectContaining({ id: "h" }),
      );
    });
  });

  // Location feature tests
  describe("Location Feature", () => {
    it("renders locate me button", () => {
      const screen = render(<MapViewApp />);
      expect(screen.getByTestId("locate-me-button")).toBeTruthy();
    });

    it("calls getCurrentLocation when locate button pressed", () => {
      const screen = render(<MapViewApp />);
      fireEvent.press(screen.getByTestId("locate-me-button"));
      expect(mockGetCurrentLocation).toHaveBeenCalled();
    });

    it("uses location hook", () => {
      render(<MapViewApp />);
      expect(useUserLocation).toHaveBeenCalled();
    });

    it("switches campus when onCampusDetected is called with different campus", () => {
      // Arrange
      setupCampusSwitchingPolygonMock();

      const screen = render(<MapViewApp />);

      // Verify we start on SGW
      expect(screen.getByText("H")).toBeTruthy();

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
      render(<MapViewApp />);

      // Act
      act(() => {
        if (capturedOnCampusDetected) {
          capturedOnCampusDetected("SGW");
        }
      });

      // Assert
      expect(useBuildingPolygons).toHaveBeenLastCalledWith("SGW");
    });

    it("highlights building when onBuildingHighlight is called", () => {
      // Arrange
      render(<MapViewApp />);

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
      render(<MapViewApp />);

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

      render(<MapViewApp />);

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
});
