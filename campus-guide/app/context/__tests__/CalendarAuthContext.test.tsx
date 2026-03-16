import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import CalendarAuthProvider, { useCalendarAuth } from "../CalendarAuthContext";
import {
  completeAuthSession,
  disconnectGoogleCalendar,
  getCalendarConnectionState,
} from "@services/calendarAuthService";

const mockPromptAsync = jest.fn();
let mockAuthRequest: { codeVerifier: string; redirectUri: string } | null = {
  codeVerifier: "verifier",
  redirectUri: "https://example.com/auth-callback",
};
let mockAuthResponse: any = null;

jest.mock("expo-auth-session", () => ({
  ResponseType: {
    Code: "code",
  },
}));

jest.mock("expo-auth-session/providers/google", () => ({
  useAuthRequest: () => [mockAuthRequest, mockAuthResponse, mockPromptAsync],
}));

jest.mock("expo-web-browser", () => ({
  warmUpAsync: jest.fn().mockResolvedValue(undefined),
  coolDownAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@services/calendarAuthService", () => ({
  completeAuthSession: jest.fn(),
  disconnectGoogleCalendar: jest.fn(),
  getCalendarConnectionState: jest.fn(),
  getRedirectUri: jest.fn(() => "https://example.com/auth-callback"),
}));

describe("CalendarAuthContext", () => {
  const originalCalendarClientId = process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
  const originalGoogleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

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
    mockAuthRequest = {
      codeVerifier: "verifier",
      redirectUri: "https://example.com/auth-callback",
    };
    mockAuthResponse = null;
    (completeAuthSession as jest.Mock).mockResolvedValue({
      isConnected: true,
      connectedAt: "2026-03-14T00:00:00.000Z",
    });
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID = originalCalendarClientId;
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = originalGoogleClientId;
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

  it("sets an error when OAuth client id is missing", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID = "";
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = "";

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await result.current.connectCalendar();
    });

    expect(mockPromptAsync).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      "Google OAuth web client ID is missing. Update .env and restart.",
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("surfaces promptAsync errors", async () => {
    mockPromptAsync.mockRejectedValueOnce(new Error("prompt failed"));

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await result.current.connectCalendar();
    });

    expect(result.current.error).toBe("prompt failed");
    expect(result.current.isLoading).toBe(false);
  });

  it("uses fallback message when promptAsync throws a non-Error value", async () => {
    mockPromptAsync.mockRejectedValueOnce("prompt failed");

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await result.current.connectCalendar();
    });

    expect(result.current.error).toBe("Unable to initiate Google Calendar connection.");
    expect(result.current.isLoading).toBe(false);
  });

  it("completes auth session when Google response succeeds", async () => {
    mockAuthResponse = { type: "success", params: { code: "auth-code" } };

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(completeAuthSession).toHaveBeenCalledWith(
      "auth-code",
      "verifier",
      "https://example.com/auth-callback",
    );
    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectedAt).toBe("2026-03-14T00:00:00.000Z");
    expect(result.current.isLoading).toBe(false);
  });

  it("sets an error when response type is error", async () => {
    mockAuthResponse = { type: "error", error: { message: "denied" } };

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe("Google sign-in failed: denied");
    expect(result.current.isLoading).toBe(false);
  });

  it("sets an exchange error when completeAuthSession fails", async () => {
    mockAuthResponse = { type: "success", params: { code: "auth-code" } };
    (completeAuthSession as jest.Mock).mockRejectedValueOnce(
      new Error("token exchange failed"),
    );

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe("token exchange failed");
    expect(result.current.isLoading).toBe(false);
  });

  it("uses fallback message when code exchange rejects with non-Error", async () => {
    mockAuthResponse = { type: "success", params: { code: "auth-code" } };
    (completeAuthSession as jest.Mock).mockRejectedValueOnce("exchange failed");

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe("Failed to exchange authorization code.");
    expect(result.current.isLoading).toBe(false);
  });

  it("sets disconnect error when disconnectCalendar fails", async () => {
    (disconnectGoogleCalendar as jest.Mock).mockRejectedValueOnce(
      new Error("disconnect failed"),
    );

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await result.current.disconnectCalendar();
    });

    expect(result.current.error).toBe("Unable to disconnect Google Calendar.");
    expect(result.current.isLoading).toBe(false);
  });

  it("refreshes connection state", async () => {
    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    (getCalendarConnectionState as jest.Mock).mockResolvedValueOnce({
      isConnected: true,
      connectedAt: "2026-03-15T00:00:00.000Z",
    });

    await act(async () => {
      await result.current.refreshConnection();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectedAt).toBe("2026-03-15T00:00:00.000Z");
  });

  it("sets error when initial connection-state read fails", async () => {
    (getCalendarConnectionState as jest.Mock).mockRejectedValueOnce(
      new Error("read failed"),
    );

    const { result } = renderHook(() => useCalendarAuth(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe("Unable to read calendar connection state.");
  });

  it("throws when useCalendarAuth is used outside provider", () => {
    expect(() => renderHook(() => useCalendarAuth())).toThrow(
      "useCalendarAuth must be used within a CalendarAuthProvider",
    );
  });
});


