import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react-native";
import ScheduleScreen from "../schedule";
import { useCalendarAuth } from "@context/CalendarAuthContext";
import {
  fetchCalendars,
  fetchNextClassEvent,
  getFreshCalendarAccessToken,
  getSelectedCalendarIds,
  saveSelectedCalendarIds,
} from "@services/calendarAuthService";
import {
  getStoredThresholdMinutes,
  saveThresholdMinutes,
} from "@services/nextClassDirectionsService";

const mockSetDestinationBuilding = jest.fn();
const mockSetStartBuilding = jest.fn();
const mockSetStartCoords = jest.fn();
const mockSetTransportationMode = jest.fn();
const mockFetchRoute = jest.fn();
const mockPush = jest.fn();
const mockGetRawLocation = jest.fn().mockResolvedValue(null);

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
  useRouter: jest.fn(() => ({ push: mockPush })),
}));

jest.mock("@context/DirectionsContext", () => ({
  useDirections: jest.fn(() => ({
    setDestinationBuilding: mockSetDestinationBuilding,
    setStartBuilding: mockSetStartBuilding,
    setStartCoords: mockSetStartCoords,
    setTransportationMode: mockSetTransportationMode,
    fetchRoute: mockFetchRoute,
  })),
}));

jest.mock("@hooks/useUserLocation", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getRawLocation: mockGetRawLocation,
  })),
}));

jest.mock("@services/nextClassDirectionsService", () => ({
  ...jest.requireActual("@services/nextClassDirectionsService"),
  getStoredThresholdMinutes: jest.fn().mockResolvedValue(15),
  saveThresholdMinutes: jest.fn().mockResolvedValue(undefined),
  resolveLocationToBuilding: jest.fn(),
}));

const mockResolveLocationToBuilding =
  require("@services/nextClassDirectionsService").resolveLocationToBuilding as jest.Mock;

const mockUseCalendarAuth = useCalendarAuth as jest.Mock;
const mockFetchCalendars = fetchCalendars as jest.Mock;
const mockFetchNextClassEvent = fetchNextClassEvent as jest.Mock;
const mockGetFreshCalendarAccessToken = getFreshCalendarAccessToken as jest.Mock;
const mockGetSelectedCalendarIds = getSelectedCalendarIds as jest.Mock;
const mockSaveSelectedCalendarIds = saveSelectedCalendarIds as jest.Mock;
const mockGetStoredThresholdMinutes = getStoredThresholdMinutes as jest.MockedFunction<typeof getStoredThresholdMinutes>;
const mockSaveThresholdMinutes = saveThresholdMinutes as jest.MockedFunction<typeof saveThresholdMinutes>;

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
    mockGetStoredThresholdMinutes.mockResolvedValue(15);
    mockSaveThresholdMinutes.mockResolvedValue(undefined);
    mockResolveLocationToBuilding.mockReturnValue(null);
    mockGetRawLocation.mockResolvedValue(null);
    mockPush.mockReset();
    mockSetDestinationBuilding.mockReset();
    mockSetStartBuilding.mockReset();
    mockSetStartCoords.mockReset();
    mockSetTransportationMode.mockReset();
    mockFetchRoute.mockReset();
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

  describe("timed calendar events (fixed weekday clock)", () => {
    const WED_2026_03_25_START = "2026-03-25T10:00:00.000Z";
    const WED_2026_03_25_END = "2026-03-25T11:00:00.000Z";

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-03-25T14:30:00.000Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
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
              start: { dateTime: WED_2026_03_25_START },
              end: { dateTime: WED_2026_03_25_END },
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
              start: { dateTime: WED_2026_03_25_START },
              end: { dateTime: WED_2026_03_25_END },
            },
          ],
        }),
      });

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("Untitled Event")).toBeTruthy();
      });
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

  it("shows SAT and SUN columns in the week header", () => {
    render(<ScheduleScreen />);
    expect(screen.getByText("SAT")).toBeTruthy();
    expect(screen.getByText("SUN")).toBeTruthy();
  });

  describe("EventDetailModal", () => {
    const WED_START = "2026-03-25T10:00:00.000Z";
    const WED_END = "2026-03-25T11:00:00.000Z";

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-03-25T14:30:00.000Z"));
      mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
      mockGetFreshCalendarAccessToken.mockResolvedValue("token");
      mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
      mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
      mockFetchNextClassEvent.mockResolvedValue(null);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("opens event detail modal when a timed event is pressed", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "evt1",
              summary: "SOEN 390 Lecture",
              start: { dateTime: WED_START },
              end: { dateTime: WED_END },
              location: "H-920",
              description: "Weekly lecture notes",
            },
          ],
        }),
      });

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("SOEN 390 Lecture")).toBeTruthy();
      });

      fireEvent.press(screen.getByText("SOEN 390 Lecture"));

      expect(screen.getByText("H-920")).toBeTruthy();
      expect(screen.getByText("Notes")).toBeTruthy();
      expect(screen.getByText("Weekly lecture notes")).toBeTruthy();
    });

    it("closes event detail modal when Close button is pressed", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "evt1",
              summary: "SOEN 390 Lecture",
              start: { dateTime: WED_START },
              end: { dateTime: WED_END },
            },
          ],
        }),
      });

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("SOEN 390 Lecture")).toBeTruthy();
      });

      fireEvent.press(screen.getByText("SOEN 390 Lecture"));

      expect(screen.getByText("Close")).toBeTruthy();

      fireEvent.press(screen.getByText("Close"));

      await waitFor(() => {
        expect(screen.queryByText("Close")).toBeNull();
      });
    });

    it("shows event detail modal without location when location is absent", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "evt2",
              summary: "COMP 352",
              start: { dateTime: WED_START },
              end: { dateTime: WED_END },
            },
          ],
        }),
      });

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("COMP 352")).toBeTruthy();
      });

      fireEvent.press(screen.getByText("COMP 352"));

      expect(screen.getByText("Close")).toBeTruthy();
      expect(screen.queryByText("Notes")).toBeNull();
    });

    it("shows event detail modal without Notes section when description is absent", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "evt3",
              summary: "ENGR 201",
              start: { dateTime: WED_START },
              end: { dateTime: WED_END },
              location: "EV-2.184",
            },
          ],
        }),
      });

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("ENGR 201")).toBeTruthy();
      });

      fireEvent.press(screen.getByText("ENGR 201"));

      expect(screen.getByText("EV-2.184")).toBeTruthy();
      expect(screen.queryByText("Notes")).toBeNull();
    });

    it("maps location and description from Google Calendar API response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "evt4",
              summary: "SOEN 341",
              start: { dateTime: WED_START },
              end: { dateTime: WED_END },
              location: "MB-1.210",
              description: "Sprint review session",
            },
          ],
        }),
      });

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("SOEN 341")).toBeTruthy();
      });

      fireEvent.press(screen.getByText("SOEN 341"));

      expect(screen.getByText("MB-1.210")).toBeTruthy();
      expect(screen.getByText("Sprint review session")).toBeTruthy();
    });

    it("shows All day label in detail modal for all-day events", async () => {
      const today = new Date("2026-03-25");
      const todayStr = today.toISOString().split("T")[0];
      const tomorrowStr = new Date(today.getTime() + 86400000)
        .toISOString()
        .split("T")[0];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "allday1",
              summary: "Spring Break",
              start: { date: todayStr },
              end: { date: tomorrowStr },
            },
          ],
        }),
      });

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("Spring Break")).toBeTruthy();
      });

      const allEventTexts = screen.getAllByText("Spring Break");
      fireEvent.press(allEventTexts[0]);

      expect(screen.getByText("All day")).toBeTruthy();
    });
  });

  describe("Threshold UI", () => {
    const connectedSetup = () => {
      mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
      mockGetFreshCalendarAccessToken.mockResolvedValue("token");
      mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
      mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
      mockFetchNextClassEvent.mockResolvedValue(null);
    };

    it("shows threshold row with default value when connected", async () => {
      connectedSetup();
      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("Remind me")).toBeTruthy();
      });
      expect(screen.getByText("15 min")).toBeTruthy();
      expect(screen.getByText("before class")).toBeTruthy();
    });

    it("shows 'Always' and '(no limit)' when threshold is NO_LIMIT", async () => {
      connectedSetup();
      mockGetStoredThresholdMinutes.mockResolvedValue(0);
      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("Always")).toBeTruthy();
      });
      expect(screen.getByText("(no limit)")).toBeTruthy();
    });

    it("increments threshold when plus is pressed", async () => {
      connectedSetup();
      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("15 min")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId("threshold-plus"));
      });

      expect(screen.getByText("20 min")).toBeTruthy();
      expect(mockSaveThresholdMinutes).toHaveBeenCalledWith(20);
    });

    it("decrements threshold when minus is pressed", async () => {
      connectedSetup();
      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("15 min")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId("threshold-minus"));
      });

      expect(screen.getByText("10 min")).toBeTruthy();
      expect(mockSaveThresholdMinutes).toHaveBeenCalledWith(10);
    });

    it("goes to Always when decremented below minimum", async () => {
      connectedSetup();
      mockGetStoredThresholdMinutes.mockResolvedValue(5);
      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("5 min")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId("threshold-minus"));
      });

      expect(screen.getByText("Always")).toBeTruthy();
      expect(mockSaveThresholdMinutes).toHaveBeenCalledWith(0);
    });

    it("goes from Always to MIN when plus is pressed", async () => {
      connectedSetup();
      mockGetStoredThresholdMinutes.mockResolvedValue(0);
      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("Always")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId("threshold-plus"));
      });

      expect(screen.getByText("5 min")).toBeTruthy();
      expect(mockSaveThresholdMinutes).toHaveBeenCalledWith(5);
    });

    it("does not exceed MAX_THRESHOLD when plus is pressed at max", async () => {
      connectedSetup();
      mockGetStoredThresholdMinutes.mockResolvedValue(60);
      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("60 min")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId("threshold-plus"));
      });

      expect(screen.getByText("60 min")).toBeTruthy();
    });
  });

  describe("NextClassCard directions", () => {
    const SOON_START = new Date(Date.now() + 10 * 60 * 1000);
    const SOON_END = new Date(Date.now() + 70 * 60 * 1000);

    const fakeBuilding = {
      id: "H",
      name: "Hall Building",
      coordinates: { latitude: 45.4973, longitude: -73.5789 },
    };

    const connectedWithNextClass = (location: string | null = "H-920") => {
      mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
      mockGetFreshCalendarAccessToken.mockResolvedValue("token");
      mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
      mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
      mockFetchNextClassEvent.mockResolvedValue({
        id: "cal1_evt1",
        title: "SOEN 390",
        start: SOON_START,
        end: SOON_END,
        location,
      });
    };

    it("shows Get Directions button when class is within threshold and building resolves", async () => {
      connectedWithNextClass("H-920");
      mockResolveLocationToBuilding.mockReturnValue(fakeBuilding);

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("next-class-directions-btn")).toBeTruthy();
      });
    });

    it("hides Get Directions button when building does not resolve", async () => {
      connectedWithNextClass("Unknown Place");
      mockResolveLocationToBuilding.mockReturnValue(null);

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("SOEN 390")).toBeTruthy();
      });
      expect(screen.queryByTestId("next-class-directions-btn")).toBeNull();
    });

    it("hides Get Directions button when class is beyond threshold", async () => {
      const farStart = new Date(Date.now() + 120 * 60 * 1000);
      const farEnd = new Date(Date.now() + 180 * 60 * 1000);
      mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
      mockGetFreshCalendarAccessToken.mockResolvedValue("token");
      mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
      mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
      mockFetchNextClassEvent.mockResolvedValue({
        id: "cal1_evt1",
        title: "SOEN 390",
        start: farStart,
        end: farEnd,
        location: "H-920",
      });
      mockResolveLocationToBuilding.mockReturnValue(fakeBuilding);

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByText("SOEN 390")).toBeTruthy();
      });
      expect(screen.queryByTestId("next-class-directions-btn")).toBeNull();
    });

    it("shows Get Directions with NO_LIMIT threshold regardless of time", async () => {
      const farStart = new Date(Date.now() + 120 * 60 * 1000);
      const farEnd = new Date(Date.now() + 180 * 60 * 1000);
      mockGetStoredThresholdMinutes.mockResolvedValue(0);
      mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isConnected: true });
      mockGetFreshCalendarAccessToken.mockResolvedValue("token");
      mockFetchCalendars.mockResolvedValue([{ id: "cal1", name: "My Calendar" }]);
      mockGetSelectedCalendarIds.mockResolvedValue(["cal1"]);
      mockFetchNextClassEvent.mockResolvedValue({
        id: "cal1_evt1",
        title: "SOEN 390",
        start: farStart,
        end: farEnd,
        location: "H-920",
      });
      mockResolveLocationToBuilding.mockReturnValue(fakeBuilding);

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("next-class-directions-btn")).toBeTruthy();
      });
    });

    it("navigates and sets directions when Get Directions is pressed", async () => {
      connectedWithNextClass("H-920");
      mockResolveLocationToBuilding.mockReturnValue(fakeBuilding);

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("next-class-directions-btn")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId("next-class-directions-btn"));
      });

      expect(mockSetDestinationBuilding).toHaveBeenCalledWith(fakeBuilding);
      expect(mockSetStartBuilding).toHaveBeenCalledWith(null);
      expect(mockSetTransportationMode).toHaveBeenCalledWith("walk");
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/two");
    });

    it("sets start coords when getRawLocation returns coordinates", async () => {
      connectedWithNextClass("H-920");
      mockResolveLocationToBuilding.mockReturnValue(fakeBuilding);
      mockGetRawLocation.mockResolvedValue({ latitude: 45.49, longitude: -73.58 });

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("next-class-directions-btn")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId("next-class-directions-btn"));
      });

      expect(mockSetStartCoords).toHaveBeenCalledWith({ latitude: 45.49, longitude: -73.58 });
    });

    it("does not navigate when resolveLocationToBuilding returns null on press", async () => {
      connectedWithNextClass("H-920");
      mockResolveLocationToBuilding
        .mockReturnValueOnce(fakeBuilding)
        .mockReturnValueOnce(null);

      render(<ScheduleScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("next-class-directions-btn")).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByTestId("next-class-directions-btn"));
      });

      expect(mockSetDestinationBuilding).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("auto-saves all calendar ids when no saved selection exists", async () => {
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
      expect(mockSaveSelectedCalendarIds).toHaveBeenCalledWith(["cal1", "cal2"]);
    });
  });

  it("does not press connect button when loading", () => {
    const mockConnect = jest.fn();
    mockUseCalendarAuth.mockReturnValue({
      ...baseAuth,
      isLoading: true,
      connectCalendar: mockConnect,
    });

    render(<ScheduleScreen />);
    expect(mockConnect).not.toHaveBeenCalled();
  });
});
