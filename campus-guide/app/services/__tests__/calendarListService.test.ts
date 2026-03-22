import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchUserCalendars,
  getSelectedCalendarId,
  saveSelectedCalendarId,
  clearSelectedCalendar,
  GoogleCalendar,
} from '../calendarListService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const SELECTED_CALENDAR_KEY = 'selected_calendar_id';

const mockCalendars: GoogleCalendar[] = [
  {
    id: 'cal1',
    summary: 'My Calendar',
    description: 'Primary calendar',
    backgroundColor: '#4285F4',
    primary: true,
  },
  {
    id: 'cal2',
    summary: 'Work',
    backgroundColor: '#0F9D58',
  },
];

describe('calendarListService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    global.fetch = jest.fn();
  });

  describe('fetchUserCalendars', () => {
    it('returns calendar items on successful response', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ items: mockCalendars }),
      });

      // Act
      const result = await fetchUserCalendars('valid-token');

      // Assert
      expect(result).toEqual(mockCalendars);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        { headers: { Authorization: 'Bearer valid-token' } }
      );
    });

    it('returns empty array when items is missing from response', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({}),
      });

      // Act
      const result = await fetchUserCalendars('token');

      // Assert
      expect(result).toEqual([]);
    });

    it('throws an error on non-200 response', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      // Act + Assert
      await expect(fetchUserCalendars('bad-token')).rejects.toThrow(
        'Failed to fetch calendars: 401 Unauthorized'
      );
    });

    it('throws when fetch network fails', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act + Assert
      await expect(fetchUserCalendars('token')).rejects.toThrow('Network error');
    });
  });

  describe('getSelectedCalendarId', () => {
    it('returns null when nothing is stored', async () => {
      // Arrange + Act
      const result = await getSelectedCalendarId();

      // Assert
      expect(result).toBeNull();
    });

    it('returns stored calendar ID', async () => {
      // Arrange
      await AsyncStorage.setItem(SELECTED_CALENDAR_KEY, 'cal1');

      // Act
      const result = await getSelectedCalendarId();

      // Assert
      expect(result).toBe('cal1');
    });
  });

  describe('saveSelectedCalendarId', () => {
    it('persists the calendar ID to AsyncStorage', async () => {
      // Arrange + Act
      await saveSelectedCalendarId('cal2');

      // Assert
      const stored = await AsyncStorage.getItem(SELECTED_CALENDAR_KEY);
      expect(stored).toBe('cal2');
    });
  });

  describe('clearSelectedCalendar', () => {
    it('removes the selected calendar from AsyncStorage', async () => {
      // Arrange
      await AsyncStorage.setItem(SELECTED_CALENDAR_KEY, 'cal1');

      // Act
      await clearSelectedCalendar();

      // Assert
      const stored = await AsyncStorage.getItem(SELECTED_CALENDAR_KEY);
      expect(stored).toBeNull();
    });

    it('does not throw when nothing is stored', async () => {
      // Arrange + Act + Assert
      await expect(clearSelectedCalendar()).resolves.not.toThrow();
    });
  });
});
