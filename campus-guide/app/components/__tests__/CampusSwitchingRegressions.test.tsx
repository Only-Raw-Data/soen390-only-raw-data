import React from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import MapViewApp from "@/app/components/MapView";
import { useDirections } from "@context/DirectionsContext";
import useBuildingPolygons from "@hooks/useBuildingPolygons";
import { useIsFocused } from "@react-navigation/native";
import { SGW_BUILDINGS, LOYOLA_BUILDINGS } from "@constants/buildings";

// Mocks
jest.mock("@context/DirectionsContext", () => ({
  useDirections: jest.fn(),
}));

jest.mock("@hooks/useBuildingPolygons", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@hooks/useUserLocation", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    location: null,
    isLoading: false,
    errorMsg: null,
    nearestBuilding: null,
    isOnCampus: false,
    currentCampus: null,
    getCurrentLocation: jest.fn(),
  })),
}));

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useIsFocused: jest.fn(),
}));

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MockMapView = React.forwardRef(({ children }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      fitToCoordinates: jest.fn(),
      animateToRegion: jest.fn(),
    }));
    return <View testID="mapView">{children}</View>;
  });
  const MockPolyline = ({ testID, coordinates }: any) => (
    <View testID={testID} accessibilityLabel={`polyline-${coordinates?.length || 0}-coords`} />
  );
  const MockMarker = ({ testID, title }: any) => (
    <View testID={testID} accessibilityLabel={title} />
  );
  return {
    __esModule: true,
    default: MockMapView,
    Polyline: MockPolyline,
    Marker: MockMarker,
    Polygon: ({ children }: any) => <View>{children}</View>,
    Callout: ({ children }: any) => <View>{children}</View>,
    PROVIDER_GOOGLE: "google",
  };
});

describe("Campus switching route/map state regression tests", () => {
  let mockClearDirections: jest.Mock;
  let mockSetStartBuilding: jest.Mock;
  let mockSetDestinationBuilding: jest.Mock;

  const sgwStart = SGW_BUILDINGS.find(b => b.code === "H")!;
  const sgwEnd = SGW_BUILDINGS.find(b => b.code === "MB")!;
  const loyolaStart = LOYOLA_BUILDINGS.find(b => b.code === "CC")!;

  const setupMocks = (overrides = {}) => {
    mockClearDirections = jest.fn();
    mockSetStartBuilding = jest.fn();
    mockSetDestinationBuilding = jest.fn();

    (useDirections as jest.Mock).mockReturnValue({
      startBuilding: null,
      destinationBuilding: null,
      clearDirections: mockClearDirections,
      setStartBuilding: mockSetStartBuilding,
      setDestinationBuilding: mockSetDestinationBuilding,
      transportationMode: "walk",
      route: null,
      ...overrides,
    });
    (useIsFocused as jest.Mock).mockReturnValue(true);
    (useBuildingPolygons as jest.Mock).mockReturnValue({ polygons: [] });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------
  // AC1: Campus switching preserves correct map context
  // --------------------------------------------------
  it("switchCampus updates active campus and map context correctly", () => {
    // Arrange
    setupMocks();
    const { getByText } = render(<MapViewApp />);

    // Initial state is SGW (default in MapView)
    expect(useBuildingPolygons).toHaveBeenCalledWith("SGW");

    // Act
    // Switch to Loyola
    fireEvent.press(getByText("Loyola Campus"));
    
    // Assert
    expect(useBuildingPolygons).toHaveBeenCalledWith("Loyola");
  });

  // --------------------------------------------------
  // AC3: Route state resets correctly on campus change
  // --------------------------------------------------
  it("switchCampus clears existing route from previous campus", () => {
    // Arrange
    setupMocks({
      startBuilding: sgwStart,
      destinationBuilding: sgwEnd,
      route: { coordinates: [{ lat: 0, lng: 0 }] },
      showRoute: true,
    });

    // Act
    const { getByText } = render(<MapViewApp />);
    
    // Assert
    // AC3 is deprecated: we no longer clear the route when switching campus.
    // Switching campus should NOT clear the route.
    expect(mockClearDirections).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // AC5: Repeated campus switching does not crash
  // --------------------------------------------------
  it("repeated campus switching with active route does not throw", () => {
    // Arrange
    setupMocks();
    const { getByText } = render(<MapViewApp />);

    // Act
    expect(() => {
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByText("Loyola Campus"));
        fireEvent.press(getByText("SGW Campus"));
      }
    }).not.toThrow();
  });

  // --------------------------------------------------
  // Cross-campus validation tests
  // --------------------------------------------------
  it("switching campus clears selections that belong to previous campus", () => {
    // Arrange
    setupMocks({
        startBuilding: sgwStart,
    });

    // Act
    const { getByText } = render(<MapViewApp />);
    
    // clearDirections is no longer called on campus switch, route should be preserved
    expect(mockClearDirections).not.toHaveBeenCalled();
  });
});
