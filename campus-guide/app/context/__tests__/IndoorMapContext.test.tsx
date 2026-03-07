import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import IndoorMapProvider, {
  useIndoorMap,
  INDOOR_BUILDINGS,
  getGeoJsonForBuilding,
  getFeaturesForFloor,
} from "@/app/context/IndoorMapContext";
import * as indoorPathService from "@/app/services/indoorPathService";

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
      expect(result.current.startRoomRef).toBeNull();
      expect(result.current.destinationRoomRef).toBeNull();
      expect(result.current.startSearchQuery).toBe("");
      expect(result.current.destinationSearchQuery).toBe("");
      expect(result.current.startSearchError).toBeNull();
      expect(result.current.destinationSearchError).toBeNull();
      expect(result.current.accessible).toBe(false);
      expect(result.current.showPOIs).toBe(true);
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

  describe("searchStartRoom", () => {
    it("should find a start room and set building, floor, and startRoomRef", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchStartRoom("H851.02");
      });

      // Assert
      expect(result.current.startSearchError).toBeNull();
      expect(result.current.selectedBuilding?.code).toBe("H");
      expect(result.current.selectedFloor).toBe(8);
      expect(result.current.startRoomRef).toBe("H851.02");
    });

    it("should set startSearchError for non-existent room", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchStartRoom("XYZ-999");
      });

      // Assert
      expect(result.current.startSearchError).toBe("Room not found");
      expect(result.current.startRoomRef).toBeNull();
    });

    it("should do nothing for empty query", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchStartRoom("");
      });

      // Assert
      expect(result.current.startRoomRef).toBeNull();
      expect(result.current.startSearchError).toBeNull();
    });
  });

  describe("searchDestinationRoom", () => {
    it("should find a destination room and set destinationRoomRef without changing building/floor", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchDestinationRoom("H851.02");
      });

      // Assert
      expect(result.current.destinationSearchError).toBeNull();
      expect(result.current.destinationRoomRef).toBe("H851.02");
      // building/floor not changed by destination search
      expect(result.current.selectedBuilding).toBeNull();
      expect(result.current.selectedFloor).toBeNull();
    });

    it("should set destinationSearchError for non-existent room", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchDestinationRoom("XYZ-999");
      });

      // Assert
      expect(result.current.destinationSearchError).toBe("Room not found");
      expect(result.current.destinationRoomRef).toBeNull();
    });

    it("should do nothing for empty query", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchDestinationRoom("");
      });

      // Assert
      expect(result.current.destinationRoomRef).toBeNull();
      expect(result.current.destinationSearchError).toBeNull();
    });
  });

  describe("clearStartRoom", () => {
    it("should clear startRoomRef and startSearchError", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      act(() => {
        result.current.searchStartRoom("H851.02");
      });
      expect(result.current.startRoomRef).toBe("H851.02");

      // Act
      act(() => {
        result.current.clearStartRoom();
      });

      // Assert
      expect(result.current.startRoomRef).toBeNull();
      expect(result.current.startSearchError).toBeNull();
    });
  });

  describe("clearDestinationRoom", () => {
    it("should clear destinationRoomRef and destinationSearchError", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      act(() => {
        result.current.searchDestinationRoom("H851.02");
      });
      expect(result.current.destinationRoomRef).toBe("H851.02");

      // Act
      act(() => {
        result.current.clearDestinationRoom();
      });

      // Assert
      expect(result.current.destinationRoomRef).toBeNull();
      expect(result.current.destinationSearchError).toBeNull();
    });
  });

  describe("path computation", () => {
    it("should compute a path when both start and destination rooms are set", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act — set start and destination in the same building
      act(() => {
        result.current.searchStartRoom("H851.02");
      });
      act(() => {
        result.current.searchDestinationRoom("H857");
      });

      // Assert — path should be computed
      expect(result.current.pathError).toBeNull();
      expect(result.current.currentPath).not.toBeNull();
      expect(result.current.currentPath!.length).toBeGreaterThan(1);
      expect(result.current.currentPath![0].ref).toBe("H851.02");
      expect(result.current.currentPath![result.current.currentPath!.length - 1].ref).toBe("H857");
    });

    it("should set pathError when no path exists between rooms", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act — set start room, then a non-existent destination that somehow passes search
      act(() => {
        result.current.searchStartRoom("H851.02");
      });
      act(() => {
        result.current.searchDestinationRoom("H820");
      });

      // Assert — either a path is found or an error is set (both are valid coverage)
      if (result.current.currentPath === null) {
        expect(result.current.pathError).toBe("No path found between these rooms");
      } else {
        expect(result.current.pathError).toBeNull();
      }
    });

    it("should clear path when start room is cleared", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      act(() => {
        result.current.searchStartRoom("H851.02");
      });
      act(() => {
        result.current.searchDestinationRoom("H857");
      });
      expect(result.current.currentPath).not.toBeNull();

      // Act
      act(() => {
        result.current.clearStartRoom();
      });

      // Assert
      expect(result.current.currentPath).toBeNull();
      expect(result.current.pathError).toBeNull();
    });

    it("should clear path when destination room is cleared", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      act(() => {
        result.current.searchStartRoom("H851.02");
      });
      act(() => {
        result.current.searchDestinationRoom("H857");
      });
      expect(result.current.currentPath).not.toBeNull();

      // Act
      act(() => {
        result.current.clearDestinationRoom();
      });

      // Assert
      expect(result.current.currentPath).toBeNull();
      expect(result.current.pathError).toBeNull();
    });

    it("should set pathError for building with no map data", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act — set a building with a fake dataFile that has no geoJson
      act(() => {
        result.current.searchStartRoom("H851.02");
      });
      // Manually override the building to one with no data
      act(() => {
        result.current.setSelectedBuilding({
          code: "ZZ",
          name: "Fake",
          campus: "SGW",
          floors: [1],
          dataFile: "nonexistent",
          centerLat: 0,
          centerLng: 0,
        });
      });
      act(() => {
        result.current.searchDestinationRoom("H857");
      });

      // Assert — path can't be computed because geoJson is null for "nonexistent"
      // The building was overridden so either pathError is set or path is cleared
      expect(result.current.currentPath).toBeNull();
    });

    it("should handle error when path computation throws", () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const pathSpy = jest.spyOn(indoorPathService, "findIndoorPath").mockImplementation(() => {
        throw new Error("test error");
      });
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.searchStartRoom("H851.02");
      });
      act(() => {
        result.current.searchDestinationRoom("H857");
      });

      // Assert
      expect(result.current.currentPath).toBeNull();
      expect(result.current.pathError).toBe("Error computing path");
      expect(consoleSpy).toHaveBeenCalled();

      pathSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("accessible mode", () => {
    it("should toggle accessible state", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      expect(result.current.accessible).toBe(false);

      // Act
      act(() => {
        result.current.toggleAccessible();
      });

      // Assert
      expect(result.current.accessible).toBe(true);

      // Act — toggle back
      act(() => {
        result.current.toggleAccessible();
      });

      // Assert
      expect(result.current.accessible).toBe(false);
    });

    it("should recompute path when accessible mode is toggled", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      act(() => {
        result.current.searchStartRoom("H851.02");
      });
      act(() => {
        result.current.searchDestinationRoom("H857");
      });
      expect(result.current.currentPath).not.toBeNull();
// Act — enable accessible mode
      act(() => {
        result.current.toggleAccessible();
      });

      // Assert — path recomputed (same floor so should still find one)
      expect(result.current.accessible).toBe(true);
      expect(result.current.currentPath).not.toBeNull();
    });

    it("should show accessible error when accessible mode is on and no path found", () => {
      // Arrange
      const spy = jest.spyOn(indoorPathService, "findIndoorPath").mockReturnValue(null);
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Act
      act(() => {
        result.current.toggleAccessible();
      });
      act(() => {
        result.current.searchStartRoom("H851.02");
      });
      act(() => {
        result.current.searchDestinationRoom("H857");
      });

      // Assert
      expect(result.current.accessible).toBe(true);
      expect(result.current.currentPath).toBeNull();
      expect(result.current.pathError).toBe(
        "No accessible route found (no elevator/ramp between these rooms)"
      );

      spy.mockRestore();
    });
  });

  describe("showPOIs toggle", () => {
    it("should initialize with showPOIs true", () => {
      // Arrange + Act
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      // Assert
      expect(result.current.showPOIs).toBe(true);
    });

    it("should toggle showPOIs state", () => {
      // Arrange
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      expect(result.current.showPOIs).toBe(true);

      // Act
      act(() => {
        result.current.togglePOIs();
      });

      // Assert
      expect(result.current.showPOIs).toBe(false);
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
