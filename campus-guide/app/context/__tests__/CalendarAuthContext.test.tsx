import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import CalendarAuthProvider, { useCalendarAuth } from "../CalendarAuthContext";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getCalendarConnectionState,
} from "@services/calendarAuthService";

jest.mock("@services/calendarAuthService", () => ({
  connectGoogleCalendar: jest.fn(),
  disconnectGoogleCalendar: jest.fn(),
  getCalendarConnectionState: jest.fn(),
}));

describe("CalendarAuthContext", () => {
  const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
    <CalendarAuthProvider>{children}</CalendarAuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (getCalendarConnectionState as jest.Mock).mockResolvedValue({
      isConnected: false,
      connectedAt: null,
    });
  });

  it("connects calendar successfully", async () => {
    (connectGoogleCalendar as jest.Mock).mockResolvedValueOnce({
      isConnected: true,
      connectedAt: "2026-03-14T00:00:00.000Z",
    });

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await result.current.connectCalendar();
    });

    expect(connectGoogleCalendar).toHaveBeenCalledTimes(1);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectedAt).toBe("2026-03-14T00:00:00.000Z");
    expect(result.current.error).toBeNull();
  });

  it("disconnects calendar and resets state", async () => {
    (connectGoogleCalendar as jest.Mock).mockResolvedValueOnce({
      isConnected: true,
      connectedAt: "2026-03-14T00:00:00.000Z",
    });
    (disconnectGoogleCalendar as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await result.current.connectCalendar();
    });

    await act(async () => {
      await result.current.disconnectCalendar();
    });

    expect(disconnectGoogleCalendar).toHaveBeenCalledTimes(1);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectedAt).toBeNull();
  });
});


