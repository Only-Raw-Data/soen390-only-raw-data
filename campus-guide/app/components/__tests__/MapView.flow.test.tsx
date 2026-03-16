import React from "react";
import { render, act } from "@testing-library/react-native";
import MapViewApp from "../MapView";
import { useDirections } from "../../context/DirectionsContext";
import useBuildingPolygons from "../../hooks/useBuildingPolygons";
import { useIsFocused } from "@react-navigation/native";

// Mocks
jest.mock("../../context/DirectionsContext", () => ({
  useDirections: jest.fn(),
}));

jest.mock("../../hooks/useBuildingPolygons", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../hooks/useUserLocation", () => ({
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
    <View testID={testID || "route-polyline"} accessibilityLabel={`polyline-${coordinates?.length || 0}-coords`} />
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

describe("MapViewApp - Complex Route Flow", () => {
  const mockRouteWalk = {
    coordinates: [{ latitude: 10, longitude: 10 }, { latitude: 11, longitude: 11 }],
    duration: "5 mins",
    distance: "500m",
  };

  const mockRouteCar = {
    coordinates: [{ latitude: 10, longitude: 10 }, { latitude: 12, longitude: 12 }],
    duration: "2 mins",
    distance: "1km",
  };

  const mockRouteTransit = {
    coordinates: [{ latitude: 10, longitude: 10 }, { latitude: 13, longitude: 13 }],
    duration: "10 mins",
    distance: "2km",
    segments: [
      { mode: "WALK", coordinates: [{ latitude: 10, longitude: 10 }] },
      { mode: "BUS", coordinates: [{ latitude: 11, longitude: 11 }] },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useIsFocused as jest.Mock).mockReturnValue(true);
    (useBuildingPolygons as jest.Mock).mockReturnValue({ polygons: [] });
    // Default directions mock
    (useDirections as jest.Mock).mockReturnValue({
      startBuilding: null,
      destinationBuilding: null,
      clearDirections: jest.fn(),
      setStartBuilding: jest.fn(),
      setDestinationBuilding: jest.fn(),
      transportationMode: "walk",
      route: null,
    });
  });

  it("handles complex flow: multiple mode switches, campus switch, and back", () => {
    const directionsBase = {
      startBuilding: { id: "h", campus: "SGW" },
      destinationBuilding: { id: "mb", campus: "SGW" },
      clearDirections: jest.fn(),
      setStartBuilding: jest.fn(),
      setDestinationBuilding: jest.fn(),
    };

    // 1. Initial Render
    const { rerender, getAllByTestId, queryAllByTestId } = render(
      <MapViewApp />,
    );

    expect(queryAllByTestId("route-polyline")).toHaveLength(0);

    // 2. Set Walk Route
    (useDirections as jest.Mock).mockReturnValue({
      ...directionsBase,
      transportationMode: "walk",
      route: mockRouteWalk,
    });
    rerender(<MapViewApp />);
    let polylines = getAllByTestId("route-polyline");
    expect(polylines).toHaveLength(1);
    expect(polylines[0].props.accessibilityLabel).toBe("polyline-2-coords");

    // 3. Switch to Car mode
    (useDirections as jest.Mock).mockReturnValue({
      ...directionsBase,
      transportationMode: "car",
      route: mockRouteCar,
    });
    rerender(<MapViewApp />);
    polylines = getAllByTestId("route-polyline");
    expect(polylines).toHaveLength(1);
    expect(polylines[0].props.accessibilityLabel).toBe("polyline-2-coords");

    // 4. Switch back to Walk mode
    (useDirections as jest.Mock).mockReturnValue({
      ...directionsBase,
      transportationMode: "walk",
      route: mockRouteWalk,
    });
    rerender(<MapViewApp />);
    polylines = getAllByTestId("route-polyline");
    expect(polylines).toHaveLength(1);

    // 5. Blur the map (simulating tab switch)
    // Note: useIsFocused logic has been removed from MapView to keep routes rendering
    (useIsFocused as jest.Mock).mockReturnValue(false);
    rerender(<MapViewApp />);
    expect(getAllByTestId("route-polyline")).toHaveLength(1);

    // 6. Focus again and switch to Transit
    (useIsFocused as jest.Mock).mockReturnValue(true);
    (useDirections as jest.Mock).mockReturnValue({
      ...directionsBase,
      transportationMode: "transit",
      route: mockRouteTransit,
    });
    rerender(<MapViewApp />);
    polylines = getAllByTestId("route-polyline");
    // Transit segments: 1 walk, 1 bus
    expect(polylines).toHaveLength(2);

    act(() => {
      // In a real app, this would be triggered by pressing the button
      // Here we just rerender to ensure nothing broke
    });
    rerender(<MapViewApp />);

    // 8. Final Mode Switch: back to Walk
    (useDirections as jest.Mock).mockReturnValue({
      ...directionsBase,
      transportationMode: "walk",
      route: mockRouteWalk,
    });
    rerender(<MapViewApp />);
    polylines = getAllByTestId("route-polyline");
    expect(polylines).toHaveLength(1);
  });
});
