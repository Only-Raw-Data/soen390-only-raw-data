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
  setSelectedBuilding: jest.fn(),
  setSelectedFloor: jest.fn(),
  setSearchQuery: jest.fn(),
  searchRoom: jest.fn(),
  clearHighlight: jest.fn(),
};

describe("IndoorMapView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIndoorMap.mockReturnValue({ ...defaultContextValue });
  });

  it("renders search bar", () => {
    // Arrange + Act
    const { getByTestId } = render(<IndoorMapView />);

    // Assert
    expect(getByTestId("room-search-input")).toBeTruthy();
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

  it("calls searchRoom on search submit", () => {
    // Arrange
    const searchRoom = jest.fn();
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      searchQuery: "H-851",
      searchRoom,
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent(getByTestId("room-search-input"), "submitEditing");

    // Assert
    expect(searchRoom).toHaveBeenCalledWith("H-851");
  });

  it("clears search on clear button press", () => {
    // Arrange
    const setSearchQuery = jest.fn();
    const clearHighlight = jest.fn();
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      searchQuery: "H-851",
      setSearchQuery,
      clearHighlight,
    });

    // Act
    const { getByTestId } = render(<IndoorMapView />);
    fireEvent.press(getByTestId("room-search-clear"));

    // Assert
    expect(setSearchQuery).toHaveBeenCalledWith("");
    expect(clearHighlight).toHaveBeenCalled();
  });

  it("displays search error", () => {
    // Arrange
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      searchError: "Room not found",
    });

    // Act
    const { getByText } = render(<IndoorMapView />);

    // Assert
    expect(getByText("Room not found")).toBeTruthy();
  });

  it("does not render info bar when no room is highlighted", () => {
    // Arrange + Act
    const { queryByText } = render(<IndoorMapView />);

    // Assert
    expect(queryByText("Floor:")).toBeNull();
  });
});
