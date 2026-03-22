import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getRedirectUri,
  getCalendarConnectionState,
  completeAuthSession,
  disconnectGoogleCalendar,
  storeAccessToken,
  getAccessToken,
} from '../calendarAuthService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

describe('calendarAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    process.env.EXPO_PUBLIC_EXPO_USERNAME = 'testuser';
    process.env.EXPO_PUBLIC_APP_SLUG = 'test-app';
  });

  describe('getRedirectUri', () => {
    it('returns correct proxy URL with username and slug', () => {
      // Arrange + Act
      const uri = getRedirectUri();

      // Assert
      expect(uri).toBe('https://auth.expo.io/@testuser/test-app');
    });

    it('returns URL with undefined when env vars are missing', () => {
      // Arrange
      delete process.env.EXPO_PUBLIC_EXPO_USERNAME;
      delete process.env.EXPO_PUBLIC_APP_SLUG;

      // Act
      const uri = getRedirectUri();

      // Assert
      expect(uri).toBe('https://auth.expo.io/@undefined/undefined');
    });
  });

  describe('getCalendarConnectionState', () => {
    it('returns isConnected false when nothing stored', async () => {
      // Arrange + Act
      const state = await getCalendarConnectionState();

      // Assert
      expect(state.isConnected).toBe(false);
      expect(state.connectedAt).toBeNull();
    });

    it('returns isConnected true when stored as true', async () => {
      // Arrange
      await AsyncStorage.setItem('calendar_connected', 'true');
      await AsyncStorage.setItem('calendar_connected_at', '2024-01-01T00:00:00.000Z');

      // Act
      const state = await getCalendarConnectionState();

      // Assert
      expect(state.isConnected).toBe(true);
      expect(state.connectedAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('returns isConnected false when stored as false', async () => {
      // Arrange
      await AsyncStorage.setItem('calendar_connected', 'false');

      // Act
      const state = await getCalendarConnectionState();

      // Assert
      expect(state.isConnected).toBe(false);
    });
  });

  describe('completeAuthSession', () => {
    it('stores connected state and returns isConnected true', async () => {
      // Arrange + Act
      const result = await completeAuthSession('code', 'verifier', 'redirectUri');

      // Assert
      expect(result.isConnected).toBe(true);
      expect(result.connectedAt).not.toBeNull();
    });

    it('persists connected state to AsyncStorage', async () => {
      // Arrange + Act
      await completeAuthSession('code', 'verifier', 'redirectUri');

      // Assert
      const stored = await AsyncStorage.getItem('calendar_connected');
      expect(stored).toBe('true');
    });

    it('stores connectedAt as valid ISO string', async () => {
      // Arrange + Act
      const result = await completeAuthSession('code', 'verifier', 'redirectUri');

      // Assert
      expect(() => new Date(result.connectedAt!)).not.toThrow();
    });
  });

  describe('disconnectGoogleCalendar', () => {
    it('clears all calendar keys from AsyncStorage including access token', async () => {
      // Arrange
      await AsyncStorage.setItem('calendar_connected', 'true');
      await AsyncStorage.setItem('calendar_connected_at', '2024-01-01T00:00:00.000Z');
      await AsyncStorage.setItem('calendar_tokens', 'some-token');
      await AsyncStorage.setItem('calendar_access_token', 'access-token');

      // Act
      await disconnectGoogleCalendar();

      // Assert
      expect(await AsyncStorage.getItem('calendar_connected')).toBeNull();
      expect(await AsyncStorage.getItem('calendar_connected_at')).toBeNull();
      expect(await AsyncStorage.getItem('calendar_tokens')).toBeNull();
      expect(await AsyncStorage.getItem('calendar_access_token')).toBeNull();
    });

    it('does not throw when nothing is stored', async () => {
      // Arrange + Act + Assert
      await expect(disconnectGoogleCalendar()).resolves.not.toThrow();
    });
  });

  describe('storeAccessToken', () => {
    it('saves access token to AsyncStorage', async () => {
      // Arrange + Act
      await storeAccessToken('my-access-token');

      // Assert
      const stored = await AsyncStorage.getItem('calendar_access_token');
      expect(stored).toBe('my-access-token');
    });
  });

  describe('getAccessToken', () => {
    it('returns token from AsyncStorage when stored', async () => {
      // Arrange
      await AsyncStorage.setItem('calendar_access_token', 'stored-token');

      // Act
      const token = await getAccessToken();

      // Assert
      expect(token).toBe('stored-token');
    });

    it('returns null when no token stored', async () => {
      // Arrange + Act
      const token = await getAccessToken();

      // Assert
      expect(token).toBeNull();
    });
  });
});