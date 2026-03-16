import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import CalendarAuthProvider, { useCalendarAuth } from '../CalendarAuthContext';
import * as calendarAuthService from '@services/calendarAuthService';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

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
  const originalCalendarClientId = process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
  const originalGoogleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID = 'calendar-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'google-client-id';
    (Google.useAuthRequest as jest.Mock).mockReturnValue([null, null, jest.fn().mockResolvedValue(undefined)]);
    (calendarAuthService.getCalendarConnectionState as jest.Mock).mockResolvedValue({
      isConnected: false,
      connectedAt: null,
    });
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID = originalCalendarClientId;
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = originalGoogleClientId;
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
    it('calls promptAsync when client ID is available', async () => {
      // Arrange
      const promptAsync = jest.fn().mockResolvedValue(undefined);
      (Google.useAuthRequest as jest.Mock).mockReturnValue([null, null, promptAsync]);
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Act
      await act(async () => {
        await result.current.connectCalendar();
      });

      // Assert
      expect(promptAsync).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeNull();
    });

    it('sets error when client ID is missing', async () => {
      // Arrange
      const originalEnv = process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
      const originalFallback = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
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
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = originalFallback;
    });

    it('uses EXPO_PUBLIC_GOOGLE_CLIENT_ID fallback when calendar client ID is missing', async () => {
      // Arrange
      delete process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = 'fallback-client-id';
      const promptAsync = jest.fn().mockResolvedValue(undefined);
      (Google.useAuthRequest as jest.Mock).mockReturnValue([null, null, promptAsync]);
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Act
      await act(async () => {
        await result.current.connectCalendar();
      });

      // Assert
      expect(promptAsync).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeNull();
    });

    it('sets explicit message when promptAsync throws a non-Error', async () => {
      // Arrange
      const promptAsync = jest.fn().mockRejectedValue('unexpected');
      (Google.useAuthRequest as jest.Mock).mockReturnValue([null, null, promptAsync]);
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Act
      await act(async () => {
        await result.current.connectCalendar();
      });

      // Assert
      expect(result.current.error).toBe('Unable to initiate Google Calendar connection.');
      expect(result.current.isLoading).toBe(false);
    });

    it('surfaces Error message when promptAsync throws an Error', async () => {
      // Arrange
      const promptAsync = jest.fn().mockRejectedValue(new Error('Popup blocked'));
      (Google.useAuthRequest as jest.Mock).mockReturnValue([null, null, promptAsync]);
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Act
      await act(async () => {
        await result.current.connectCalendar();
      });

      // Assert
      expect(result.current.error).toBe('Popup blocked');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('OAuth response handling', () => {
    it('completes auth session on success response with code verifier', async () => {
      // Arrange
      (Google.useAuthRequest as jest.Mock).mockReturnValue([
        { codeVerifier: 'verifier-123' },
        { type: 'success', params: { code: 'auth-code-123' } },
        jest.fn(),
      ]);
      (calendarAuthService.completeAuthSession as jest.Mock).mockResolvedValue({
        isConnected: true,
        connectedAt: '2024-05-01T00:00:00.000Z',
      });

      // Act
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(calendarAuthService.completeAuthSession).toHaveBeenCalledWith(
          'auth-code-123',
          'verifier-123',
          'https://auth.expo.io/@testuser/test-app'
        );
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectedAt).toBe('2024-05-01T00:00:00.000Z');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets fallback exchange error when completeAuthSession rejects with non-Error', async () => {
      // Arrange
      (Google.useAuthRequest as jest.Mock).mockReturnValue([
        { codeVerifier: 'verifier-123' },
        { type: 'success', params: { code: 'auth-code-123' } },
        jest.fn(),
      ]);
      (calendarAuthService.completeAuthSession as jest.Mock).mockRejectedValue('bad exchange');

      // Act
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe('Failed to exchange authorization code.');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets oauth failure error when response type is error', async () => {
      // Arrange
      (Google.useAuthRequest as jest.Mock).mockReturnValue([
        null,
        { type: 'error', error: { message: 'access_denied' } },
        jest.fn(),
      ]);

      // Act
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(result.current.error).toBe('Google sign-in failed: access_denied');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('does not complete auth when success response has no codeVerifier', async () => {
      // Arrange
      (Google.useAuthRequest as jest.Mock).mockReturnValue([
        null,
        { type: 'success', params: { code: 'auth-code-123' } },
        jest.fn(),
      ]);

      // Act
      const { result } = renderHook(() => useCalendarAuth(), { wrapper });

      // Assert
      await waitFor(() => {
        expect(calendarAuthService.completeAuthSession).not.toHaveBeenCalled();
        expect(result.current.isConnected).toBe(false);
      });
    });
  });

  describe('web browser lifecycle', () => {
    it('warms up on mount and cools down on unmount', () => {
      // Arrange + Act
      const { unmount } = renderHook(() => useCalendarAuth(), { wrapper });

      // Assert
      expect(WebBrowser.warmUpAsync).toHaveBeenCalledTimes(1);
      unmount();
      expect(WebBrowser.coolDownAsync).toHaveBeenCalledTimes(1);
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