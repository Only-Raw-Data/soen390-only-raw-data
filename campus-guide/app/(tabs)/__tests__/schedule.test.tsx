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

  it("shows loading text when auth is loading", () => {
    mockUseCalendarAuth.mockReturnValue({ ...baseAuth, isLoading: true });
    render(<ScheduleScreen />);
    expect(screen.getByText("Loading...")).toBeTruthy();
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
    expect(screen.queryByText("Select Calendars")).toBeNull();
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
});
