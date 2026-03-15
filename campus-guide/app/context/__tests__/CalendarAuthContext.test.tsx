import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import CalendarAuthProvider, { useCalendarAuth } from "../CalendarAuthContext";
import {
  completeAuthSession,
  disconnectGoogleCalendar,
  getCalendarConnectionState,
} from "@services/calendarAuthService";

const mockPromptAsync = jest.fn();

jest.mock("expo-auth-session", () => ({
  ResponseType: {
    Code: "code",
  },
}));

jest.mock("expo-auth-session/providers/google", () => ({
  useAuthRequest: () => [
    {
      codeVerifier: "verifier",
      redirectUri: "https://auth.expo.io/@nguyen2026/campus-guide",
    },
    null,
    mockPromptAsync,
  ],
}));

jest.mock("expo-web-browser", () => ({
  warmUpAsync: jest.fn().mockResolvedValue(undefined),
  coolDownAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@services/calendarAuthService", () => ({
  completeAuthSession: jest.fn(),
  disconnectGoogleCalendar: jest.fn(),
  getCalendarConnectionState: jest.fn(),
  getRedirectUri: jest.fn(() => "https://auth.expo.io/@nguyen2026/campus-guide"),
}));

describe("CalendarAuthContext", () => {
  const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
    <CalendarAuthProvider>{children}</CalendarAuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID = "test-client-id";
    (getCalendarConnectionState as jest.Mock).mockResolvedValue({
      isConnected: false,
      connectedAt: null,
    });
    mockPromptAsync.mockResolvedValue({ type: "success", params: { code: "abc" } });
  });

  it("calls Google prompt when connectCalendar is pressed", async () => {
    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await result.current.connectCalendar();
    });

    expect(mockPromptAsync).toHaveBeenCalledWith({ useProxy: true });
    expect(completeAuthSession).not.toHaveBeenCalled();
  });

  it("disconnects calendar and resets state", async () => {
    (disconnectGoogleCalendar as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });


    await act(async () => {
      await result.current.disconnectCalendar();
    });

    expect(disconnectGoogleCalendar).toHaveBeenCalledTimes(1);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectedAt).toBeNull();
  });
});


