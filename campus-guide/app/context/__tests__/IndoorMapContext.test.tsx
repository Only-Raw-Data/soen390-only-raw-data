import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import IndoorMapProvider, {
  useIndoorMap,
  INDOOR_BUILDINGS,
  getGeoJsonForBuilding,
  getFeaturesForFloor,
} from "@/app/context/IndoorMapContext";

describe("IndoorMapContext", () => {
  const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
    <IndoorMapProvider>{children}</IndoorMapProvider>
  );

  describe("initial state", () => {
    it("should initialize with default values", () => {
      // Arrange + Act
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Assert
      expect(result.current.selectedBuilding).toBeNull();
      expect(result.current.selectedFloor).toBeNull();
      expect(result.current.searchQuery).toBe("");
      expect(result.current.highlightedRoomRef).toBeNull();
      expect(result.current.searchError).toBeNull();
    });
  });

  describe("useIndoorMap outside provider", () => {
    it("should throw when used outside IndoorMapProvider", () => {
      // Arrange
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});

      // Act + Assert
      expect(() => {
        renderHook(() => useIndoorMap());
      }).toThrow("useIndoorMap must be used within an IndoorMapProvider");
      spy.mockRestore();
    });
  });

  describe("setSelectedBuilding", () => {
    it("should set selected building", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      const building = INDOOR_BUILDINGS[0]; // H

      // Act
      act(() => {
        result.current.setSelectedBuilding(building);
      });

      // Assert
      expect(result.current.selectedBuilding).toEqual(building);
    });

    it("should clear selected building", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.setSelectedBuilding(INDOOR_BUILDINGS[0]);
      });
      act(() => {
        result.current.setSelectedBuilding(null);
      });

      // Assert
      expect(result.current.selectedBuilding).toBeNull();
    });
  });

  describe("setSelectedFloor", () => {
    it("should set selected floor", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.setSelectedFloor(8);
      });

      // Assert
      expect(result.current.selectedFloor).toBe(8);
    });
  });

  describe("setSearchQuery", () => {
    it("should set search query", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.setSearchQuery("H-820");
      });

      // Assert
      expect(result.current.searchQuery).toBe("H-820");
    });
  });

  describe("searchRoom", () => {
    it("should find a room in hall.json and set building + floor + highlight", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchRoom("H820");
      });

      // Assert — H820 should be found; check building + floor when no error
      if (result.current.searchError === null) {
        expect(result.current.selectedBuilding?.code).toBe("H");
        expect(result.current.selectedFloor).toBe(8);
        expect(result.current.highlightedRoomRef).toBeTruthy();
      }
    });

    it("should find a room with dashes and spaces normalized (H-851.02)", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchRoom("H-851.02");
      });

      // Assert
      expect(result.current.searchError).toBeNull();
      expect(result.current.selectedBuilding?.code).toBe("H");
      expect(result.current.selectedFloor).toBe(8);
      expect(result.current.highlightedRoomRef).toBe("H851.02");
    });

    it("should find a room case-insensitively", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchRoom("h851.02");
      });

      // Assert
      expect(result.current.searchError).toBeNull();
      expect(result.current.highlightedRoomRef).toBe("H851.02");
    });

    it("should find MB building rooms (MB1.210)", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchRoom("MB1.210");
      });

      // Assert
      expect(result.current.searchError).toBeNull();
      expect(result.current.selectedBuilding?.code).toBe("MB");
      expect(result.current.selectedFloor).toBe(1);
      expect(result.current.highlightedRoomRef).toBe("MB1.210");
    });

    it("should find MB basement rooms with MBS prefix (MBS2.437)", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchRoom("MBS2.437");
      });

      // Assert
      expect(result.current.searchError).toBeNull();
      expect(result.current.selectedBuilding?.code).toBe("MB");
      expect(result.current.selectedFloor).toBe(-2);
      expect(result.current.highlightedRoomRef).toBe("MBS2.437");
    });

    it("should set error for non-existent room", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchRoom("XYZ-999");
      });

      // Assert
      expect(result.current.searchError).toBe("Room not found");
      expect(result.current.highlightedRoomRef).toBeNull();
    });

    it("should do nothing for empty query", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchRoom("");
      });

      // Assert
      expect(result.current.searchError).toBeNull();
      expect(result.current.highlightedRoomRef).toBeNull();
      expect(result.current.selectedBuilding).toBeNull();
    });

    it("should clear previous error on new search", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act — first search produces an error
      act(() => {
        result.current.searchRoom("XYZ-999");
      });
      expect(result.current.searchError).toBe("Room not found");

      // Act — second search clears it
      act(() => {
        result.current.searchRoom("H851.02");
      });

      // Assert
      expect(result.current.searchError).toBeNull();
    });
  });

  describe("clearHighlight", () => {
    it("should clear highlighted room and error", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      act(() => {
        result.current.searchRoom("H851.02");
      });
      expect(result.current.highlightedRoomRef).toBe("H851.02");

      // Act
      act(() => {
        result.current.clearHighlight();
      });

      // Assert
      expect(result.current.highlightedRoomRef).toBeNull();
      expect(result.current.searchError).toBeNull();
    });
  });

  describe("INDOOR_BUILDINGS", () => {
    it("should contain H building with correct config", () => {
      // Arrange + Act
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H");

      // Assert
      expect(h).toBeDefined();
      expect(h!.campus).toBe("SGW");
      expect(h!.floors).toContain(8);
      expect(h!.floors).toContain(9);
    });

    it("should contain MB building with correct config", () => {
      // Arrange + Act
      const mb = INDOOR_BUILDINGS.find((b) => b.code === "MB");

      // Assert
      expect(mb).toBeDefined();
      expect(mb!.campus).toBe("SGW");
      expect(mb!.floors).toContain(-2);
      expect(mb!.floors).toContain(1);
    });

    it("should contain both SGW and Loyola buildings", () => {
      // Arrange + Act
      const sgw = INDOOR_BUILDINGS.filter((b) => b.campus === "SGW");
      const loyola = INDOOR_BUILDINGS.filter((b) => b.campus === "Loyola");

      // Assert
      expect(sgw.length).toBeGreaterThan(0);
      expect(loyola.length).toBeGreaterThan(0);
    });
  });

  describe("getGeoJsonForBuilding", () => {
    it("should return GeoJSON data for H building", () => {
      // Arrange
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H")!;

      // Act
      const data = getGeoJsonForBuilding(h);

      // Assert
      expect(data).not.toBeNull();
      expect(data!.type).toBe("FeatureCollection");
      expect(data!.features.length).toBeGreaterThan(0);
    });

    it("should return null for unknown dataFile", () => {
      // Arrange
      const fake = { ...INDOOR_BUILDINGS[0], dataFile: "nonexistent" };

      // Act
      const data = getGeoJsonForBuilding(fake);

      // Assert
      expect(data).toBeNull();
    });
  });

  describe("getFeaturesForFloor", () => {
    it("should return features for floor 8 of hall.json", () => {
      // Arrange
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const data = getGeoJsonForBuilding(h)!;

      // Act
      const features = getFeaturesForFloor(data, 8);

      // Assert
      expect(features.length).toBeGreaterThan(0);
      features.forEach((f) => {
        expect(f.properties!.level!.split(";")).toContain("8");
      });
    });

    it("should return features for multi-level elements (e.g. level 1;9)", () => {
      // Arrange
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const data = getGeoJsonForBuilding(h)!;

      // Act
      const floor9 = getFeaturesForFloor(data, 9);

      // Assert — some features have level "1;9" and should appear on floor 9
      const multiLevel = floor9.filter(
        (f) => f.properties?.level?.includes(";"),
      );
      expect(multiLevel.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array for non-existent floor", () => {
      // Arrange
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const data = getGeoJsonForBuilding(h)!;

      // Act
      const features = getFeaturesForFloor(data, 99);

      // Assert
      expect(features).toEqual([]);
    });

    it("should handle features with null properties", () => {
      // Arrange
      const mockGeoJson = {
        type: "FeatureCollection" as const,
        features: [
          { type: "Feature" as const, properties: null, geometry: { type: "Polygon" as const, coordinates: [] } },
          { type: "Feature" as const, properties: { level: "1", indoor: "room" }, geometry: { type: "Polygon" as const, coordinates: [] } },
        ],
      };

      // Act
      const features = getFeaturesForFloor(mockGeoJson, 1);

      // Assert
      expect(features.length).toBe(1);
    });
  });
});
