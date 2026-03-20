import { buildHourSlots } from "../timeSlots";

describe("timeSlots", () => {
  describe("buildHourSlots", () => {
    it("creates consecutive hour values from the start hour", () => {
      // Arrange
      const startHour = 8;
      const slotCount = 5;

      // Act
      const result = buildHourSlots(startHour, slotCount);

      // Assert
      expect(result).toEqual([8, 9, 10, 11, 12]);
    });

    it("returns an empty array when slot count is zero", () => {
      // Arrange
      const startHour = 8;
      const slotCount = 0;

      // Act
      const result = buildHourSlots(startHour, slotCount);

      // Assert
      expect(result).toEqual([]);
    });

    it("returns an empty array when slot count is negative", () => {
      // Arrange
      const startHour = 8;
      const slotCount = -2;

      // Act
      const result = buildHourSlots(startHour, slotCount);

      // Assert
      expect(result).toEqual([]);
    });
  });
});

