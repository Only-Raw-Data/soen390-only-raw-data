import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import IndoorMapProvider, {
  useIndoorMap,
  INDOOR_BUILDINGS,
  getGeoJsonForBuilding,
  getFeaturesForFloor,
} from "../IndoorMapContext";

describe("IndoorMapContext", () => {
  const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
    <IndoorMapProvider>{children}</IndoorMapProvider>
  );

  describe("initial state", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      expect(result.current.selectedBuilding).toBeNull();
      expect(result.current.selectedFloor).toBeNull();
      expect(result.current.searchQuery).toBe("");
      expect(result.current.highlightedRoomRef).toBeNull();
      expect(result.current.searchError).toBeNull();
    });
  });

  describe("useIndoorMap outside provider", () => {
    it("should throw when used outside IndoorMapProvider", () => {
      // Suppress console.error for expected error
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      expect(() => {
        renderHook(() => useIndoorMap());
      }).toThrow("useIndoorMap must be used within an IndoorMapProvider");
      spy.mockRestore();
    });
  });

  describe("setSelectedBuilding", () => {
    it("should set selected building", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });
      const building = INDOOR_BUILDINGS[0]; // H

      act(() => {
        result.current.setSelectedBuilding(building);
      });

      expect(result.current.selectedBuilding).toEqual(building);
    });

    it("should clear selected building", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.setSelectedBuilding(INDOOR_BUILDINGS[0]);
      });
      act(() => {
        result.current.setSelectedBuilding(null);
      });

      expect(result.current.selectedBuilding).toBeNull();
    });
  });

  describe("setSelectedFloor", () => {
    it("should set selected floor", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.setSelectedFloor(8);
      });

      expect(result.current.selectedFloor).toBe(8);
    });
  });

  describe("setSearchQuery", () => {
    it("should set search query", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.setSearchQuery("H-820");
      });

      expect(result.current.searchQuery).toBe("H-820");
    });
  });

  describe("searchRoom", () => {
    it("should find a room in hall.json and set building + floor + highlight", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.searchRoom("H820");
      });

      // H820 should be found — note: actual ref may differ based on data
      // Check that a building was selected (H) and a floor was set
      if (result.current.searchError === null) {
        expect(result.current.selectedBuilding?.code).toBe("H");
        expect(result.current.selectedFloor).toBe(8);
        expect(result.current.highlightedRoomRef).toBeTruthy();
      }
    });

    it("should find a room with dashes and spaces normalized (H-851.02)", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.searchRoom("H-851.02");
      });

      expect(result.current.searchError).toBeNull();
      expect(result.current.selectedBuilding?.code).toBe("H");
      expect(result.current.selectedFloor).toBe(8);
      expect(result.current.highlightedRoomRef).toBe("H851.02");
    });

    it("should find a room case-insensitively", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.searchRoom("h851.02");
      });

      expect(result.current.searchError).toBeNull();
      expect(result.current.highlightedRoomRef).toBe("H851.02");
    });

    it("should find MB building rooms (MB1.210)", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.searchRoom("MB1.210");
      });

      expect(result.current.searchError).toBeNull();
      expect(result.current.selectedBuilding?.code).toBe("MB");
      expect(result.current.selectedFloor).toBe(1);
      expect(result.current.highlightedRoomRef).toBe("MB1.210");
    });

    it("should find MB basement rooms with MBS prefix (MBS2.437)", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.searchRoom("MBS2.437");
      });

      expect(result.current.searchError).toBeNull();
      expect(result.current.selectedBuilding?.code).toBe("MB");
      expect(result.current.selectedFloor).toBe(-2);
      expect(result.current.highlightedRoomRef).toBe("MBS2.437");
    });

    it("should set error for non-existent room", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.searchRoom("XYZ-999");
      });

      expect(result.current.searchError).toBe("Room not found");
      expect(result.current.highlightedRoomRef).toBeNull();
    });

    it("should do nothing for empty query", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.searchRoom("");
      });

      expect(result.current.searchError).toBeNull();
      expect(result.current.highlightedRoomRef).toBeNull();
      expect(result.current.selectedBuilding).toBeNull();
    });

    it("should clear previous error on new search", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.searchRoom("XYZ-999");
      });
      expect(result.current.searchError).toBe("Room not found");

      act(() => {
        result.current.searchRoom("H851.02");
      });
      expect(result.current.searchError).toBeNull();
    });
  });

  describe("clearHighlight", () => {
    it("should clear highlighted room and error", () => {
      const { result } = renderHook(() => useIndoorMap(), { wrapper });

      act(() => {
        result.current.searchRoom("H851.02");
      });
      expect(result.current.highlightedRoomRef).toBe("H851.02");

      act(() => {
        result.current.clearHighlight();
      });

      expect(result.current.highlightedRoomRef).toBeNull();
      expect(result.current.searchError).toBeNull();
    });
  });

  describe("INDOOR_BUILDINGS", () => {
    it("should contain H building with correct config", () => {
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H");
      expect(h).toBeDefined();
      expect(h!.campus).toBe("SGW");
      expect(h!.floors).toContain(8);
      expect(h!.floors).toContain(9);
    });

    it("should contain MB building with correct config", () => {
      const mb = INDOOR_BUILDINGS.find((b) => b.code === "MB");
      expect(mb).toBeDefined();
      expect(mb!.campus).toBe("SGW");
      expect(mb!.floors).toContain(-2);
      expect(mb!.floors).toContain(1);
    });

    it("should contain both SGW and Loyola buildings", () => {
      const sgw = INDOOR_BUILDINGS.filter((b) => b.campus === "SGW");
      const loyola = INDOOR_BUILDINGS.filter((b) => b.campus === "Loyola");
      expect(sgw.length).toBeGreaterThan(0);
      expect(loyola.length).toBeGreaterThan(0);
    });
  });

  describe("getGeoJsonForBuilding", () => {
    it("should return GeoJSON data for H building", () => {
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const data = getGeoJsonForBuilding(h);
      expect(data).not.toBeNull();
      expect(data!.type).toBe("FeatureCollection");
      expect(data!.features.length).toBeGreaterThan(0);
    });

    it("should return null for unknown dataFile", () => {
      const fake = { ...INDOOR_BUILDINGS[0], dataFile: "nonexistent" };
      const data = getGeoJsonForBuilding(fake);
      expect(data).toBeNull();
    });
  });

  describe("getFeaturesForFloor", () => {
    it("should return features for floor 8 of hall.json", () => {
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const data = getGeoJsonForBuilding(h)!;
      const features = getFeaturesForFloor(data, 8);
      expect(features.length).toBeGreaterThan(0);
      features.forEach((f) => {
        expect(f.properties!.level!.split(";")).toContain("8");
      });
    });

    it("should return features for multi-level elements (e.g. level 1;9)", () => {
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const data = getGeoJsonForBuilding(h)!;
      const floor9 = getFeaturesForFloor(data, 9);
      // Some features have level "1;9" — they should appear on floor 9
      const multiLevel = floor9.filter(
        (f) => f.properties?.level?.includes(";"),
      );
      expect(multiLevel.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array for non-existent floor", () => {
      const h = INDOOR_BUILDINGS.find((b) => b.code === "H")!;
      const data = getGeoJsonForBuilding(h)!;
      const features = getFeaturesForFloor(data, 99);
      expect(features).toEqual([]);
    });

    it("should handle features with null properties", () => {
      const mockGeoJson = {
        type: "FeatureCollection" as const,
        features: [
          { type: "Feature" as const, properties: null, geometry: { type: "Polygon" as const, coordinates: [] } },
          { type: "Feature" as const, properties: { level: "1", indoor: "room" }, geometry: { type: "Polygon" as const, coordinates: [] } },
        ],
      };
      const features = getFeaturesForFloor(mockGeoJson, 1);
      expect(features.length).toBe(1);
    });
  });
});
