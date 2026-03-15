import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { ResponseType } from "expo-auth-session";
import {
  completeAuthSession,
  disconnectGoogleCalendar,
  getCalendarConnectionState,
  getRedirectUri,
} from "../../services/calendarAuthService";

interface CalendarAuthContextType {
  isConnected: boolean;
  connectedAt: string | null;
  isLoading: boolean;
  error: string | null;
  connectCalendar: () => Promise<void>;
  disconnectCalendar: () => Promise<void>;
  refreshConnection: () => Promise<void>;
}

const CalendarAuthContext = createContext<CalendarAuthContextType | undefined>(
  undefined,
);

export default function CalendarAuthProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    "";

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientId,
    expoClientId: googleClientId,
    redirectUri: getRedirectUri(),
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "openid",
      "email",
      "profile",
    ],
    responseType: ResponseType.Code,
    extraParams: {
      access_type: "offline",
      prompt: "consent",
    },
  });

  useEffect(() => {
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  const refreshConnection = useCallback(async () => {
    const state = await getCalendarConnectionState();
    setIsConnected(state.isConnected);
    setConnectedAt(state.connectedAt);
  }, []);

  useEffect(() => {
    refreshConnection().catch(() => {
      setError("Unable to read calendar connection state.");
    });
  }, [refreshConnection]);

  useEffect(() => {
    if (response?.type === "success" && request?.codeVerifier) {
      const { code } = response.params;
      setIsLoading(true);
      completeAuthSession(code, request.codeVerifier, request.redirectUri)
        .then((state) => {
          setIsConnected(state.isConnected);
          setConnectedAt(state.connectedAt);
        })
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to exchange authorization code.",
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (response?.type === "error") {
      setError("Google sign-in failed: " + response.error?.message);
      setIsLoading(false);
    }
  }, [response, request]);

  const connectCalendar = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    if (!googleClientId) {
      setError("Google OAuth web client ID is missing. Update .env and restart.");
      setIsLoading(false);
      return;
    }

    try {
      await promptAsync({ useProxy: true });
      // The actual connection completion happens in the useEffect when response changes
    } catch (connectionError) {
      const message =
        connectionError instanceof Error
          ? connectionError.message
          : "Unable to initiate Google Calendar connection.";
      setError(message);
      setIsLoading(false);
    }
  }, [promptAsync, googleClientId]);

  const disconnectCalendar = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await disconnectGoogleCalendar();
      setIsConnected(false);
      setConnectedAt(null);
    } catch {
      setError("Unable to disconnect Google Calendar.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      isConnected,
      connectedAt,
      isLoading,
      error,
      connectCalendar,
      disconnectCalendar,
      refreshConnection,
    }),
    [
      isConnected,
      connectedAt,
      isLoading,
      error,
      connectCalendar,
      disconnectCalendar,
      refreshConnection,
    ],
  );

  return (
    <CalendarAuthContext.Provider value={value}>
      {children}
    </CalendarAuthContext.Provider>
  );
}

export function useCalendarAuth(): CalendarAuthContextType {
  const context = useContext(CalendarAuthContext);

  if (context === undefined) {
    throw new Error("useCalendarAuth must be used within a CalendarAuthProvider");
  }

  return context;
}
