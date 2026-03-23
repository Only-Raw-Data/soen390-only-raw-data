import { poiToBuildingAdapter } from "../poiUtils";
import { PointOfInterest } from "../../types/poi";
import { Campus } from "@/constants/buildings";

describe("poiToBuildingAdapter", () => {
  it("adapts a complete POI correctly", () => {
    // Arrange
    const poi: PointOfInterest = {
      id: 12345,
      name: "Tim Hortons",
      type: "fast_food",
      lat: 45.495,
      lon: -73.578,
      address: "1500 De Maisonneuve Blvd W",
      distance: 120,
    };
    
    const campus: Campus = "SGW";
    
    // Act
    const building = poiToBuildingAdapter(poi, campus);

    // Assert
    expect(building.id).toBe("poi-12345");
    expect(building.name).toBe("Tim Hortons");
    expect(building.code).toBe("FAST FOOD"); // Underscores removed and uppercased
    expect(building.address).toBe("1500 De Maisonneuve Blvd W");
    expect(building.lat).toBe(45.495);
    expect(building.lng).toBe(-73.578);
    expect(building.campus).toBe("SGW");
  });

  it("handles missing optional fields gracefully", () => {
    // Arrange
    const poi: PointOfInterest = {
      id: 67890,
      name: "Library Park",
      type: "",
      lat: 45.49,
      lon: -73.58,
    };

    const campus: Campus = "Loyola";
    
    // Act
    const building = poiToBuildingAdapter(poi, campus);

    // Assert
    expect(building.id).toBe("poi-67890");
    expect(building.code).toBe("POI"); // Default when type is empty
    expect(building.address).toBe("Point of Interest"); // Default address
    expect(building.campus).toBe("Loyola");
  });
});
