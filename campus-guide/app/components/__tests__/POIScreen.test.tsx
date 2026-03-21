/**
 * Tests for the POI Tab screen (app/(tabs)/poi.tsx)
 */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import POIScreen from "@app/(tabs)/poi";
import { POIProvider } from "@app/context/POIContext";

const renderWithProvider = (ui: React.ReactElement) =>
  render(<POIProvider>{ui}</POIProvider>);

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
    SGW: {
      latitude: 45.4972,
      longitude: -73.5788,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
    Loyola: {
      latitude: 45.4582,
      longitude: -73.6405,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
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
    // Arrange: Reset mocks and set default return value for usePOIs
    jest.clearAllMocks();
    mockUsePOIs.mockReturnValue({
      pois: SAMPLE_POIS,
      loading: false,
      error: null,
    });
  });

  describe("Rendering", () => {
    it("renders the screen with header and title", () => {
      // Act: Render the screen with the provider
      const { getByTestId, getByText } = renderWithProvider(<POIScreen />);

      // Assert: Verify core elements are present
      expect(getByTestId("mock-header")).toBeTruthy();
      expect(getByText("Points of Interest")).toBeTruthy();
    });

    it("renders the campus selector buttons", () => {
      // Act
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByTestId("campus-btn-SGW")).toBeTruthy();
      expect(getByTestId("campus-btn-Loyola")).toBeTruthy();
    });

    it("renders the search input", () => {
      // Act
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByTestId("search-input")).toBeTruthy();
    });

    it("renders the radius selector pills", () => {
      // Act
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByTestId("radius-slider")).toBeTruthy();
      expect(getByTestId("radius-option-0.5")).toBeTruthy();
      expect(getByTestId("radius-option-1")).toBeTruthy();
      expect(getByTestId("radius-option-5")).toBeTruthy();
    });

    it("renders the category filter chips", () => {
      // Act
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByTestId("category-chips")).toBeTruthy();
      expect(getByTestId("category-chip-all")).toBeTruthy();
      expect(getByTestId("category-chip-coffee")).toBeTruthy();
      expect(getByTestId("category-chip-dining")).toBeTruthy();
      expect(getByTestId("category-chip-shopping")).toBeTruthy();
      expect(getByTestId("category-chip-bar")).toBeTruthy();
    });

    it("renders all POI items when pois are returned", () => {
      // Act
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByTestId("poi-item-1")).toBeTruthy();
      expect(getByTestId("poi-item-2")).toBeTruthy();
      expect(getByTestId("poi-item-3")).toBeTruthy();
    });

    it("renders Directions and Info buttons for each POI", () => {
      // Act
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByTestId("directions-btn-1")).toBeTruthy();
      expect(getByTestId("info-btn-1")).toBeTruthy();
    });

    it("displays correct result count", () => {
      // Act
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByTestId("result-count").props.children).toContain("3");
    });

    it("displays opening hours when available", () => {
      // Act
      const { getByText } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByText("Mo-Fr 07:00-21:00")).toBeTruthy();
    });
  });

  describe("Loading State", () => {
    it("shows loading indicator when data is loading", () => {
      // Arrange
      mockUsePOIs.mockReturnValue({ pois: [], loading: true, error: null });

      // Act
      const { getByTestId, queryByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByTestId("loading-indicator")).toBeTruthy();
      expect(queryByTestId("result-count")).toBeNull();
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no pois are returned", () => {
      // Arrange
      mockUsePOIs.mockReturnValue({ pois: [], loading: false, error: null });

      // Act
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      expect(getByTestId("empty-state")).toBeTruthy();
    });

    it("shows empty state when filtered results are empty", () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Act: Switch to bar category — no bars in sample data
      fireEvent.press(getByTestId("category-chip-bar"));

      // Assert
      expect(getByTestId("empty-state")).toBeTruthy();
    });
  });

  describe("Campus Selector", () => {
    it("SGW is selected by default", () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Assert
      const sgwBtn = getByTestId("campus-btn-SGW");
      expect(sgwBtn).toBeTruthy();
    });

    it("switches to Loyola campus when tapped", async () => {
      // Arrange
      mockUsePOIs.mockReturnValue({ pois: [], loading: false, error: null });
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Act
      fireEvent.press(getByTestId("campus-btn-Loyola"));

      // Assert: usePOIs should be called with Loyola coordinates (wait for 300ms debounce)
      await waitFor(() => {
        expect(mockUsePOIs).toHaveBeenCalledWith(
          expect.objectContaining({
            lat: 45.4582,
            lon: -73.6405,
          }),
        );
      });
    });
  });

  describe("Radius Selector", () => {
    it("defaults to 1 km radius", () => {
      // Act
      renderWithProvider(<POIScreen />);

      // Assert: Verify hook was called with default radius (1000m)
      expect(mockUsePOIs).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 1000 }),
      );
    });

    it("updates radius when a pill is pressed", () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Act
      fireEvent.press(getByTestId("radius-option-2"));

      // Assert: Verify hook was updated with new radius
      expect(mockUsePOIs).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 2000 }),
      );
    });
  });

  describe("Search Filter", () => {
    it("filters POIs by name when search text is entered", () => {
      // Arrange
      const { getByTestId, queryByTestId } = renderWithProvider(<POIScreen />);

      // Act
      fireEvent.changeText(getByTestId("search-input"), "Starbucks");

      // Assert
      expect(getByTestId("poi-item-1")).toBeTruthy(); // Starbucks present
      expect(queryByTestId("poi-item-2")).toBeNull(); // Tim Hortons hidden
      expect(queryByTestId("poi-item-3")).toBeNull(); // Metro Grocery hidden
    });

    it("shows clear button when search has text", () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Act
      fireEvent.changeText(getByTestId("search-input"), "Tim");

      // Assert
      expect(getByTestId("clear-search-btn")).toBeTruthy();
    });

    it("clears search when clear button is pressed", () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<POIScreen />);
      fireEvent.changeText(getByTestId("search-input"), "Tim");

      // Act
      fireEvent.press(getByTestId("clear-search-btn"));

      // Assert
      expect(getByTestId("poi-item-1")).toBeTruthy();
      expect(getByTestId("poi-item-2")).toBeTruthy();
    });
  });

  describe("Category Filter", () => {
    it("shows all POIs when 'All' category is selected", () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Act
      fireEvent.press(getByTestId("category-chip-all"));

      // Assert
      expect(getByTestId("poi-item-1")).toBeTruthy();
      expect(getByTestId("poi-item-2")).toBeTruthy();
      expect(getByTestId("poi-item-3")).toBeTruthy();
    });

    it("filters to only cafes when 'Coffee' chip is pressed", () => {
      // Arrange
      const { getByTestId, queryByTestId } = renderWithProvider(<POIScreen />);

      // Act
      fireEvent.press(getByTestId("category-chip-coffee"));

      // Assert
      expect(getByTestId("poi-item-1")).toBeTruthy(); // cafe
      expect(queryByTestId("poi-item-2")).toBeNull(); // restaurant
      expect(queryByTestId("poi-item-3")).toBeNull(); // supermarket
    });

    it("filters to only supermarkets when 'Shopping' chip is pressed", () => {
      // Arrange
      const { getByTestId, queryByTestId } = renderWithProvider(<POIScreen />);

      // Act
      fireEvent.press(getByTestId("category-chip-shopping"));

      // Assert
      expect(queryByTestId("poi-item-1")).toBeNull();
      expect(queryByTestId("poi-item-2")).toBeNull();
      expect(getByTestId("poi-item-3")).toBeTruthy();
    });
  });

  describe("Directions Button", () => {
    it("navigates to directions tab and sets building when Directions is pressed", async () => {
      // Arrange
      const { poiToBuildingAdapter } = require("@app/utils/poiUtils");
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Act
      fireEvent.press(getByTestId("directions-btn-1"));

      // Assert
      await waitFor(() => {
        expect(poiToBuildingAdapter).toHaveBeenCalledWith(
          SAMPLE_POIS[0],
          "SGW",
        );
        expect(mockPush).toHaveBeenCalledWith("/(tabs)/two");
      });
    });
  });

  describe("Info Modal", () => {
    it("opens info modal when Info button is pressed", () => {
      // Arrange
      const { getByTestId } = renderWithProvider(<POIScreen />);

      // Act
      fireEvent.press(getByTestId("info-btn-1"));

      // Assert
      expect(getByTestId("poi-info-modal")).toBeTruthy();
    });

    it("closes info modal when overlay is pressed", async () => {
      // Arrange
      const { getByTestId, queryByTestId } = renderWithProvider(<POIScreen />);
      fireEvent.press(getByTestId("info-btn-1"));
      expect(getByTestId("poi-info-modal")).toBeTruthy();

      // Act
      fireEvent.press(getByTestId("modal-overlay"));

      // Assert
      await waitFor(() => {
        // After closing, the modal is no longer visible (poi is null)
        expect(queryByTestId("poi-info-modal")).toBeNull();
      });
    });

    it("closes info modal when Close button is pressed", async () => {
      // Arrange
      const { getByTestId, queryByTestId } = renderWithProvider(<POIScreen />);
      fireEvent.press(getByTestId("info-btn-2"));
      expect(getByTestId("poi-info-modal")).toBeTruthy();

      // Act
      fireEvent.press(getByTestId("modal-close-btn"));

      // Assert
      await waitFor(() => {
        expect(queryByTestId("poi-info-modal")).toBeNull();
      });
    });
  });
});
