import { renderHook, act, waitFor } from "@testing-library/react-native";
import useNextClassDirections from "../useNextClassDirections";

const mockCalendarAuth = {
  isConnected: true,
  connectedAt: "2026-03-29T12:00:00Z",
  isLoading: false,
  error: null,
  connectCalendar: jest.fn(),
  disconnectCalendar: jest.fn(),
  refreshConnection: jest.fn(),
};

jest.mock("@context/CalendarAuthContext", () => ({
  useCalendarAuth: jest.fn(() => mockCalendarAuth),
}));

const mockGetFreshToken = jest.fn().mockResolvedValue("test-token");
const mockGetSelectedIds = jest.fn().mockResolvedValue(["cal1"]);
const mockFetchNextClass = jest.fn();

jest.mock("@services/calendarAuthService", () => ({
  getFreshCalendarAccessToken: (...args: any[]) => mockGetFreshToken(...args),
  getSelectedCalendarIds: (...args: any[]) => mockGetSelectedIds(...args),
  fetchNextClassEvent: (...args: any[]) => mockFetchNextClass(...args),
}));

describe("useNextClassDirections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalendarAuth.isConnected = true;
    mockGetFreshToken.mockReset().mockResolvedValue("test-token");
    mockGetSelectedIds.mockReset().mockResolvedValue(["cal1"]);
    mockFetchNextClass.mockReset().mockResolvedValue(null);
  });

  it("starts with no_class status when no event found", async () => {
    mockFetchNextClass.mockResolvedValue(null);

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.status).toBe("no_class");
    });

    expect(result.current.shouldNotify).toBe(false);
    expect(result.current.nextClass).toBeNull();
  });

  it("fetches next class on mount", async () => {
    const event = {
      id: "evt1",
      title: "SOEN 390",
      start: new Date(Date.now() + 60 * 60 * 1000),
      end: new Date(Date.now() + 2 * 60 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.nextClass).not.toBeNull();
    });

    expect(result.current.nextClass?.title).toBe("SOEN 390");
    expect(mockGetFreshToken).toHaveBeenCalled();
    expect(mockFetchNextClass).toHaveBeenCalledWith("test-token", ["cal1"]);
  });

  it("returns too_far when class is more than threshold away", async () => {
    const event = {
      id: "evt1",
      title: "COMP 248",
      start: new Date(Date.now() + 2 * 60 * 60 * 1000),
      end: new Date(Date.now() + 3 * 60 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.status).toBe("too_far");
    });

    expect(result.current.shouldNotify).toBe(false);
  });

  it("returns within_threshold when class is approaching", async () => {
    const event = {
      id: "evt1",
      title: "SOEN 390",
      start: new Date(Date.now() + 10 * 60 * 1000),
      end: new Date(Date.now() + 90 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.status).toBe("within_threshold");
    });

    expect(result.current.shouldNotify).toBe(true);
    expect(result.current.matchedBuilding).not.toBeNull();
    expect(result.current.matchedBuilding?.code).toBe("H");
  });

  it("does not fetch when disconnected", async () => {
    mockCalendarAuth.isConnected = false;

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetFreshToken).not.toHaveBeenCalled();
    expect(result.current.nextClass).toBeNull();
  });

  it("handles missing token gracefully", async () => {
    mockGetFreshToken.mockResolvedValue(null);

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nextClass).toBeNull();
    expect(result.current.status).toBe("no_class");
  });

  it("handles empty calendar IDs gracefully", async () => {
    mockGetSelectedIds.mockResolvedValue([]);

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nextClass).toBeNull();
  });

  it("handles null calendar IDs gracefully", async () => {
    mockGetSelectedIds.mockResolvedValue(null);

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nextClass).toBeNull();
  });

  it("handles fetch error gracefully", async () => {
    mockFetchNextClass.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nextClass).toBeNull();
    expect(result.current.status).toBe("no_class");
  });

  it("dismiss hides the notification", async () => {
    const event = {
      id: "evt1",
      title: "SOEN 390",
      start: new Date(Date.now() + 10 * 60 * 1000),
      end: new Date(Date.now() + 90 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.shouldNotify).toBe(true);
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.dismissed).toBe(true);
  });

  it("accepts custom threshold", async () => {
    const event = {
      id: "evt1",
      title: "COMP 248",
      start: new Date(Date.now() + 25 * 60 * 1000),
      end: new Date(Date.now() + 85 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    const { result } = renderHook(() =>
      useNextClassDirections({ thresholdMinutes: 30 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("within_threshold");
    });

    expect(result.current.shouldNotify).toBe(true);
  });

  it("returns missing_location for event without location", async () => {
    const event = {
      id: "evt1",
      title: "Office Hours",
      start: new Date(Date.now() + 5 * 60 * 1000),
      end: new Date(Date.now() + 65 * 60 * 1000),
      location: null,
    };
    mockFetchNextClass.mockResolvedValue(event);

    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.status).toBe("missing_location");
    });

    expect(result.current.shouldNotify).toBe(true);
    expect(result.current.matchedBuilding).toBeNull();
  });
});
