import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  GoogleCalendar,
  fetchUserCalendars,
  getSelectedCalendarId,
  saveSelectedCalendarId,
  clearSelectedCalendar,
} from '@services/calendarListService';
import { useCalendarAuth } from '@context/CalendarAuthContext';

interface CalendarSelectionContextType {
  readonly calendars: GoogleCalendar[];
  readonly selectedCalendarId: string | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  fetchCalendars: () => Promise<void>;
  selectCalendar: (calendarId: string) => Promise<void>;
  clearSelection: () => Promise<void>;
}

const CalendarSelectionContext = createContext<
  CalendarSelectionContextType | undefined
>(undefined);

export default function CalendarSelectionProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { accessToken, isConnected } = useCalendarAuth();
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const id = await getSelectedCalendarId();
        setSelectedCalendarId(id);
      } catch {
        setError('Unable to restore selected calendar.');
      }
    })();
  }, []);

  const fetchCalendars = useCallback(async () => {
    if (!isConnected) {
      setError('Connect your Google Calendar account first.');
      return;
    }

    if (!accessToken) {
      setError('No access token available. Please reconnect your account.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const items = await fetchUserCalendars(accessToken);
      setCalendars(items);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch calendars. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, isConnected]);

  const selectCalendar = useCallback(async (calendarId: string) => {
    await saveSelectedCalendarId(calendarId);
    setSelectedCalendarId(calendarId);
  }, []);

  const clearSelection = useCallback(async () => {
    await clearSelectedCalendar();
    setSelectedCalendarId(null);
  }, []);

  const value = useMemo(
    () => ({
      calendars,
      selectedCalendarId,
      isLoading,
      error,
      fetchCalendars,
      selectCalendar,
      clearSelection,
    }),
    [
      calendars,
      selectedCalendarId,
      isLoading,
      error,
      fetchCalendars,
      selectCalendar,
      clearSelection,
    ],
  );

  return (
    <CalendarSelectionContext.Provider value={value}>
      {children}
    </CalendarSelectionContext.Provider>
  );
}

export function useCalendarSelection(): CalendarSelectionContextType {
  const context = useContext(CalendarSelectionContext);

  if (context === undefined) {
    throw new Error(
      'useCalendarSelection must be used within a CalendarSelectionProvider',
    );
  }

  return context;
}
