import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import IndoorMapView from "@/app/components/IndoorMapView";
import { useIndoorMap, INDOOR_BUILDINGS } from "@/app/context/IndoorMapContext";

// Mock the IndoorMapContext
jest.mock("@/app/context/IndoorMapContext", () => {
  const actual = jest.requireActual("@/app/context/IndoorMapContext");
  return {
    ...actual,
    useIndoorMap: jest.fn(),
  };
});

// Mock mapStyle constant
jest.mock("@/constants/mapStyle", () => ({
  CAMPUS_MAP_STYLE: [],
}));

const mockUseIndoorMap = useIndoorMap as jest.MockedFunction<
  typeof useIndoorMap
>;

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
};

describe("IndoorMapView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIndoorMap.mockReturnValue({ ...defaultContextValue });
  });

  it("renders start and destination search bars", () => {
    // Arrange + Act
    const { getByTestId } = render(<IndoorMapView />);

    // Assert
    expect(getByTestId("room-search-start-input")).toBeTruthy();
    expect(getByTestId("room-search-destination-input")).toBeTruthy();
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
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      startSearchQuery: "H-851",
      searchStartRoom,
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent(getByTestId("room-search-start-input"), "submitEditing");

    // Assert
    expect(searchStartRoom).toHaveBeenCalledWith("H-851");
  });

  it("calls searchDestinationRoom on destination search submit", () => {
    // Arrange
    const searchDestinationRoom = jest.fn();
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      destinationSearchQuery: "MB1.210",
      searchDestinationRoom,
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent(getByTestId("room-search-destination-input"), "submitEditing");

    // Assert
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
});
