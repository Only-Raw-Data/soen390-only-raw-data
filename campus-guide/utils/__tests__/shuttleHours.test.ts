import { isWithinShuttleHours } from "../shuttleHours";

describe("shuttleHours", () => {
  describe("isWithinShuttleHours", () => {
    it("returns false for Saturday", () => {
      // Arrange - 2025-02-15 is Saturday, 12:00
      const saturday = new Date("2025-02-15T12:00:00");

      // Act
      const result = isWithinShuttleHours(saturday);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for Sunday", () => {
      // Arrange - 2025-02-16 is Sunday, 10:00
      const sunday = new Date("2025-02-16T10:00:00");

      // Act
      const result = isWithinShuttleHours(sunday);

      // Assert
      expect(result).toBe(false);
    });

    it("returns true for Monday during service hours", () => {
      // Arrange - Monday 10:00 (between 09:15 and 18:30)
      const monday = new Date("2025-02-10T10:00:00");

      // Act
      const result = isWithinShuttleHours(monday);

      // Assert
      expect(result).toBe(true);
    });

    it("returns true for Thursday at first departure time", () => {
      // Arrange - Thursday 09:15
      const thursday = new Date("2025-02-13T09:15:00");

      // Act
      const result = isWithinShuttleHours(thursday);

      // Assert
      expect(result).toBe(true);
    });

    it("returns true for Monday at last departure time (Mon-Thu)", () => {
      // Arrange - Monday 18:30
      const monday = new Date("2025-02-10T18:30:00");

      // Act
      const result = isWithinShuttleHours(monday);

      // Assert
      expect(result).toBe(true);
    });

    it("returns false for Monday before first departure", () => {
      // Arrange - Monday 09:00
      const monday = new Date("2025-02-10T09:00:00");

      // Act
      const result = isWithinShuttleHours(monday);

      // Assert
      expect(result).toBe(false);
    });

    it("returns false for Monday after last departure (Mon-Thu)", () => {
      // Arrange - Monday 19:00
      const monday = new Date("2025-02-10T19:00:00");

      // Act
      const result = isWithinShuttleHours(monday);

      // Assert
      expect(result).toBe(false);
    });

    it("returns true for Friday during service hours", () => {
      // Arrange - Friday 14:00 (between 09:15 and 18:15)
      const friday = new Date("2025-02-14T14:00:00");

      // Act
      const result = isWithinShuttleHours(friday);

      // Assert
      expect(result).toBe(true);
    });

    it("returns true for Friday at last departure time", () => {
      // Arrange - Friday 18:15
      const friday = new Date("2025-02-14T18:15:00");

      // Act
      const result = isWithinShuttleHours(friday);

      // Assert
      expect(result).toBe(true);
    });

    it("returns false for Friday after last departure", () => {
      // Arrange - Friday 18:30
      const friday = new Date("2025-02-14T18:30:00");

      // Act
      const result = isWithinShuttleHours(friday);

      // Assert
      expect(result).toBe(false);
    });
  });
});
