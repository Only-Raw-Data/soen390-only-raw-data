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
    mockSaveSelectedCalendarIds.mockResolvedValue(undefined);
    mockFetchNextClassEvent.mockResolvedValue(null);

    render(<ScheduleScreen />);

    await waitFor(() => {
      expect(screen.getByText("Manage Calendars")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Manage Calendars"));

    await waitFor(() => {
      expect(screen.getByText("Save")).toBeTruthy();
    });

    await waitFor(() => {
      fireEvent.press(screen.getByText("Save"));
    });

    await waitFor(() => {
      expect(mockSaveSelectedCalendarIds).toHaveBeenCalledWith(["cal1"]);
    });

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
});
