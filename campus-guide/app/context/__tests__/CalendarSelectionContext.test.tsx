import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import CalendarSelectionProvider, {
  useCalendarSelection,
} from '../CalendarSelectionContext';
import * as calendarListService from '@services/calendarListService';
import * as CalendarAuthContext from '../CalendarAuthContext';

jest.mock('@services/calendarListService', () => ({
  fetchUserCalendars: jest.fn(),
  getSelectedCalendarId: jest.fn(),
  saveSelectedCalendarId: jest.fn(),
  clearSelectedCalendar: jest.fn(),
}));

jest.mock('../CalendarAuthContext', () => ({
  useCalendarAuth: jest.fn(),
}));

const mockCalendars = [
  { id: 'cal1', summary: 'Personal', backgroundColor: '#4285F4', primary: true },
  { id: 'cal2', summary: 'Work', backgroundColor: '#0F9D58' },
];

const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
  <CalendarSelectionProvider>{children}</CalendarSelectionProvider>
);

describe('CalendarSelectionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (CalendarAuthContext.useCalendarAuth as jest.Mock).mockReturnValue({
      accessToken: 'test-access-token',
      isConnected: true,
    });
    (calendarListService.getSelectedCalendarId as jest.Mock).mockResolvedValue(null);
  });

  describe('initial state', () => {
    it('initializes with default values', async () => {
      // Arrange + Act
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.calendars).toEqual([]);
        expect(result.current.selectedCalendarId).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('restores persisted calendar selection on mount', async () => {
      // Arrange
      (calendarListService.getSelectedCalendarId as jest.Mock).mockResolvedValue('cal1');

      // Act
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.selectedCalendarId).toBe('cal1');
      });
    });

    it('sets error when restoring selection fails', async () => {
      // Arrange
      (calendarListService.getSelectedCalendarId as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Act
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe('Unable to restore selected calendar.');
      });
    });

    it('throws when used outside provider', () => {
      // Arrange
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act + Assert
      expect(() => renderHook(() => useCalendarSelection())).toThrow(
        'useCalendarSelection must be used within a CalendarSelectionProvider'
      );

      spy.mockRestore();
    });
  });

  describe('fetchCalendars', () => {
    it('fetches and sets calendars on success', async () => {
      // Arrange
      (calendarListService.fetchUserCalendars as jest.Mock).mockResolvedValue(mockCalendars);
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchCalendars();
      });

      // Assert
      expect(result.current.calendars).toEqual(mockCalendars);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('calls fetchUserCalendars with the access token', async () => {
      // Arrange
      (calendarListService.fetchUserCalendars as jest.Mock).mockResolvedValue([]);
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchCalendars();
      });

      // Assert
      expect(calendarListService.fetchUserCalendars).toHaveBeenCalledWith('test-access-token');
    });

    it('sets error when not connected', async () => {
      // Arrange
      (CalendarAuthContext.useCalendarAuth as jest.Mock).mockReturnValue({
        accessToken: null,
        isConnected: false,
      });
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchCalendars();
      });

      // Assert
      expect(result.current.error).toBe('Connect your Google Calendar account first.');
    });

    it('sets error when access token is null but connected', async () => {
      // Arrange
      (CalendarAuthContext.useCalendarAuth as jest.Mock).mockReturnValue({
        accessToken: null,
        isConnected: true,
      });
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchCalendars();
      });

      // Assert
      expect(result.current.error).toBe(
        'No access token available. Please reconnect your account.'
      );
    });

    it('sets error message from Error on fetch failure', async () => {
      // Arrange
      (calendarListService.fetchUserCalendars as jest.Mock).mockRejectedValue(
        new Error('401 Unauthorized')
      );
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchCalendars();
      });

      // Assert
      expect(result.current.error).toBe('401 Unauthorized');
      expect(result.current.isLoading).toBe(false);
    });

    it('sets fallback error message on non-Error failure', async () => {
      // Arrange
      (calendarListService.fetchUserCalendars as jest.Mock).mockRejectedValue('unexpected');
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Act
      await act(async () => {
        await result.current.fetchCalendars();
      });

      // Assert
      expect(result.current.error).toBe('Failed to fetch calendars. Please try again.');
    });
  });

  describe('selectCalendar', () => {
    it('persists and updates selected calendar ID', async () => {
      // Arrange
      (calendarListService.saveSelectedCalendarId as jest.Mock).mockResolvedValue(undefined);
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });

      // Act
      await act(async () => {
        await result.current.selectCalendar('cal2');
      });

      // Assert
      expect(calendarListService.saveSelectedCalendarId).toHaveBeenCalledWith('cal2');
      expect(result.current.selectedCalendarId).toBe('cal2');
    });
  });

  describe('clearSelection', () => {
    it('clears persisted and state selection', async () => {
      // Arrange
      (calendarListService.getSelectedCalendarId as jest.Mock).mockResolvedValue('cal1');
      (calendarListService.clearSelectedCalendar as jest.Mock).mockResolvedValue(undefined);
      const { result } = renderHook(() => useCalendarSelection(), { wrapper });
      await waitFor(() => expect(result.current.selectedCalendarId).toBe('cal1'));

      // Act
      await act(async () => {
        await result.current.clearSelection();
      });

      // Assert
      expect(calendarListService.clearSelectedCalendar).toHaveBeenCalledTimes(1);
      expect(result.current.selectedCalendarId).toBeNull();
    });
  });
});
