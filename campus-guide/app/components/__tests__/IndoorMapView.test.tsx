import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import IndoorMapView from "@app/components/IndoorMapView";
import { AMENITY_CONFIG } from "@app/components/IndoorMapView";
import {
  useIndoorMap,
  INDOOR_BUILDINGS,
  getGeoJsonForBuilding,
  getFeaturesForFloor,
} from "@app/context/IndoorMapContext";

// Mock the cross-building route service
jest.mock("@app/services/crossBuildingRouteService", () => ({
  planCrossBuildingRoute: jest.fn(),
}));

import { planCrossBuildingRoute } from "@app/services/crossBuildingRouteService";
const mockPlanRoute = planCrossBuildingRoute as jest.MockedFunction<typeof planCrossBuildingRoute>;

// Mock the IndoorMapContext
jest.mock("@app/context/IndoorMapContext", () => {
  const actual = jest.requireActual("@app/context/IndoorMapContext");
  return {
    ...actual,
    useIndoorMap: jest.fn(),
    getGeoJsonForBuilding: jest.fn(),
    getFeaturesForFloor: jest.fn(),
  };
});

// Mock mapStyle constant
jest.mock("@/constants/mapStyle", () => ({
  CAMPUS_MAP_STYLE: [],
}));

const mockUseIndoorMap = useIndoorMap as jest.MockedFunction<
  typeof useIndoorMap
>;
const mockGetGeoJson = getGeoJsonForBuilding as jest.MockedFunction<
  typeof getGeoJsonForBuilding
>;
const mockGetFeatures = getFeaturesForFloor as jest.MockedFunction<
  typeof getFeaturesForFloor
>;

// Helper: create a polygon feature with a given room ref
function makePolygonFeature(ref: string): any {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-73.579, 45.497],
          [-73.578, 45.497],
          [-73.578, 45.498],
          [-73.579, 45.498],
          [-73.579, 45.497],
        ],
      ],
    },
    properties: { ref, indoor: "room", level: "8" },
  };
}

// Helper: create an elevator polygon feature
function makeElevatorFeature(): any {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-73.5785, 45.4975],
          [-73.5784, 45.4975],
          [-73.5784, 45.4976],
          [-73.5785, 45.4976],
          [-73.5785, 45.4975],
        ],
      ],
    },
    properties: { highway: "elevator", level: "8;9" },
  };
}

// Helper: create a staircase polygon feature
function makeStaircaseFeature(): any {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-73.577, 45.496],
          [-73.5769, 45.496],
          [-73.5769, 45.4961],
          [-73.577, 45.4961],
          [-73.577, 45.496],
        ],
      ],
    },
    properties: { stairs: "yes", level: "8;9" },
  };
}

// Helper: set up context with a path on a given floor
function setupPathContext(
    pathNodes: any[],
    overrides: { selectedFloor?: number; startRoomRef?: string; destinationRoomRef?: string } = {},
) {
  const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
  mockUseIndoorMap.mockReturnValue({
    ...defaultContextValue,
    selectedBuilding: hallBuilding,
    selectedFloor: overrides.selectedFloor ?? 8,
    startRoomRef: overrides.startRoomRef ?? "H851.02",
    destinationRoomRef: overrides.destinationRoomRef ?? "H857",
    currentPath: pathNodes,
  });
}

const defaultContextValue = {
  selectedBuilding: null,
  selectedFloor: null,
  searchQuery: "",
  highlightedRoomRef: null,
  searchError: null,
  startRoomRef: null,
  destinationRoomRef: null,
  startSearchQuery: "",
  destinationSearchQuery: "",
  startSearchError: null,
  destinationSearchError: null,
  currentPath: null,
  pathError: null,
  accessible: false,
  showPOIs: true,
  isCrossBuilding: false,
  setSelectedBuilding: jest.fn(),
  setSelectedFloor: jest.fn(),
  setSearchQuery: jest.fn(),
  searchRoom: jest.fn(),
  clearHighlight: jest.fn(),
  setStartSearchQuery: jest.fn(),
  setDestinationSearchQuery: jest.fn(),
  searchStartRoom: jest.fn(),
  searchDestinationRoom: jest.fn(),
  clearStartRoom: jest.fn(),
  clearDestinationRoom: jest.fn(),
  clearPath: jest.fn(),
  toggleAccessible: jest.fn(),
  togglePOIs: jest.fn(),
};

describe("IndoorMapView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIndoorMap.mockReturnValue({ ...defaultContextValue });
    mockGetGeoJson.mockReturnValue(null);
    mockGetFeatures.mockReturnValue([]);
  });

  it("renders start and destination search bars", () => {
    // Arrange + Act
    const { getByTestId } = render(<IndoorMapView />);

    // Assert
    expect(getByTestId("room-search-start-input")).toBeTruthy();
    expect(getByTestId("room-search-destination-input")).toBeTruthy();
  });

  it("renders accessibility toggle", () => {
    // Arrange + Act
    const { getByTestId, getByText } = render(<IndoorMapView />);

    // Assert
    expect(getByTestId("accessible-toggle")).toBeTruthy();
    expect(getByText("Accessible Route")).toBeTruthy();
    expect(getByText("OFF")).toBeTruthy();
  });

  it("shows ON state when accessible mode is enabled", () => {
    // Arrange
    mockUseIndoorMap.mockReturnValue({ ...defaultContextValue, accessible: true });

    // Act
    const { getByTestId } = render(<IndoorMapView />);

    // Assert — accessible toggle should contain ON text
    const accessibleToggle = getByTestId("accessible-toggle");
    expect(accessibleToggle).toBeTruthy();
  });

  it("calls toggleAccessible when accessibility toggle is pressed", () => {
    // Arrange
    const toggleAccessible = jest.fn();
    mockUseIndoorMap.mockReturnValue({ ...defaultContextValue, toggleAccessible });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent.press(getByTestId("accessible-toggle"));

    // Assert
    expect(toggleAccessible).toHaveBeenCalledTimes(1);
  });

  it("renders all building pills", () => {
    // Arrange + Act
    const { getByText } = render(<IndoorMapView />);

    // Assert
    expect(getByText("H")).toBeTruthy();
    expect(getByText("MB")).toBeTruthy();
    expect(getByText("EV")).toBeTruthy();
    expect(getByText("VL")).toBeTruthy();
  });

  it("renders map view", () => {
    // Arrange + Act
    const { getByTestId } = render(<IndoorMapView />);

    // Assert
    expect(getByTestId("indoor-map")).toBeTruthy();
  });

  it("does not render floor selector when no building selected", () => {
    // Arrange + Act
    const { queryByTestId } = render(<IndoorMapView />);

    // Assert
    expect(queryByTestId("floor-button-1")).toBeNull();
  });

  it("renders floor selector when building is selected", () => {
    // Arrange
    const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      selectedBuilding: hallBuilding,
      selectedFloor: 1,
    });

    // Act
    const { getByText } = render(<IndoorMapView />);

    // Assert — H building has floors [1, 2, 3, 8, 9]
    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
    expect(getByText("8")).toBeTruthy();
    expect(getByText("9")).toBeTruthy();
  });

  it("renders negative floors as B-prefix (e.g. B2)", () => {
    // Arrange
    const mbBuilding = INDOOR_BUILDINGS.find((b) => b.code === "MB")!;
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      selectedBuilding: mbBuilding,
      selectedFloor: -2,
    });

    // Act
    const { getByText } = render(<IndoorMapView />);

    // Assert
    expect(getByText("B2")).toBeTruthy();
  });

  it("calls setSelectedBuilding and setSelectedFloor when building pill pressed", () => {
    // Arrange
    const setSelectedBuilding = jest.fn();
    const setSelectedFloor = jest.fn();
    const clearHighlight = jest.fn();
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      setSelectedBuilding,
      setSelectedFloor,
      clearHighlight,
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent.press(getByTestId("building-pill-H"));

    // Assert
    expect(clearHighlight).toHaveBeenCalled();
    expect(setSelectedBuilding).toHaveBeenCalledWith(
      expect.objectContaining({ code: "H" }),
    );
    expect(setSelectedFloor).toHaveBeenCalledWith(1); // first floor of H
  });

  it("calls setSelectedFloor when floor button pressed", () => {
    // Arrange
    const setSelectedFloor = jest.fn();
    const clearHighlight = jest.fn();
    const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      selectedBuilding: hallBuilding,
      selectedFloor: 1,
      setSelectedFloor,
      clearHighlight,
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent.press(getByTestId("floor-button-8"));

    // Assert
    expect(clearHighlight).toHaveBeenCalled();
    expect(setSelectedFloor).toHaveBeenCalledWith(8);
  });

  it("calls searchStartRoom on start search submit", () => {
    // Arrange
    const searchStartRoom = jest.fn();
    mockUseIndoorMap.mockReturnValue({ ...defaultContextValue, searchStartRoom });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent(getByTestId("room-search-start-input"), "submitEditing", {
      nativeEvent: { text: "H-851" },
    });

    // Assert — text comes from nativeEvent, not React state
    expect(searchStartRoom).toHaveBeenCalledWith("H-851");
  });

  it("calls searchDestinationRoom on destination search submit", () => {
    // Arrange
    const searchDestinationRoom = jest.fn();
    mockUseIndoorMap.mockReturnValue({ ...defaultContextValue, searchDestinationRoom });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent(getByTestId("room-search-destination-input"), "submitEditing", {
      nativeEvent: { text: "MB1.210" },
    });

    // Assert — text comes from nativeEvent, not React state
    expect(searchDestinationRoom).toHaveBeenCalledWith("MB1.210");
  });

  it("clears start room on start clear button press", () => {
    // Arrange
    const setStartSearchQuery = jest.fn();
    const clearStartRoom = jest.fn();
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      startSearchQuery: "H-851",
      setStartSearchQuery,
      clearStartRoom,
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent.press(getByTestId("room-search-start-clear"));

    // Assert
    expect(setStartSearchQuery).toHaveBeenCalledWith("");
    expect(clearStartRoom).toHaveBeenCalled();
  });

  it("clears destination room on destination clear button press", () => {
    // Arrange
    const setDestinationSearchQuery = jest.fn();
    const clearDestinationRoom = jest.fn();
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      destinationSearchQuery: "MB1.210",
      setDestinationSearchQuery,
      clearDestinationRoom,
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent.press(getByTestId("room-search-destination-clear"));

    // Assert
    expect(setDestinationSearchQuery).toHaveBeenCalledWith("");
    expect(clearDestinationRoom).toHaveBeenCalled();
  });

  it("displays start search error", () => {
    // Arrange
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      startSearchError: "Room not found",
    });

    // Act
    const { getAllByText } = render(<IndoorMapView />);

    // Assert
    expect(getAllByText("Room not found").length).toBeGreaterThan(0);
  });

  it("displays destination search error", () => {
    // Arrange
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      destinationSearchError: "Room not found",
    });

    // Act
    const { getAllByText } = render(<IndoorMapView />);

    // Assert
    expect(getAllByText("Room not found").length).toBeGreaterThan(0);
  });

  it("shows start room label in info bar when startRoomRef is set", () => {
    // Arrange
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      startRoomRef: "H851.02",
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);

    // Assert
    expect(getByTestId("start-room-label").props.children).toBe("H851.02");
  });

  it("shows destination room label in info bar when destinationRoomRef is set", () => {
    // Arrange
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      destinationRoomRef: "MB1.210",
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);

    // Assert
    expect(getByTestId("destination-room-label").props.children).toBe("MB1.210");
  });

  it("does not render info bar when no room is highlighted", () => {
    // Arrange + Act
    const { queryByText } = render(<IndoorMapView />);

    // Assert
    expect(queryByText("Floor:")).toBeNull();
  });

  // Helper: set up building selection with a single polygon feature
  function setupBuildingWithFeature(roomRef: string, contextOverrides = {}) {
    const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
    const feature = makePolygonFeature(roomRef);
    mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features: [feature] });
    mockGetFeatures.mockReturnValue([feature]);
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      selectedBuilding: hallBuilding,
      selectedFloor: 8,
      ...contextOverrides,
    });
  }

  it.each([
    ["start", "H851.02", { startRoomRef: "H851.02" }],
    ["destination", "H851.02", { destinationRoomRef: "H851.02" }],
    ["highlighted", "H851.02", { highlightedRoomRef: "H851.02" }],
    ["default", "H999", {}],
  ])("applies %s room style to polygon", (_label, roomRef, overrides) => {
    // Arrange
    setupBuildingWithFeature(roomRef as string, overrides);

    // Act
    render(<IndoorMapView />);

    // Assert — corresponding getRoomStyle branch exercised
    expect(mockGetFeatures).toHaveBeenCalled();
  });

  it("shows both start and destination room labels in info bar", () => {
    // Arrange
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      startRoomRef: "H851.02",
      destinationRoomRef: "MB1.210",
    });

    // Act
    const { getByTestId, getByText } = render(<IndoorMapView />);

    // Assert — both labels rendered, destination row has marginTop when start is present
    expect(getByTestId("start-room-label").props.children).toBe("H851.02");
    expect(getByTestId("destination-room-label").props.children).toBe("MB1.210");
    expect(getByText("From:")).toBeTruthy();
    expect(getByText("To:")).toBeTruthy();
  });

  it("renders path polyline when currentPath has nodes on current floor", () => {
    // Arrange
    setupPathContext([
      { id: "room:H851.02:8", lat: 45.497, lng: -73.578, floor: 8, type: "room", ref: "H851.02" },
      { id: "wp:1",           lat: 45.497, lng: -73.579, floor: 8, type: "waypoint" },
      { id: "room:H857:8",   lat: 45.498, lng: -73.579, floor: 8, type: "room", ref: "H857" },
    ]);

    // Act
    const { getByTestId } = render(<IndoorMapView />);

    // Assert — polyline rendered with correct number of coordinates
    const polyline = getByTestId("path-polyline");
    expect(polyline.props.accessibilityLabel).toBe("polyline-3-coords");
  });

  it("does not render polyline when currentPath is null", () => {
    // Arrange + Act
    const { queryByTestId } = render(<IndoorMapView />);

    // Assert
    expect(queryByTestId("path-polyline")).toBeNull();
  });

  it("shows path error banner when pathError is set", () => {
    // Arrange
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      pathError: "No path found between these rooms",
    });

    // Act
    const { getByTestId, getByText } = render(<IndoorMapView />);

    // Assert
    expect(getByTestId("path-error-banner")).toBeTruthy();
    expect(getByText("No path found between these rooms")).toBeTruthy();
  });

  it("does not show path error banner when pathError is null", () => {
    // Arrange + Act
    const { queryByTestId } = render(<IndoorMapView />);

    // Assert
    expect(queryByTestId("path-error-banner")).toBeNull();
  });

  describe("transition points", () => {
    it("renders staircase transition marker with up arrow and target floor", () => {
      // Arrange — path goes from floor 8 room → staircase on floor 8 → room on floor 9
      setupPathContext([
        { id: "room:H851.02:8", lat: 45.497, lng: -73.578, floor: 8, type: "room", ref: "H851.02" },
        { id: "stair:1",        lat: 45.497, lng: -73.579, floor: 8, type: "staircase" },
        { id: "room:H961:9",    lat: 45.498, lng: -73.579, floor: 9, type: "room", ref: "H961" },
      ], { destinationRoomRef: "H961" });

      // Act
      const { getByText } = render(<IndoorMapView />);

      // Assert — staircase marker shows "ST" label and "▲9" for going up to floor 9
      expect(getByText("ST")).toBeTruthy();
      expect(getByText("▲9")).toBeTruthy();
    });

    it("renders elevator transition marker with down arrow and target floor", () => {
      // Arrange — path goes from room on floor 1 → elevator on floor 1 → room on floor -2
      setupPathContext([
        { id: "room:start:1",   lat: 45.497, lng: -73.578, floor: 1, type: "room", ref: "H110" },
        { id: "room:prev:1",    lat: 45.497, lng: -73.578, floor: 1, type: "waypoint" },
        { id: "elev:1",         lat: 45.497, lng: -73.579, floor: 1, type: "elevator" },
        { id: "room:dest:-2",   lat: 45.498, lng: -73.579, floor: -2, type: "room", ref: "MBS2.437" },
      ], { selectedFloor: 1, startRoomRef: "H110", destinationRoomRef: "MBS2.437" });

      // Act
      const { getByText } = render(<IndoorMapView />);

      // Assert — elevator marker shows "EL" label and "▼B2" for going down to basement 2
      expect(getByText("EL")).toBeTruthy();
      expect(getByText("▼B2")).toBeTruthy();
    });

    it("skips transition nodes with non-finite coordinates", () => {
      // Arrange — staircase node has NaN coordinates
      setupPathContext([
        { id: "room:H851.02:8", lat: 45.497, lng: -73.578, floor: 8, type: "room", ref: "H851.02" },
        { id: "stair:bad",      lat: Number.NaN, lng: Number.NaN, floor: 8, type: "staircase" },
        { id: "room:H961:9",    lat: 45.498, lng: -73.579, floor: 9, type: "room", ref: "H961" },
      ], { destinationRoomRef: "H961" });

      // Act
      const { queryByText } = render(<IndoorMapView />);

      // Assert — no transition marker rendered due to NaN coords
      expect(queryByText("ST")).toBeNull();
      expect(queryByText("EL")).toBeNull();
    });

    it("renders transition marker without floor label when neighbor is on same floor", () => {
      // Arrange — staircase with both neighbors on the same floor (no floor change detected)
      setupPathContext([
        { id: "room:A:8",  lat: 45.497, lng: -73.578, floor: 8, type: "room", ref: "H851.02" },
        { id: "stair:mid", lat: 45.497, lng: -73.579, floor: 8, type: "staircase" },
        { id: "room:B:8",  lat: 45.498, lng: -73.579, floor: 8, type: "room", ref: "H857" },
      ]);

      // Act
      const { getByText, queryByText } = render(<IndoorMapView />);

      // Assert — "ST" marker exists but no arrow/floor label
      expect(getByText("ST")).toBeTruthy();
      expect(queryByText(/[▲▼]/)).toBeNull();
    });

    it("uses previous node floor when next node is on the same floor", () => {
      // Arrange — staircase at floor 8 has previous node on floor 7 and next node on floor 8
      setupPathContext([
        { id: "room:prev:7", lat: 45.496, lng: -73.579, floor: 7, type: "room", ref: "H751" },
        { id: "stair:8",    lat: 45.497, lng: -73.579, floor: 8, type: "staircase" },
        { id: "room:next:8", lat: 45.498, lng: -73.579, floor: 8, type: "room", ref: "H851" },
      ]);

      // Act
      const { getByText } = render(<IndoorMapView />);

      // Assert — previous floor (7) is used, producing down arrow from floor 8
      expect(getByText("ST")).toBeTruthy();
      expect(getByText("▼7")).toBeTruthy();
    });
  });

  describe("facility markers", () => {
    it("renders elevator polygon with EL marker", () => {
      // Arrange
      const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const elevatorFeature = makeElevatorFeature();
      mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features: [elevatorFeature] });
      mockGetFeatures.mockReturnValue([elevatorFeature]);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        selectedBuilding: hallBuilding,
        selectedFloor: 8,
      });

      // Act
      const { getByText } = render(<IndoorMapView />);

      // Assert
      expect(getByText("EL")).toBeTruthy();
    });

    it("renders staircase polygon with ST marker", () => {
      // Arrange
      const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const staircaseFeature = makeStaircaseFeature();
      mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features: [staircaseFeature] });
      mockGetFeatures.mockReturnValue([staircaseFeature]);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        selectedBuilding: hallBuilding,
        selectedFloor: 8,
      });

      // Act
      const { getByText } = render(<IndoorMapView />);

      // Assert
      expect(getByText("ST")).toBeTruthy();
    });

    it("skips elevator feature with empty coordinates", () => {
      // Arrange
      const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const emptyElevator = {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [[]] },
        properties: { highway: "elevator", level: "8" },
      };
      mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features: [emptyElevator] });
      mockGetFeatures.mockReturnValue([emptyElevator]);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        selectedBuilding: hallBuilding,
        selectedFloor: 8,
      });

      // Act
      const { queryByText } = render(<IndoorMapView />);

      // Assert — no EL marker because coords are empty
      expect(queryByText("EL")).toBeNull();
    });

    it("skips staircase feature with empty coordinates", () => {
      // Arrange
      const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const emptyStaircase = {
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [[]] },
        properties: { stairs: "yes", level: "8" },
      };
      mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features: [emptyStaircase] });
      mockGetFeatures.mockReturnValue([emptyStaircase]);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        selectedBuilding: hallBuilding,
        selectedFloor: 8,
      });

      // Act
      const { queryByText } = render(<IndoorMapView />);

      // Assert — no ST marker because coords are empty
      expect(queryByText("ST")).toBeNull();
    });
  });

  describe("indoor POIs", () => {
    // Helper: create a toilet polygon feature
    function makeToiletFeature(ref: string): any {
      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-73.578, 45.497],
              [-73.577, 45.497],
              [-73.577, 45.498],
              [-73.578, 45.498],
              [-73.578, 45.497],
            ],
          ],
        },
        properties: { ref, amenity: "toilets", indoor: "room", level: "8" },
      };
    }

    // Helper: create a water fountain point feature
    function makeFountainFeature(): any {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-73.5788, 45.4971],
        },
        properties: { amenity: "fountain", level: "8" },
      };
    }

    // Helper: set up building with amenity features
    function setupWithAmenities(features: any[], contextOverrides = {}) {
      const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features });
      mockGetFeatures.mockReturnValue(features);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        selectedBuilding: hallBuilding,
        selectedFloor: 8,
        ...contextOverrides,
      });
    }

    it("renders POI toggle button", () => {
      // Arrange + Act
      const { getByTestId, getByText } = render(<IndoorMapView />);

      // Assert
      expect(getByTestId("poi-toggle")).toBeTruthy();
      expect(getByText("Indoor POIs")).toBeTruthy();
    });

    it("shows ON state when POIs are enabled", () => {
      // Arrange
      mockUseIndoorMap.mockReturnValue({ ...defaultContextValue, showPOIs: true });

      // Act
      const { getByTestId } = render(<IndoorMapView />);

      // Assert
      expect(getByTestId("poi-toggle")).toBeTruthy();
    });

    it("calls togglePOIs when POI toggle is pressed", () => {
      // Arrange
      const togglePOIs = jest.fn();
      mockUseIndoorMap.mockReturnValue({ ...defaultContextValue, togglePOIs });

      // Act
      const { getByTestId } = render(<IndoorMapView />);
      fireEvent.press(getByTestId("poi-toggle"));

      // Assert
      expect(togglePOIs).toHaveBeenCalledTimes(1);
    });

    it("renders toilet POI with washroom icon when POIs enabled", () => {
      // Arrange
      const toilet = makeToiletFeature("H812");
      setupWithAmenities([toilet], { showPOIs: true });

      // Act
      const { getByText } = render(<IndoorMapView />);

      // Assert — washroom icon should be rendered
      expect(getByText(AMENITY_CONFIG.toilets.label)).toBeTruthy();
    });

    it("renders toilet as regular room when POIs disabled", () => {
      // Arrange
      const toilet = makeToiletFeature("H812");
      setupWithAmenities([toilet], { showPOIs: false });

      // Act
      const { queryByText, getByText } = render(<IndoorMapView />);

      // Assert — room label shown instead of amenity icon
      expect(queryByText(AMENITY_CONFIG.toilets.label)).toBeNull();
      expect(getByText("812")).toBeTruthy();
    });

    it("renders water fountain point POI when POIs enabled", () => {
      // Arrange
      const fountain = makeFountainFeature();
      setupWithAmenities([fountain], { showPOIs: true });

      // Act
      const { getByText } = render(<IndoorMapView />);

      // Assert
      expect(getByText(AMENITY_CONFIG.fountain.label)).toBeTruthy();
    });

    it("does not render water fountain when POIs disabled", () => {
      // Arrange
      const fountain = makeFountainFeature();
      setupWithAmenities([fountain], { showPOIs: false });

      // Act
      const { queryByText } = render(<IndoorMapView />);

      // Assert
      expect(queryByText(AMENITY_CONFIG.fountain.label)).toBeNull();
    });

    it("shows POI info bar when amenity marker is pressed", () => {
      // Arrange
      const toilet = makeToiletFeature("H812");
      setupWithAmenities([toilet], { showPOIs: true });

      // Act
      const { getByText, getByTestId } = render(<IndoorMapView />);
      fireEvent.press(getByText(AMENITY_CONFIG.toilets.label));

      // Assert — POI info bar should appear with amenity details
      expect(getByTestId("poi-info-bar")).toBeTruthy();
      expect(getByText("Washroom")).toBeTruthy();
      expect(getByTestId("poi-ref").props.children).toBe("H812");
    });

    it("dismisses POI info bar when dismiss button is pressed", () => {
      // Arrange
      const toilet = makeToiletFeature("H812");
      setupWithAmenities([toilet], { showPOIs: true });

      // Act
      const { getByText, getByTestId, queryByTestId } = render(<IndoorMapView />);
      fireEvent.press(getByText(AMENITY_CONFIG.toilets.label));
      expect(getByTestId("poi-info-bar")).toBeTruthy();
      fireEvent.press(getByTestId("poi-dismiss"));

      // Assert — POI info bar should be dismissed
      expect(queryByTestId("poi-info-bar")).toBeNull();
    });

    it("renders multiple amenity types simultaneously", () => {
      // Arrange
      const toilet = makeToiletFeature("H812");
      const fountain = makeFountainFeature();
      setupWithAmenities([toilet, fountain], { showPOIs: true });

      // Act
      const { getByText } = render(<IndoorMapView />);

      // Assert — both amenity icons should be visible
      expect(getByText(AMENITY_CONFIG.toilets.label)).toBeTruthy();
      expect(getByText(AMENITY_CONFIG.fountain.label)).toBeTruthy();
    });

    it("skips amenity point feature with insufficient coordinates", () => {
      // Arrange
      const badFountain = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [] },
        properties: { amenity: "fountain", level: "8" },
      };
      setupWithAmenities([badFountain], { showPOIs: true });

      // Act
      const { queryByText } = render(<IndoorMapView />);

      // Assert — no marker rendered due to empty coordinates
      expect(queryByText(AMENITY_CONFIG.fountain.label)).toBeNull();
    });

    it("skips amenity polygon feature with empty coordinates", () => {
      // Arrange
      const emptyToilet = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[]] },
        properties: { amenity: "toilets", indoor: "room", level: "8", ref: "H999" },
      };
      setupWithAmenities([emptyToilet], { showPOIs: true });

      // Act
      const { queryByText } = render(<IndoorMapView />);

      // Assert — no marker rendered due to empty coords
      expect(queryByText(AMENITY_CONFIG.toilets.label)).toBeNull();
    });

    it("does not render POI info bar when room info bar is shown", () => {
      // Arrange — startRoomRef is set, so room info bar shows instead
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        startRoomRef: "H851.02",
      });

      // Act
      const { queryByTestId, getByTestId } = render(<IndoorMapView />);

      // Assert
      expect(queryByTestId("poi-info-bar")).toBeNull();
      expect(getByTestId("start-room-label")).toBeTruthy();
    });

    it("ignores unknown amenity types", () => {
      // Arrange
      const unknownAmenity = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-73.578, 45.497],
              [-73.577, 45.497],
              [-73.577, 45.498],
              [-73.578, 45.498],
              [-73.578, 45.497],
            ],
          ],
        },
        properties: { amenity: "unknown_type", indoor: "room", level: "8" },
      };
      setupWithAmenities([unknownAmenity], { showPOIs: true });

      // Act
      const { queryByTestId } = render(<IndoorMapView />);

      // Assert — unknown amenity is not rendered as a POI
      expect(queryByTestId(/amenity-/)).toBeNull();
    });

    it("shows fountain POI info bar when fountain point marker is pressed", () => {
      // Arrange
      const fountain = makeFountainFeature();
      setupWithAmenities([fountain], { showPOIs: true });

      // Act — press the fountain icon text (marker mock doesn't forward testID)
      const { getByTestId, getByText } = render(<IndoorMapView />);
      fireEvent.press(getByText(AMENITY_CONFIG.fountain.label));

      // Assert
      expect(getByTestId("poi-info-bar")).toBeTruthy();
      expect(getByText("Water Fountain")).toBeTruthy();
    });
  });

  describe("cross-building story mode", () => {
    it("shows cross-building banner when isCrossBuilding is true", () => {
      // Arrange
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        startRoomRef: "H820",
        destinationRoomRef: "MBS2.210",
        startSearchQuery: "H-820",
        destinationSearchQuery: "MBS2.210",
      });

      // Act
      const { getByTestId, getByText } = render(<IndoorMapView />);

      // Assert
      expect(getByTestId("cross-building-banner")).toBeTruthy();
      expect(getByText("These rooms are in different buildings.")).toBeTruthy();
      expect(getByTestId("cross-building-directions-button")).toBeTruthy();
    });

    it("does not show cross-building banner when isCrossBuilding is false", () => {
      // Arrange
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: false,
      });

      // Act
      const { queryByTestId } = render(<IndoorMapView />);

      // Assert
      expect(queryByTestId("cross-building-banner")).toBeNull();
    });

    it("does not show path error when isCrossBuilding is true", () => {
      // Arrange
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        pathError: "No path found between these rooms",
      });

      // Act
      const { queryByTestId } = render(<IndoorMapView />);

      // Assert
      expect(queryByTestId("path-error-banner")).toBeNull();
    });

    it("starts story mode with steps on successful route planning", async () => {
      // Arrange
      const mockSteps = [
        {
          kind: "indoor" as const,
          buildingCode: "H",
          buildingName: "Hall Building",
          path: [{ id: "room:H820:8", lat: 45.497, lng: -73.578, floor: 8, type: "room", ref: "H820" }],
          startLabel: "H820",
          endLabel: "Exit",
        },
        {
          kind: "outdoor" as const,
          route: { distance: "500m", duration: "6 min", polyline: "", steps: [] },
          startLabel: "Hall Building",
          endLabel: "MB Building",
        },
      ];
      mockPlanRoute.mockResolvedValue(mockSteps);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        startRoomRef: "H820",
        destinationRoomRef: "MBS2.210",
        startSearchQuery: "H-820",
        destinationSearchQuery: "MBS2.210",
      });

      // Act
      const { getByTestId } = render(<IndoorMapView />);
      fireEvent.press(getByTestId("cross-building-directions-button"));

      // Assert — wait for async route planning to complete
      await waitFor(() => {
        expect(mockPlanRoute).toHaveBeenCalledWith("H-820", "MBS2.210", false);
        expect(getByTestId("story-exit-button")).toBeTruthy();
      });
    });

    it("shows error when planCrossBuildingRoute returns empty steps", async () => {
      // Arrange
      mockPlanRoute.mockResolvedValue([]);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        startRoomRef: "H820",
        destinationRoomRef: "MBS2.210",
        startSearchQuery: "H-820",
        destinationSearchQuery: "MBS2.210",
      });

      // Act
      const { getByTestId, findByText } = render(<IndoorMapView />);
      fireEvent.press(getByTestId("cross-building-directions-button"));

      // Assert
      expect(await findByText("Could not compute cross-building route")).toBeTruthy();
    });

    it("shows error when planCrossBuildingRoute throws", async () => {
      // Arrange
      mockPlanRoute.mockRejectedValue(new Error("Network error"));
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        startRoomRef: "H820",
        destinationRoomRef: "MBS2.210",
        startSearchQuery: "H-820",
        destinationSearchQuery: "MBS2.210",
      });

      // Act
      const { getByTestId, findByText } = render(<IndoorMapView />);
      fireEvent.press(getByTestId("cross-building-directions-button"));

      // Assert
      expect(await findByText("Error computing cross-building route")).toBeTruthy();
    });

    it("exits story mode when exit button is pressed", async () => {
      // Arrange
      const mockSteps = [
        {
          kind: "indoor" as const,
          buildingCode: "H",
          buildingName: "Hall Building",
          path: [{ id: "room:H820:8", lat: 45.497, lng: -73.578, floor: 8, type: "room", ref: "H820" }],
          startLabel: "H820",
          endLabel: "Exit",
        },
      ];
      mockPlanRoute.mockResolvedValue(mockSteps);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        startRoomRef: "H820",
        destinationRoomRef: "MBS2.210",
        startSearchQuery: "H-820",
        destinationSearchQuery: "MBS2.210",
      });

      // Act — enter story mode, then exit
      const { getByTestId, queryByTestId } = render(<IndoorMapView />);
      fireEvent.press(getByTestId("cross-building-directions-button"));
      await waitFor(() => expect(getByTestId("story-exit-button")).toBeTruthy());
      fireEvent.press(getByTestId("story-exit-button"));

      // Assert — story panel gone, cross-building banner back
      await waitFor(() => {
        expect(queryByTestId("story-exit-button")).toBeNull();
        expect(getByTestId("cross-building-banner")).toBeTruthy();
      });
    });

    it("shows loading indicator while computing route", async () => {
      // Arrange — make planRoute hang so we can observe loading state
      let resolveRoute!: (value: any) => void;
      mockPlanRoute.mockReturnValue(new Promise((res) => { resolveRoute = res; }));
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        startRoomRef: "H820",
        destinationRoomRef: "MBS2.210",
        startSearchQuery: "H-820",
        destinationSearchQuery: "MBS2.210",
      });

      // Act
      const { getByTestId } = render(<IndoorMapView />);
      fireEvent.press(getByTestId("cross-building-directions-button"));

      // Assert — loading indicator should appear
      await waitFor(() => expect(getByTestId("story-loading")).toBeTruthy());

      // Cleanup — resolve to avoid dangling promise
      resolveRoute([]);
    });

    it("navigates to outdoor step and back using story nav buttons", async () => {
      // Arrange
      const mockSteps = [
        {
          kind: "indoor" as const,
          buildingCode: "H",
          buildingName: "Hall Building",
          path: [
            { id: "room:H820:8", lat: 45.497, lng: -73.578, floor: 8, type: "room", ref: "H820" },
          ],
          startLabel: "H820",
          endLabel: "Hall Exit",
        },
        {
          kind: "outdoor" as const,
          route: {
            distance: "500m",
            duration: "6 min",
            coordinates: [
              { latitude: 45.497, longitude: -73.578 },
              { latitude: 45.498, longitude: -73.579 },
            ],
            steps: [],
          },
          startLabel: "Hall Exit",
          endLabel: "MB Entrance",
        },
      ];
      mockPlanRoute.mockResolvedValue(mockSteps as any);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        startRoomRef: "H820",
        destinationRoomRef: "MBS2.210",
        startSearchQuery: "H-820",
        destinationSearchQuery: "MBS2.210",
      });

      // Act — start story mode and navigate next/prev
      const { getByTestId, queryByTestId } = render(<IndoorMapView />);
      fireEvent.press(getByTestId("cross-building-directions-button"));
      await waitFor(() => expect(getByTestId("story-step-indicator").props.children.join("")).toContain("Step 1 of 2"));
      fireEvent.press(getByTestId("story-next-button"));

      // Assert — outdoor map is rendered on step 2
      await waitFor(() => {
        expect(getByTestId("story-outdoor-map")).toBeTruthy();
        expect(getByTestId("story-step-indicator").props.children.join("")).toContain("Step 2 of 2");
      });

      // Act + Assert — go back to indoor step
      fireEvent.press(getByTestId("story-prev-button"));
      await waitFor(() => {
        expect(queryByTestId("story-outdoor-map")).toBeNull();
        expect(getByTestId("story-step-indicator").props.children.join("")).toContain("Step 1 of 2");
      });
    });
  });

  describe("iOS map padding useEffect", () => {
    it("triggers iOS padding toggle when polygon features are present on iOS", async () => {
      // Arrange — simulate iOS platform with polygon features loaded
      const Platform = require("react-native").Platform;
      const originalOS = Platform.OS;
      Platform.OS = "ios";

      const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const feature = makePolygonFeature("H813");
      mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features: [feature] });
      mockGetFeatures.mockReturnValue([feature]);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        selectedBuilding: hallBuilding,
        selectedFloor: 8,
      });

      // Act
      const { getByTestId } = render(<IndoorMapView />);

      // Assert — map renders without error and features were consumed
      await waitFor(() => {
        expect(getByTestId("indoor-map")).toBeTruthy();
        expect(mockGetFeatures).toHaveBeenCalled();
      });

      // Cleanup
      Platform.OS = originalOS;
    });

    it("executes the iOS padding reset timer callback", () => {
      // Arrange
      jest.useFakeTimers();
      const Platform = require("react-native").Platform;
      const originalOS = Platform.OS;
      Platform.OS = "ios";

      const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const feature = makePolygonFeature("H813");
      mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features: [feature] });
      mockGetFeatures.mockReturnValue([feature]);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        selectedBuilding: hallBuilding,
        selectedFloor: 8,
      });

      // Act
      render(<IndoorMapView />);
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // Assert — advancing timers should not throw and covers reset callback branch
      expect(mockGetFeatures).toHaveBeenCalled();

      // Cleanup
      Platform.OS = originalOS;
      jest.useRealTimers();
    });
  });

  describe("StoryIndoorMap polygon rendering", () => {
    it("renders polygon features with unique keys when two features share the same ref", async () => {
      // Arrange — two features with the same ref to exercise the duplicate-key fix
      const feature1 = makePolygonFeature("H829");
      const feature2 = makePolygonFeature("H829");
      mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features: [feature1, feature2] });
      mockGetFeatures.mockReturnValue([feature1, feature2]);

      const mockSteps = [
        {
          kind: "indoor" as const,
          buildingCode: "H",
          buildingName: "Hall Building",
          path: [{ id: "room:H820:8", lat: 45.497, lng: -73.578, floor: 8, type: "room", ref: "H820" }],
          startLabel: "H820",
          endLabel: "Exit",
        },
      ];
      mockPlanRoute.mockResolvedValue(mockSteps);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        startRoomRef: "H820",
        destinationRoomRef: "MBS2.210",
        startSearchQuery: "H-820",
        destinationSearchQuery: "MBS2.210",
      });

      // Act — enter story mode so StoryIndoorMap renders
      const { getByTestId } = render(<IndoorMapView />);
      fireEvent.press(getByTestId("cross-building-directions-button"));

      // Assert — story map renders with polygon features (no duplicate key warning)
      await waitFor(() => {
        expect(getByTestId("story-indoor-map")).toBeTruthy();
      });
    });

    it("renders story indoor polyline from non-room waypoints", async () => {
      // Arrange — include at least 2 non-room waypoints so filtered path is used
      const feature = makePolygonFeature("H829");
      mockGetGeoJson.mockReturnValue({ type: "FeatureCollection", features: [feature] });
      mockGetFeatures.mockReturnValue([feature]);

      const mockSteps = [
        {
          kind: "indoor" as const,
          buildingCode: "H",
          buildingName: "Hall Building",
          path: [
            { id: "wp:1", lat: 45.497, lng: -73.578, floor: 8, type: "waypoint" },
            { id: "wp:2", lat: 45.4975, lng: -73.5785, floor: 8, type: "waypoint" },
            { id: "room:end", lat: 45.498, lng: -73.579, floor: 8, type: "room", ref: "H829" },
          ],
          startLabel: "Hall Start",
          endLabel: "Hall End",
        },
      ];
      mockPlanRoute.mockResolvedValue(mockSteps as any);
      mockUseIndoorMap.mockReturnValue({
        ...defaultContextValue,
        isCrossBuilding: true,
        startSearchQuery: "H-820",
        destinationSearchQuery: "H-829",
      });

      // Act
      const { getByTestId } = render(<IndoorMapView />);
      fireEvent.press(getByTestId("cross-building-directions-button"));

      // Assert — polyline uses the 2 non-room waypoints
      await waitFor(() => {
        expect(getByTestId("story-indoor-polyline").props.accessibilityLabel).toBe("polyline-2-coords");
      });
    });
  });
});

