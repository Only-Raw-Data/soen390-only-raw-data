import { formatHourLabel } from "../timeFormat";

describe("timeFormat", () => {
  describe("formatHourLabel", () => {
    it("formats 0 as 12:00 AM", () => {
      expect(formatHourLabel(0)).toBe("12:00 AM");
    });
    
    it("formats 12 as 12:00 PM", () => {
      expect(formatHourLabel(12)).toBe("12:00 PM");
    });

    it("formats 1 as 1:00 AM", () => {
      expect(formatHourLabel(1)).toBe("1:00 AM");
    });

    it("formats 13 as 1:00 PM", () => {
      expect(formatHourLabel(13)).toBe("1:00 PM");
    });

    it("formats 23 as 11:00 PM", () => {
      expect(formatHourLabel(23)).toBe("11:00 PM");
    });
    
    it("formats 11 as 11:00 AM", () => {
      expect(formatHourLabel(11)).toBe("11:00 AM");
    });
  });
});
