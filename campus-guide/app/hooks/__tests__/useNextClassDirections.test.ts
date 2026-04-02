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
const mockFetchCalendars = jest.fn().mockResolvedValue([]);
const mockSaveSelectedIds = jest.fn().mockResolvedValue(undefined);

jest.mock("@services/calendarAuthService", () => ({
  getFreshCalendarAccessToken: (...args: any[]) => mockGetFreshToken(...args),
  getSelectedCalendarIds: (...args: any[]) => mockGetSelectedIds(...args),
  fetchNextClassEvent: (...args: any[]) => mockFetchNextClass(...args),
  fetchCalendars: (...args: any[]) => mockFetchCalendars(...args),
  saveSelectedCalendarIds: (...args: any[]) => mockSaveSelectedIds(...args),
}));

describe("useNextClassDirections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalendarAuth.isConnected = true;
    mockGetFreshToken.mockReset().mockResolvedValue("test-token");
    mockGetSelectedIds.mockReset().mockResolvedValue(["cal1"]);
    mockFetchNextClass.mockReset().mockResolvedValue(null);
    mockFetchCalendars.mockReset().mockResolvedValue([]);
    mockSaveSelectedIds.mockReset().mockResolvedValue(undefined);
  });

  it("starts with no_class status when no event found", async () => {
    // Arrange
    mockFetchNextClass.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.status).toBe("no_class");
    });

    // Assert
    expect(result.current.shouldNotify).toBe(false);
    expect(result.current.nextClass).toBeNull();
  });

  it("fetches next class on mount", async () => {
    // Arrange
    const event = {
      id: "evt1",
      title: "SOEN 390",
      start: new Date(Date.now() + 60 * 60 * 1000),
      end: new Date(Date.now() + 2 * 60 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.nextClass).not.toBeNull();
    });

    // Assert
    expect(result.current.nextClass?.title).toBe("SOEN 390");
    expect(mockGetFreshToken).toHaveBeenCalled();
    expect(mockFetchNextClass).toHaveBeenCalledWith("test-token", ["cal1"]);
  });

  it("returns too_far when class is more than threshold away", async () => {
    // Arrange
    const event = {
      id: "evt1",
      title: "COMP 248",
      start: new Date(Date.now() + 2 * 60 * 60 * 1000),
      end: new Date(Date.now() + 3 * 60 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.status).toBe("too_far");
    });

    // Assert
    expect(result.current.shouldNotify).toBe(false);
  });

  it("returns within_threshold when class is approaching", async () => {
    // Arrange
    const event = {
      id: "evt1",
      title: "SOEN 390",
      start: new Date(Date.now() + 10 * 60 * 1000),
      end: new Date(Date.now() + 90 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.status).toBe("within_threshold");
    });

    // Assert
    expect(result.current.shouldNotify).toBe(true);
    expect(result.current.matchedBuilding).not.toBeNull();
    expect(result.current.matchedBuilding?.code).toBe("H");
  });

  it("does not fetch when disconnected", async () => {
    // Arrange
    mockCalendarAuth.isConnected = false;

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert
    expect(mockGetFreshToken).not.toHaveBeenCalled();
    expect(result.current.nextClass).toBeNull();
  });

  it("handles missing token gracefully", async () => {
    // Arrange
    mockGetFreshToken.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert
    expect(result.current.nextClass).toBeNull();
    expect(result.current.status).toBe("no_class");
  });

  it("handles empty calendar IDs by falling back to fetchCalendars", async () => {
    // Arrange
    mockGetSelectedIds.mockResolvedValue([]);
    mockFetchCalendars.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert
    expect(mockFetchCalendars).toHaveBeenCalled();
    expect(result.current.nextClass).toBeNull();
  });

  it("handles null calendar IDs by falling back to fetchCalendars", async () => {
    // Arrange
    mockGetSelectedIds.mockResolvedValue(null);
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Cal" }]);
    const event = {
      id: "evt1",
      title: "SOEN 390",
      start: new Date(Date.now() + 10 * 60 * 1000),
      end: new Date(Date.now() + 90 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.nextClass).not.toBeNull();
    });

    // Assert
    expect(mockFetchCalendars).toHaveBeenCalled();
    expect(mockSaveSelectedIds).toHaveBeenCalledWith(["cal1"]);
    expect(result.current.nextClass?.title).toBe("SOEN 390");
  });

  it("handles fetch error gracefully", async () => {
    // Arrange
    mockFetchNextClass.mockRejectedValue(new Error("Network error"));

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert
    expect(result.current.nextClass).toBeNull();
    expect(result.current.status).toBe("no_class");
  });

  it("dismiss hides the notification", async () => {
    // Arrange
    const event = {
      id: "evt1",
      title: "SOEN 390",
      start: new Date(Date.now() + 10 * 60 * 1000),
      end: new Date(Date.now() + 90 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.shouldNotify).toBe(true);
    });

    // Act
    act(() => {
      result.current.dismiss();
    });

    // Assert
    expect(result.current.dismissed).toBe(true);
  });

  it("accepts custom threshold", async () => {
    // Arrange
    const event = {
      id: "evt1",
      title: "COMP 248",
      start: new Date(Date.now() + 25 * 60 * 1000),
      end: new Date(Date.now() + 85 * 60 * 1000),
      location: "H-920",
    };
    mockFetchNextClass.mockResolvedValue(event);

    // Act
    const { result } = renderHook(() =>
      useNextClassDirections({ thresholdMinutes: 30 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("within_threshold");
    });

    // Assert
    expect(result.current.shouldNotify).toBe(true);
  });

  it("returns missing_location for event without location", async () => {
    // Arrange
    const event = {
      id: "evt1",
      title: "Office Hours",
      start: new Date(Date.now() + 5 * 60 * 1000),
      end: new Date(Date.now() + 65 * 60 * 1000),
      location: null,
    };
    mockFetchNextClass.mockResolvedValue(event);

    // Act
    const { result } = renderHook(() => useNextClassDirections());

    await waitFor(() => {
      expect(result.current.status).toBe("missing_location");
    });

    // Assert
    expect(result.current.shouldNotify).toBe(true);
    expect(result.current.matchedBuilding).toBeNull();
  });
});
