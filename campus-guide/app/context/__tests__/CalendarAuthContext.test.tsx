import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import CalendarAuthProvider, { useCalendarAuth } from '../CalendarAuthContext';
import * as calendarAuthService from '@services/calendarAuthService';

jest.mock('@services/calendarAuthService', () => ({
  getRedirectUri: jest.fn(() => 'https://auth.expo.io/@testuser/test-app'),
  getCalendarConnectionState: jest.fn(),
  completeAuthSession: jest.fn(),
  disconnectGoogleCalendar: jest.fn(),
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

jest.mock('expo-web-browser', () => ({
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  ResponseType: { Code: 'code' },
}));

const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
  <CalendarAuthProvider>{children}</CalendarAuthProvider>
);

describe('CalendarAuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (calendarAuthService.getCalendarConnectionState as jest.Mock).mockResolvedValue({
      isConnected: false,
      connectedAt: null,
    });
  });

  describe('initial state', () => {
    it('initializes with default values', async () => {
      // Arrange + Act
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.connectedAt).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('throws when used outside provider', () => {
      // Arrange
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act + Assert
      expect(() => renderHook(() => useCalendarAuth())).toThrow(
        'useCalendarAuth must be used within a CalendarAuthProvider'
      );

      spy.mockRestore();
    });
  });

  describe('refreshConnection', () => {
    it('sets isConnected true when calendar is connected', async () => {
      // Arrange
      (calendarAuthService.getCalendarConnectionState as jest.Mock).mockResolvedValue({
        isConnected: true,
        connectedAt: '2024-01-01T00:00:00.000Z',
      });

      // Act
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectedAt).toBe('2024-01-01T00:00:00.000Z');
      });
    });

    it('sets error when refreshConnection fails', async () => {
      // Arrange
      (calendarAuthService.getCalendarConnectionState as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Act
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe('Unable to read calendar connection state.');
      });
    });
  });

  describe('connectCalendar', () => {
    it('sets error when client ID is missing', async () => {
      // Arrange
      const originalEnv = process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
      delete process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
      delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Act
      await act(async () => {
        await result.current.connectCalendar();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe(
          'Google OAuth web client ID is missing. Update .env and restart.'
        );
      });

      process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID = originalEnv;
    });
  });

  describe('disconnectCalendar', () => {
    it('sets isConnected to false after disconnecting', async () => {
      // Arrange
      (calendarAuthService.getCalendarConnectionState as jest.Mock).mockResolvedValue({
        isConnected: true,
        connectedAt: '2024-01-01T00:00:00.000Z',
      });
      (calendarAuthService.disconnectGoogleCalendar as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCalendarAuth(), { wrapper });
      await waitFor(() => expect(result.current.isConnected).toBe(true));

      // Act
      await act(async () => {
        await result.current.disconnectCalendar();
      });

      // Assert
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectedAt).toBeNull();
    });

    it('sets error when disconnect fails', async () => {
      // Arrange
      (calendarAuthService.disconnectGoogleCalendar as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Act
      await act(async () => {
        await result.current.disconnectCalendar();
      });

      // Assert
      expect(result.current.error).toBe('Unable to disconnect Google Calendar.');
    });

    it('sets isLoading to false after disconnect completes', async () => {
      // Arrange
      (calendarAuthService.disconnectGoogleCalendar as jest.Mock).mockResolvedValue(undefined);
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Act
      await act(async () => {
        await result.current.disconnectCalendar();
      });

      // Assert
      expect(result.current.isLoading).toBe(false);
    });
  });
});