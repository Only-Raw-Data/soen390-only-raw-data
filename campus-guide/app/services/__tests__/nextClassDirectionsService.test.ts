import {
  resolveLocationToBuilding,
  computeMinutesUntilClass,
  evaluateNextClassDirections,
  DEFAULT_THRESHOLD_MINUTES,
} from "../nextClassDirectionsService";
import type { NextClassEvent } from "../calendarAuthService";

function makeEvent(overrides: Partial<NextClassEvent> = {}): NextClassEvent {
  return {
    id: "cal_evt1",
    title: "SOEN 390",
    start: new Date("2026-03-30T10:00:00"),
    end: new Date("2026-03-30T11:30:00"),
    location: "H-920",
    ...overrides,
  };
}

describe("nextClassDirectionsService", () => {
  describe("resolveLocationToBuilding", () => {
    it("returns null for null location", () => {
      expect(resolveLocationToBuilding(null)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(resolveLocationToBuilding("")).toBeNull();
    });

    it("matches a room code like H-920", () => {
      const building = resolveLocationToBuilding("H-920");
      expect(building).not.toBeNull();
      expect(building!.code).toBe("H");
    });

    it("matches a room code like MB 1.210", () => {
      const building = resolveLocationToBuilding("MB 1.210");
      expect(building).not.toBeNull();
      expect(building!.code).toBe("MB");
    });

    it("matches a room code like EV 1.162", () => {
      const building = resolveLocationToBuilding("EV 1.162");
      expect(building).not.toBeNull();
      expect(building!.code).toBe("EV");
    });

    it("matches a room code with descriptive text", () => {
      const building = resolveLocationToBuilding(
        "H-920, Concordia University, Montreal",
      );
      expect(building).not.toBeNull();
      expect(building!.code).toBe("H");
    });

    it("matches building name like Hall Building", () => {
      const building = resolveLocationToBuilding("Hall Building");
      expect(building).not.toBeNull();
      expect(building!.code).toBe("H");
    });

    it("matches LB building code", () => {
      const building = resolveLocationToBuilding("LB 125");
      expect(building).not.toBeNull();
      expect(building!.code).toBe("LB");
    });

    it("returns null for an unrecognized location", () => {
      expect(
        resolveLocationToBuilding("Random Coffee Shop, 123 Main St"),
      ).toBeNull();
    });

    it("is case-insensitive for room codes", () => {
      const building = resolveLocationToBuilding("h-920");
      expect(building).not.toBeNull();
      expect(building!.code).toBe("H");
    });

    it("matches a standalone building code", () => {
      const building = resolveLocationToBuilding("MB Building");
      expect(building).not.toBeNull();
      expect(building!.code).toBe("MB");
    });
  });

  describe("computeMinutesUntilClass", () => {
    it("returns positive minutes when class is in the future", () => {
      const classStart = new Date("2026-03-30T10:00:00");
      const now = new Date("2026-03-30T09:45:00");
      expect(computeMinutesUntilClass(classStart, now)).toBe(15);
    });

    it("returns 0 when class is starting now", () => {
      const classStart = new Date("2026-03-30T10:00:00");
      expect(computeMinutesUntilClass(classStart, classStart)).toBe(0);
    });

    it("returns negative minutes when class already started", () => {
      const classStart = new Date("2026-03-30T10:00:00");
      const now = new Date("2026-03-30T10:10:00");
      expect(computeMinutesUntilClass(classStart, now)).toBe(-10);
    });

    it("uses current time when now is not provided", () => {
      const futureClass = new Date(Date.now() + 30 * 60 * 1000);
      const minutes = computeMinutesUntilClass(futureClass);
      expect(minutes).toBeGreaterThan(29);
      expect(minutes).toBeLessThanOrEqual(30);
    });
  });

  describe("evaluateNextClassDirections", () => {
    it("returns no_class when nextClass is null", () => {
      const result = evaluateNextClassDirections(null);
      expect(result.status).toBe("no_class");
      expect(result.shouldNotify).toBe(false);
      expect(result.nextClass).toBeNull();
      expect(result.matchedBuilding).toBeNull();
      expect(result.minutesUntilClass).toBeNull();
    });

    it("returns class_started when class started more than 5 minutes ago", () => {
      const now = new Date("2026-03-30T10:10:00");
      const event = makeEvent({
        start: new Date("2026-03-30T10:00:00"),
      });
      const result = evaluateNextClassDirections(event, DEFAULT_THRESHOLD_MINUTES, now);
      expect(result.status).toBe("class_started");
      expect(result.shouldNotify).toBe(false);
    });

    it("returns too_far when class is more than threshold away", () => {
      const now = new Date("2026-03-30T08:00:00");
      const event = makeEvent({
        start: new Date("2026-03-30T10:00:00"),
      });
      const result = evaluateNextClassDirections(event, DEFAULT_THRESHOLD_MINUTES, now);
      expect(result.status).toBe("too_far");
      expect(result.shouldNotify).toBe(false);
      expect(result.matchedBuilding).not.toBeNull();
    });

    it("returns within_threshold when class is approaching", () => {
      const now = new Date("2026-03-30T09:50:00");
      const event = makeEvent({
        start: new Date("2026-03-30T10:00:00"),
      });
      const result = evaluateNextClassDirections(event, DEFAULT_THRESHOLD_MINUTES, now);
      expect(result.status).toBe("within_threshold");
      expect(result.shouldNotify).toBe(true);
      expect(result.matchedBuilding).not.toBeNull();
      expect(result.matchedBuilding!.code).toBe("H");
      expect(result.minutesUntilClass).toBe(10);
    });

    it("returns missing_location when location is null but within threshold", () => {
      const now = new Date("2026-03-30T09:50:00");
      const event = makeEvent({
        start: new Date("2026-03-30T10:00:00"),
        location: null,
      });
      const result = evaluateNextClassDirections(event, DEFAULT_THRESHOLD_MINUTES, now);
      expect(result.status).toBe("missing_location");
      expect(result.shouldNotify).toBe(true);
      expect(result.matchedBuilding).toBeNull();
    });

    it("returns missing_location with shouldNotify false when far away and no location", () => {
      const now = new Date("2026-03-30T08:00:00");
      const event = makeEvent({
        start: new Date("2026-03-30T10:00:00"),
        location: null,
      });
      const result = evaluateNextClassDirections(event, DEFAULT_THRESHOLD_MINUTES, now);
      expect(result.status).toBe("too_far");
      expect(result.shouldNotify).toBe(false);
    });

    it("respects custom threshold", () => {
      const now = new Date("2026-03-30T09:40:00");
      const event = makeEvent({
        start: new Date("2026-03-30T10:00:00"),
      });

      const result10 = evaluateNextClassDirections(event, 10, now);
      expect(result10.status).toBe("too_far");

      const result30 = evaluateNextClassDirections(event, 30, now);
      expect(result30.status).toBe("within_threshold");
      expect(result30.shouldNotify).toBe(true);
    });

    it("notifies when class is just starting (within -5 minute grace)", () => {
      const now = new Date("2026-03-30T10:03:00");
      const event = makeEvent({
        start: new Date("2026-03-30T10:00:00"),
      });
      const result = evaluateNextClassDirections(event, DEFAULT_THRESHOLD_MINUTES, now);
      expect(result.status).toBe("within_threshold");
      expect(result.shouldNotify).toBe(true);
    });
  });
});
