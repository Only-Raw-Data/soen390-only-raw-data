import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import IndoorMapView from "../IndoorMapView";
import { useIndoorMap, INDOOR_BUILDINGS } from "../../context/IndoorMapContext";

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
    const { getByTestId } = render(<IndoorMapView />);

    expect(getByTestId("room-search-input")).toBeTruthy();
  });

  it("renders all building pills", () => {
    const { getByText } = render(<IndoorMapView />);

    expect(getByText("H")).toBeTruthy();
    expect(getByText("MB")).toBeTruthy();
    expect(getByText("EV")).toBeTruthy();
    expect(getByText("VL")).toBeTruthy();
  });

  it("renders map view", () => {
    const { getByTestId } = render(<IndoorMapView />);

    expect(getByTestId("indoor-map")).toBeTruthy();
  });

  it("does not render floor selector when no building selected", () => {
    const { queryByTestId } = render(<IndoorMapView />);

    expect(queryByTestId("floor-button-1")).toBeNull();
  });

  it("renders floor selector when building is selected", () => {
    const hallBuilding = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      selectedBuilding: hallBuilding,
      selectedFloor: 1,
    });

    const { getByText } = render(<IndoorMapView />);

    // H building has floors [1, 2, 3, 8, 9]
    expect(getByText("1")).toBeTruthy();
    expect(getByText("2")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
    expect(getByText("8")).toBeTruthy();
    expect(getByText("9")).toBeTruthy();
  });

  it("renders negative floors as B-prefix (e.g. B2)", () => {
    const mbBuilding = INDOOR_BUILDINGS.find((b) => b.code === "MB")!;
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      selectedBuilding: mbBuilding,
      selectedFloor: -2,
    });

    const { getByText } = render(<IndoorMapView />);

    expect(getByText("B2")).toBeTruthy();
  });

  it("calls setSelectedBuilding and setSelectedFloor when building pill pressed", () => {
    const setSelectedBuilding = jest.fn();
    const setSelectedFloor = jest.fn();
    const clearHighlight = jest.fn();
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      setSelectedBuilding,
      setSelectedFloor,
      clearHighlight,
    });

    const { getByTestId } = render(<IndoorMapView />);
    fireEvent.press(getByTestId("building-pill-H"));

    expect(clearHighlight).toHaveBeenCalled();
    expect(setSelectedBuilding).toHaveBeenCalledWith(
      expect.objectContaining({ code: "H" }),
    );
    expect(setSelectedFloor).toHaveBeenCalledWith(1); // first floor of H
  });

  it("calls setSelectedFloor when floor button pressed", () => {
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

    const { getByTestId } = render(<IndoorMapView />);
    fireEvent.press(getByTestId("floor-button-8"));

    expect(clearHighlight).toHaveBeenCalled();
    expect(setSelectedFloor).toHaveBeenCalledWith(8);
  });

  it("calls searchRoom on search submit", () => {
    const searchRoom = jest.fn();
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      searchQuery: "H-851",
      searchRoom,
    });

    const { getByTestId } = render(<IndoorMapView />);
    fireEvent(getByTestId("room-search-input"), "submitEditing");

    expect(searchRoom).toHaveBeenCalledWith("H-851");
  });

  it("clears search on clear button press", () => {
    const setSearchQuery = jest.fn();
    const clearHighlight = jest.fn();
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      searchQuery: "H-851",
      setSearchQuery,
      clearHighlight,
    });

    const { getByTestId } = render(<IndoorMapView />);
    fireEvent.press(getByTestId("room-search-clear"));

    expect(setSearchQuery).toHaveBeenCalledWith("");
    expect(clearHighlight).toHaveBeenCalled();
  });

  it("displays search error", () => {
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
      searchError: "Room not found",
    });

    const { getByText } = render(<IndoorMapView />);

    expect(getByText("Room not found")).toBeTruthy();
  });

  it("does not render info bar when no room is highlighted", () => {
    mockUseIndoorMap.mockReturnValue({
      ...defaultContextValue,
    });

    const { queryByText } = render(<IndoorMapView />);

    expect(queryByText("Floor:")).toBeNull();
  });
});
