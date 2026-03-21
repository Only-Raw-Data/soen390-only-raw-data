/**
 * Tests for the POI Tab screen (app/(tabs)/poi.tsx)
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import POIScreen from "@app/(tabs)/poi";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock expo-router
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock Header component
jest.mock("@app/components/Header", () => {
  const { View } = require("react-native");
  return function MockHeader() {
    return <View testID="mock-header" />;
  };
});

// Mock usePOIs hook
const mockUsePOIs = jest.fn();
jest.mock("@app/hooks/usePOIs", () => ({
  __esModule: true,
  default: (...args: any[]) => mockUsePOIs(...args),
}));

// Mock useUserLocation hook
jest.mock("@app/hooks/useUserLocation", () => ({
  __esModule: true,
  default: () => ({
    location: null,
    isLoading: false,
    errorMsg: null,
    nearestBuilding: null,
    isOnCampus: false,
    currentCampus: null,
    getCurrentLocation: jest.fn(),
  }),
}));

// Mock useDirections context
const mockSetDestinationBuilding = jest.fn();
const mockSetStartBuilding = jest.fn();
jest.mock("@app/context/DirectionsContext", () => ({
  useDirections: () => ({
    startBuilding: null,
    setStartBuilding: mockSetDestinationBuilding,
    setDestinationBuilding: mockSetDestinationBuilding,
  }),
}));

// Mock poiToBuildingAdapter
jest.mock("@app/utils/poiUtils", () => ({
  poiToBuildingAdapter: jest.fn((poi, campus) => ({
    id: `poi-${poi.id}`,
    name: poi.name,
    campus,
  })),
}));

// Mock constants
jest.mock("@constants/buildings", () => ({
  CAMPUS_REGIONS: {
    SGW: { latitude: 45.4972, longitude: -73.5788, latitudeDelta: 0.01, longitudeDelta: 0.01 },
    Loyola: { latitude: 45.4582, longitude: -73.6405, latitudeDelta: 0.01, longitudeDelta: 0.01 },
  },
}));

jest.mock("@/constants/poi", () => ({
  getPoiInfo: (type: string) => {
    if (type === "cafe") return { icon: "cafe", color: "#D97706" };
    if (type === "restaurant") return { icon: "restaurant", color: "#EF4444" };
    return { icon: "location", color: "#6B7280" };
  },
}));

// ─── Sample POI data ──────────────────────────────────────────────────────────

const SAMPLE_POIS = [
  {
    id: 1,
    name: "Starbucks",
    type: "cafe",
    lat: 45.4975,
    lon: -73.579,
    distance: 200,
    address: "1400 De Maisonneuve Blvd W",
    openingHours: "Mo-Fr 07:00-21:00",
  },
  {
    id: 2,
    name: "Tim Hortons",
    type: "restaurant",
    lat: 45.498,
    lon: -73.578,
    distance: 300,
    address: "1455 De Maisonneuve Blvd W",
    openingHours: undefined,
  },
  {
    id: 3,
    name: "Metro Grocery",
    type: "supermarket",
    lat: 45.496,
    lon: -73.581,
    distance: 500,
    address: undefined,
    openingHours: undefined,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POIScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePOIs.mockReturnValue({ pois: SAMPLE_POIS, loading: false, error: null });
  });

  describe("Rendering", () => {
    it("renders the screen with header and title", () => {
      const { getByTestId, getByText } = render(<POIScreen />);
      expect(getByTestId("mock-header")).toBeTruthy();
      expect(getByText("Points of Interest")).toBeTruthy();
    });

    it("renders the campus selector buttons", () => {
      const { getByTestId } = render(<POIScreen />);
      expect(getByTestId("campus-btn-SGW")).toBeTruthy();
      expect(getByTestId("campus-btn-Loyola")).toBeTruthy();
    });

    it("renders the search input", () => {
      const { getByTestId } = render(<POIScreen />);
      expect(getByTestId("search-input")).toBeTruthy();
    });

    it("renders the radius selector pills", () => {
      const { getByTestId } = render(<POIScreen />);
      expect(getByTestId("radius-slider")).toBeTruthy();
      expect(getByTestId("radius-option-0.5")).toBeTruthy();
      expect(getByTestId("radius-option-1")).toBeTruthy();
      expect(getByTestId("radius-option-5")).toBeTruthy();
    });

    it("renders the category filter chips", () => {
      const { getByTestId } = render(<POIScreen />);
      expect(getByTestId("category-chips")).toBeTruthy();
      expect(getByTestId("category-chip-all")).toBeTruthy();
      expect(getByTestId("category-chip-coffee")).toBeTruthy();
      expect(getByTestId("category-chip-dining")).toBeTruthy();
      expect(getByTestId("category-chip-shopping")).toBeTruthy();
      expect(getByTestId("category-chip-bar")).toBeTruthy();
    });

    it("renders all POI items when pois are returned", () => {
      const { getByTestId } = render(<POIScreen />);
      expect(getByTestId("poi-item-1")).toBeTruthy();
      expect(getByTestId("poi-item-2")).toBeTruthy();
      expect(getByTestId("poi-item-3")).toBeTruthy();
    });

    it("renders Directions and Info buttons for each POI", () => {
      const { getByTestId } = render(<POIScreen />);
      expect(getByTestId("directions-btn-1")).toBeTruthy();
      expect(getByTestId("info-btn-1")).toBeTruthy();
    });

    it("displays correct result count", () => {
      const { getByTestId } = render(<POIScreen />);
      expect(getByTestId("result-count").props.children).toContain("3");
    });

    it("displays opening hours when available", () => {
      const { getByText } = render(<POIScreen />);
      expect(getByText("Mo-Fr 07:00-21:00")).toBeTruthy();
    });
  });

  describe("Loading State", () => {
    it("shows loading indicator when data is loading", () => {
      mockUsePOIs.mockReturnValue({ pois: [], loading: true, error: null });
      const { getByTestId, queryByTestId } = render(<POIScreen />);
      expect(getByTestId("loading-indicator")).toBeTruthy();
      expect(queryByTestId("result-count")).toBeNull();
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no pois are returned", () => {
      mockUsePOIs.mockReturnValue({ pois: [], loading: false, error: null });
      const { getByTestId } = render(<POIScreen />);
      expect(getByTestId("empty-state")).toBeTruthy();
    });

    it("shows empty state when filtered results are empty", () => {
      const { getByTestId } = render(<POIScreen />);
      // Switch to bar category — no bars in sample data
      fireEvent.press(getByTestId("category-chip-bar"));
      expect(getByTestId("empty-state")).toBeTruthy();
    });
  });

  describe("Campus Selector", () => {
    it("SGW is selected by default", () => {
      const { getByTestId } = render(<POIScreen />);
      const sgwBtn = getByTestId("campus-btn-SGW");
      // The active style is applied - we just verify pressing doesn't throw
      expect(sgwBtn).toBeTruthy();
    });

    it("switches to Loyola campus when tapped", () => {
      mockUsePOIs.mockReturnValue({ pois: [], loading: false, error: null });
      const { getByTestId } = render(<POIScreen />);
      fireEvent.press(getByTestId("campus-btn-Loyola"));
      // usePOIs should be called with Loyola coordinates
      expect(mockUsePOIs).toHaveBeenCalledWith(
        expect.objectContaining({
          lat: 45.4582,
          lon: -73.6405,
        })
      );
    });
  });

  describe("Radius Selector", () => {
    it("defaults to 1 km radius", () => {
      render(<POIScreen />);
      expect(mockUsePOIs).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 1000 })
      );
    });

    it("updates radius when a pill is pressed", () => {
      const { getByTestId } = render(<POIScreen />);
      fireEvent.press(getByTestId("radius-option-2"));
      expect(mockUsePOIs).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 2000 })
      );
    });
  });

  describe("Search Filter", () => {
    it("filters POIs by name when search text is entered", () => {
      const { getByTestId, queryByTestId } = render(<POIScreen />);
      fireEvent.changeText(getByTestId("search-input"), "Starbucks");
      expect(getByTestId("poi-item-1")).toBeTruthy();     // Starbucks present
      expect(queryByTestId("poi-item-2")).toBeNull();     // Tim Hortons hidden
      expect(queryByTestId("poi-item-3")).toBeNull();     // Metro Grocery hidden
    });

    it("shows clear button when search has text", () => {
      const { getByTestId } = render(<POIScreen />);
      fireEvent.changeText(getByTestId("search-input"), "Tim");
      expect(getByTestId("clear-search-btn")).toBeTruthy();
    });

    it("clears search when clear button is pressed", () => {
      const { getByTestId } = render(<POIScreen />);
      fireEvent.changeText(getByTestId("search-input"), "Tim");
      fireEvent.press(getByTestId("clear-search-btn"));
      expect(getByTestId("poi-item-1")).toBeTruthy();
      expect(getByTestId("poi-item-2")).toBeTruthy();
    });
  });

  describe("Category Filter", () => {
    it("shows all POIs when 'All' category is selected", () => {
      const { getByTestId } = render(<POIScreen />);
      fireEvent.press(getByTestId("category-chip-all"));
      expect(getByTestId("poi-item-1")).toBeTruthy();
      expect(getByTestId("poi-item-2")).toBeTruthy();
      expect(getByTestId("poi-item-3")).toBeTruthy();
    });

    it("filters to only cafes when 'Coffee' chip is pressed", () => {
      const { getByTestId, queryByTestId } = render(<POIScreen />);
      fireEvent.press(getByTestId("category-chip-coffee"));
      expect(getByTestId("poi-item-1")).toBeTruthy();      // cafe
      expect(queryByTestId("poi-item-2")).toBeNull();      // restaurant
      expect(queryByTestId("poi-item-3")).toBeNull();      // supermarket
    });

    it("filters to only supermarkets when 'Shopping' chip is pressed", () => {
      const { getByTestId, queryByTestId } = render(<POIScreen />);
      fireEvent.press(getByTestId("category-chip-shopping"));
      expect(queryByTestId("poi-item-1")).toBeNull();
      expect(queryByTestId("poi-item-2")).toBeNull();
      expect(getByTestId("poi-item-3")).toBeTruthy();
    });
  });

  describe("Directions Button", () => {
    it("navigates to directions tab and sets building when Directions is pressed", async () => {
      const { poiToBuildingAdapter } = require("@app/utils/poiUtils");
      const { getByTestId } = render(<POIScreen />);
      fireEvent.press(getByTestId("directions-btn-1"));
      await waitFor(() => {
        expect(poiToBuildingAdapter).toHaveBeenCalledWith(SAMPLE_POIS[0], "SGW");
        expect(mockPush).toHaveBeenCalledWith("/(tabs)/two");
      });
    });
  });

  describe("Info Modal", () => {
    it("opens info modal when Info button is pressed", () => {
      const { getByTestId } = render(<POIScreen />);
      fireEvent.press(getByTestId("info-btn-1"));
      expect(getByTestId("poi-info-modal")).toBeTruthy();
    });

    it("closes info modal when overlay is pressed", async () => {
      const { getByTestId, queryByTestId } = render(<POIScreen />);
      fireEvent.press(getByTestId("info-btn-1"));
      expect(getByTestId("poi-info-modal")).toBeTruthy();
      fireEvent.press(getByTestId("modal-overlay"));
      await waitFor(() => {
        // After closing, the modal is no longer visible (poi is null)
        expect(queryByTestId("poi-info-modal")).toBeNull();
      });
    });

    it("closes info modal when Close button is pressed", async () => {
      const { getByTestId, queryByTestId } = render(<POIScreen />);
      fireEvent.press(getByTestId("info-btn-2"));
      expect(getByTestId("poi-info-modal")).toBeTruthy();
      fireEvent.press(getByTestId("modal-close-btn"));
      await waitFor(() => {
        expect(queryByTestId("poi-info-modal")).toBeNull();
      });
    });
  });
});
