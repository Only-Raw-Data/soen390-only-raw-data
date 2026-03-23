import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_SELECTED_CALENDAR = 'selected_calendar_id';
const GOOGLE_CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_LIST_ENDPOINT = '/users/me/calendarList';
const CALENDAR_LIST_URL = `${GOOGLE_CALENDAR_BASE_URL}${CALENDAR_LIST_ENDPOINT}`;

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  primary?: boolean;
}

export async function fetchUserCalendars(
  accessToken: string,
): Promise<GoogleCalendar[]> {
  const response = await fetch(CALENDAR_LIST_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch calendars: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { items?: GoogleCalendar[] };
  return data.items ?? [];
}

export async function getSelectedCalendarId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY_SELECTED_CALENDAR);
}

export async function saveSelectedCalendarId(calendarId: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_SELECTED_CALENDAR, calendarId);
}

export async function clearSelectedCalendar(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_SELECTED_CALENDAR);
}
