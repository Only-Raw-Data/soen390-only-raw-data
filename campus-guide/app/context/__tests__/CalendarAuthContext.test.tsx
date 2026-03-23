import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Text, Pressable } from "react-native";
import CalendarAuthProvider, {
  useCalendarAuth,
} from "@context/CalendarAuthContext";
import {
  configureGoogleCalendarAuth,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getCalendarConnectionState,
  getGoogleSignInErrorMessage,
} from "@services/calendarAuthService";

jest.mock("@services/calendarAuthService", () => ({
  configureGoogleCalendarAuth: jest.fn(),
  connectGoogleCalendar: jest.fn(),
  disconnectGoogleCalendar: jest.fn(),
  getCalendarConnectionState: jest.fn(),
  getGoogleSignInErrorMessage: jest.fn(),
}));

function Consumer() {
  const {
    isConnected,
    connectedAt,
    isLoading,
    error,
    connectCalendar,
    disconnectCalendar,
    refreshConnection,
  } = useCalendarAuth();

  return (
    <>
      <Text testID="connected">{String(isConnected)}</Text>
      <Text testID="connectedAt">{connectedAt ?? "null"}</Text>
      <Text testID="loading">{String(isLoading)}</Text>
      <Text testID="error">{error ?? "null"}</Text>
      <Text testID="provider">{typeof refreshConnection}</Text>

      <Pressable testID="connect" onPress={() => void connectCalendar()} />
      <Pressable
        testID="disconnect"
        onPress={() => void disconnectCalendar()}
      />
    </>
  );
}

describe("CalendarAuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getCalendarConnectionState as jest.Mock).mockResolvedValue({
      isConnected: false,
      connectedAt: null,
    });

    (getGoogleSignInErrorMessage as jest.Mock).mockReturnValue("Mapped error");
  });

  it("loads initial connection state on mount", async () => {
    (getCalendarConnectionState as jest.Mock).mockResolvedValue({
      isConnected: true,
      connectedAt: "2026-03-23T12:00:00.000Z",
    });

    render(
      <CalendarAuthProvider>
        <Consumer />
      </CalendarAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("connected").props.children).toBe("true");
    });

    expect(screen.getByTestId("connectedAt").props.children).toBe(
      "2026-03-23T12:00:00.000Z",
    );
    expect(configureGoogleCalendarAuth).toHaveBeenCalled();
  });

  it("connectCalendar updates state on success", async () => {
    (connectGoogleCalendar as jest.Mock).mockResolvedValue({
      isConnected: true,
      connectedAt: "2026-03-24T09:30:00.000Z",
    });

    render(
      <CalendarAuthProvider>
        <Consumer />
      </CalendarAuthProvider>,
    );

    fireEvent.press(screen.getByTestId("connect"));

    await waitFor(() => {
      expect(screen.getByTestId("connected").props.children).toBe("true");
    });

    expect(screen.getByTestId("connectedAt").props.children).toBe(
      "2026-03-24T09:30:00.000Z",
    );
    expect(screen.getByTestId("error").props.children).toBe("null");
  });

  it("connectCalendar exposes a mapped error on failure", async () => {
    (connectGoogleCalendar as jest.Mock).mockRejectedValue(new Error("raw error"));

    render(
      <CalendarAuthProvider>
        <Consumer />
      </CalendarAuthProvider>,
    );

    fireEvent.press(screen.getByTestId("connect"));

    await waitFor(() => {
      expect(screen.getByTestId("error").props.children).toBe("Mapped error");
    });

    expect(getGoogleSignInErrorMessage).toHaveBeenCalled();
  });

  it("disconnectCalendar clears the state on success", async () => {
    (getCalendarConnectionState as jest.Mock).mockResolvedValue({
      isConnected: true,
      connectedAt: "2026-03-23T12:00:00.000Z",
    });

    render(
      <CalendarAuthProvider>
        <Consumer />
      </CalendarAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("connected").props.children).toBe("true");
    });

    fireEvent.press(screen.getByTestId("disconnect"));

    await waitFor(() => {
      expect(screen.getByTestId("connected").props.children).toBe("false");
    });

    expect(screen.getByTestId("connectedAt").props.children).toBe("null");
    expect(disconnectGoogleCalendar).toHaveBeenCalled();
  });

  it("shows a configuration error if setup fails on mount", async () => {
    (configureGoogleCalendarAuth as jest.Mock).mockImplementation(() => {
      throw new Error("Bad setup");
    });

    render(
      <CalendarAuthProvider>
        <Consumer />
      </CalendarAuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error").props.children).toBe("Bad setup");
    });
  });
});