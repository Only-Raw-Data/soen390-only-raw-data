import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  configureGoogleCalendarAuth,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getCalendarConnectionState,
  getGoogleSignInErrorMessage,
} from "@services/calendarAuthService";

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

  useEffect(() => {
    try {
      configureGoogleCalendarAuth();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to configure Google auth",
      );
    }
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

  const connectCalendar = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const state = await connectGoogleCalendar();
      setIsConnected(state.isConnected);
      setConnectedAt(state.connectedAt);
    } catch (err) {
      setError(getGoogleSignInErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  if (!context) {
    throw new Error("useCalendarAuth must be used within a provider");
  }

  return context;
}