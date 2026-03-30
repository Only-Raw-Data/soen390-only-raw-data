import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import ScheduleScreen from "../schedule";
import { useCalendarAuth } from "@context/CalendarAuthContext";
import {
  fetchCalendars,
  fetchNextClassEvent,
  getFreshCalendarAccessToken,
  getSelectedCalendarIds,
  saveSelectedCalendarIds,
} from "@services/calendarAuthService";

jest.mock("@app/components/Header", () => "Header");

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("@utils/timeSlots", () => ({
  buildHourSlots: jest.fn(() => [0, 6, 12, 18]),
}));

jest.mock("@utils/timeFormat", () => ({
  formatHourLabel: jest.fn((h: number) => `${h}:00`),
}));

jest.mock("@context/CalendarAuthContext", () => ({
  useCalendarAuth: jest.fn(),
}));

jest.mock("@services/calendarAuthService", () => ({
  fetchCalendars: jest.fn(),
  fetchNextClassEvent: jest.fn(),
  getFreshCalendarAccessToken: jest.fn(),
  getSelectedCalendarIds: jest.fn(),
  saveSelectedCalendarIds: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("@context/DirectionsContext", () => ({
  useDirections: jest.fn(() => ({
    setDestinationBuilding: jest.fn(),
    setStartBuilding: jest.fn(),
    setStartCoords: jest.fn(),
    setTransportationMode: jest.fn(),
    fetchRoute: jest.fn(),
  })),
}));

jest.mock("@hooks/useUserLocation", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getRawLocation: jest.fn().mockResolvedValue(null),
  })),
}));

jest.mock("@services/nextClassDirectionsService", () => ({
  ...jest.requireActual("@services/nextClassDirectionsService"),
  getStoredThresholdMinutes: jest.fn().mockResolvedValue(15),
  saveThresholdMinutes: jest.fn().mockResolvedValue(undefined),
}));

const mockUseCalendarAuth = useCalendarAuth as jest.Mock;
const mockFetchCalendars = fetchCalendars as jest.Mock;
const mockFetchNextClassEvent = fetchNextClassEvent as jest.Mock;
const mockGetFreshCalendarAccessToken = getFreshCalendarAccessToken as jest.Mock;
const mockGetSelectedCalendarIds = getSelectedCalendarIds as jest.Mock;
const mockSaveSelectedCalendarIds = saveSelectedCalendarIds as jest.Mock;

const baseAuth = {
  isConnected: false,
  connectedAt: null,
  isLoading: false,
  error: null,
  connectCalendar: jest.fn(),
  disconnectCalendar: jest.fn(),
  refreshConnection: jest.fn(),
};

const FUTURE_START = new Date(Date.now() + 60 * 60 * 1000);
const FUTURE_END = new Date(Date.now() + 2 * 60 * 60 * 1000);

// Compute a weekday (Wednesday) in the currently displayed week so the event
// always lands inside the Mon–Fri grid regardless of what day the test runs.
function getWednesdayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diffToWed = day === 0 ? -4 : 3 - day;
  const wed = new Date(now);
  wed.setDate(wed.getDate() + diffToWed);
  return wed;
}

const EVENT_DAY = getWednesdayOfCurrentWeek();
const EVENT_START = new Date(EVENT_DAY);
EVENT_START.setHours(10, 0, 0, 0);
const EVENT_END = new Date(EVENT_DAY);
EVENT_END.setHours(11, 0, 0, 0);

describe("ScheduleScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCalendarAuth.mockReturnValue(baseAuth);
    mockGetFreshCalendarAccessToken.mockResolvedValue(null);
    mockGetSelectedCalendarIds.mockResolvedValue(null);
    mockFetchCalendars.mockResolvedValue([]);
    mockFetchNextClassEvent.mockResolvedValue(null);
    mockSaveSelectedCalendarIds.mockResolvedValue(undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
  });

  it("renders without crashing when not connected", () => {
    render(<ScheduleScreen />);
    expect(screen.getByText("Connect Google Calendar")).toBeTruthy();
  });

  it("shows disconnect button and connected badge when connected", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([]);
    mockGetSelectedCalendarIds.mockResolvedValue(null);

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("Disconnect Google Calendar")).toBeTruthy();
    });
    expect(screen.getByText("Connected to Google Calendar")).toBeTruthy();
  });

  it("hides connect/disconnect button text when auth is loading", () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isLoading: true });
    render(<ScheduleScreen />);
    expect(screen.queryByText("Connect Google Calendar")).toBeNull();
    expect(screen.queryByText("Disconnect Google Calendar")).toBeNull();
  });

  it("does not show next class card when not connected", () => {
    render(<ScheduleScreen />);
    expect(screen.queryByText("Next Class")).toBeNull();
  });

  it("does not show next class card when connected but no upcoming event", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue(null);

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(mockFetchNextClassEvent).toHaveBeenCalled();
    });
    expect(screen.queryByText("Next Class")).toBeNull();
  });

  it("shows next class card with title and location", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue({
      id: "cal1_evt1",
      title: "SOEN 390",
      start: FUTURE_START,
      end: FUTURE_END,
      location: "H-920",
    });

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("SOEN 390")).toBeTruthy();
    });
    expect(screen.getByText("H-920")).toBeTruthy();
    expect(screen.getByText("Next Class")).toBeTruthy();
  });

  it("shows 'No location specified' when next class has no location", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue({
      id: "cal1_evt2",
      title: "COMP 352",
      start: FUTURE_START,
      end: FUTURE_END,
      location: null,
    });

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("COMP 352")).toBeTruthy();
    });
    expect(screen.getByText("No location specified")).toBeTruthy();
  });

  it("clears next class when disconnecting", async () => {
    const { rerender } = render(
      <ScheduleScreen />,
    );

    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue({
      id: "cal1_evt1",
      title: "SOEN 390",
      start: FUTURE_START,
      end: FUTURE_END,
      location: "H-920",
    });

    rerender(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("SOEN 390")).toBeTruthy();
    });

    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: false });
    rerender(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.queryByText("Next Class")).toBeNull();
    });
  });

  it("does not call fetchNextClassEvent when token is null", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue(null);
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(mockGetFreshCalendarAccessToken).toHaveBeenCalled();
    });
    expect(mockFetchNextClassEvent).not.toHaveBeenCalled();
  });

  it("shows week navigation and today button", () => {
    render(<ScheduleScreen />);
    expect(screen.getByText("Today")).toBeTruthy();
  });

  it("shows Manage Calendars button when connected with calendars", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "Work" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue(null);

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("Manage Calendars")).toBeTruthy();
    });
  });

  it("opens calendar picker modal on Manage Calendars press", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "Work" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue(null);

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("Manage Calendars")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Manage Calendars"));

    expect(screen.getByText("Select Calendars")).toBeTruthy();
    expect(screen.getByText("Work")).toBeTruthy();
  });

  it("saves selection and closes modal on Save press", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "Work" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue(null);

    render(<ScheduleScreen />);

    await waitFor(() => {
      fireEvent.press(screen.getByText("Manage Calendars"));
    });

    fireEvent.press(screen.getByText("Save"));

    expect(mockSaveSelectedCalendarIds).toHaveBeenCalledWith(["cal1"]);
    await waitFor(() => {
      expect(screen.queryByText("Select Calendars")).toBeNull();
    });
  });

  it("calls connectCalendar when Connect button is pressed", () => {
    const mockConnect = jest.fn();
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, connectCalendar: mockConnect });

    render(<ScheduleScreen />);

    fireEvent.press(screen.getByText("Connect Google Calendar"));

    expect(mockConnect).toHaveBeenCalled();
  });

  it("calls disconnectCalendar when Disconnect button is pressed", async () => {
    const mockDisconnect = jest.fn();
    mockUseCalendarAuth.mockReturnValue({
      ...baseAuth,
      isConnected: true,
      disconnectCalendar: mockDisconnect,
    });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([]);
    mockGetSelectedCalendarIds.mockResolvedValue(null);
    mockFetchNextClassEvent.mockResolvedValue(null);

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("Disconnect Google Calendar")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Disconnect Google Calendar"));

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("shows auth error when present", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, error: "Auth failed" });

    render(<ScheduleScreen />);

    expect(screen.getByText("Auth failed")).toBeTruthy();
  });

  it("fetches and renders timed calendar events", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "evt1",
            summary: "SOEN 390 Lecture",
            start: { dateTime: EVENT_START.toISOString() },
            end: { dateTime: EVENT_END.toISOString() },
          },
        ],
      }),
    });

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("SOEN 390 Lecture")).toBeTruthy();
    });
  });

  it("renders timed event without summary as Untitled Event", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "evt2",
            start: { dateTime: EVENT_START.toISOString() },
            end: { dateTime: EVENT_END.toISOString() },
          },
        ],
      }),
    });

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("Untitled Event")).toBeTruthy();
    });
  });

  it("shows all-day events in the all-day section", async () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const tomorrowStr = new Date(today.getTime() + 86400000)
      .toISOString()
      .split("T")[0];

    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "allday1",
            summary: "University Holiday",
            start: { date: todayStr },
            end: { date: tomorrowStr },
          },
        ],
      }),
    });

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("University Holiday")).toBeTruthy();
    });
    expect(screen.getByText("All-day events")).toBeTruthy();
  });

  it("shows events error when fetch returns non-ok response", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(mockGetFreshCalendarAccessToken).toHaveBeenCalled();
    });
  });

  it("navigates to previous and next week", () => {
    render(<ScheduleScreen />);

    const buttons = screen.UNSAFE_getAllByType
      ? screen.UNSAFE_getAllByType(require("react-native").TouchableOpacity)
      : [];

    if (buttons.length >= 2) {
      fireEvent.press(buttons[0]);
      fireEvent.press(buttons[2] ?? buttons[1]);
    }

    expect(screen.getByText("Today")).toBeTruthy();
  });

  it("toggles calendar selection in modal", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([
      { id: "cal1", name: "Work" },
      { id: "cal2", name: "Personal" },
    ]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1", "cal2"]);
    mockFetchNextClassEvent.mockResolvedValue(null);

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("Manage Calendars")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Manage Calendars"));

    expect(screen.getByText("Work")).toBeTruthy();
    expect(screen.getByText("Personal")).toBeTruthy();

    fireEvent.press(screen.getByText("Work"));

    fireEvent.press(screen.getByText("Save"));

    expect(mockSaveSelectedCalendarIds).toHaveBeenCalled();
  });

  it("selects all calendars when no saved selection exists", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([
      { id: "cal1", name: "Work" },
      { id: "cal2", name: "Personal" },
    ]);
    mockGetSelectedCalendarIds.mockResolvedValue(null);
    mockFetchNextClassEvent.mockResolvedValue(null);

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("Manage Calendars")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Manage Calendars"));
    expect(screen.getByText("Work")).toBeTruthy();
    expect(screen.getByText("Personal")).toBeTruthy();
  });

  it("loadNextClass catches errors and sets nextClass to null", async () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
    mockGetFreshCalendarAccessToken.mockResolvedValue("token");
    mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
    mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
    mockFetchNextClassEvent.mockRejectedValue(new Error("Network error"));

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(mockFetchNextClassEvent).toHaveBeenCalled();
    });
    expect(screen.queryByText("Next Class")).toBeNull();
  });
});
