import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { GOOGLE_CALENDAR_SCOPES } from "@constants/calendarAuth";
import { CLASS_PREFIXES, isClassEvent } from "@utils/classEventFilter";
export { CLASS_PREFIXES, isClassEvent } from "@utils/classEventFilter";

const STORAGE_KEY_CONNECTED = "calendar_connected";
const STORAGE_KEY_CONNECTED_AT = "calendar_connected_at";
const STORAGE_KEY_ACCESS_TOKEN = "calendar_access_token";
const STORAGE_KEY_SELECTED_CALENDARS = "calendar_selected_ids";

export type CalendarInfo = {
  id: string;
  name: string;
};

let isConfigured = false;

export function configureGoogleCalendarAuth() {
  if (isConfigured) return;

  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";

  if (!webClientId) {
    throw new Error("Missing Google client ID in .env");
  }

  GoogleSignin.configure({
    webClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: GOOGLE_CALENDAR_SCOPES,
  });

  isConfigured = true;
}

export async function connectGoogleCalendar() {
  configureGoogleCalendarAuth();

  await GoogleSignin.hasPlayServices();

  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    throw new Error("User cancelled sign-in");
  }

  await GoogleSignin.addScopes({
    scopes: GOOGLE_CALENDAR_SCOPES,
  });

  const tokens = await GoogleSignin.getTokens();

  if (!tokens.accessToken) {
    throw new Error("No access token received");
  }

  const connectedAt = new Date().toISOString();

  await SecureStore.setItemAsync(STORAGE_KEY_ACCESS_TOKEN, tokens.accessToken);

  await AsyncStorage.multiSet([
    [STORAGE_KEY_CONNECTED, "true"],
    [STORAGE_KEY_CONNECTED_AT, connectedAt],
  ]);

  return { isConnected: true, connectedAt };
}

export async function getCalendarConnectionState() {
  const isConnected = await AsyncStorage.getItem(STORAGE_KEY_CONNECTED);
  const connectedAt = await AsyncStorage.getItem(STORAGE_KEY_CONNECTED_AT);

  return {
    isConnected: isConnected === "true",
    connectedAt,
  };
}

export async function getStoredCalendarAccessToken() {
  return SecureStore.getItemAsync(STORAGE_KEY_ACCESS_TOKEN);
}

export async function getFreshCalendarAccessToken(): Promise<string | null> {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken ?? null;
  } catch {
    try {
      await GoogleSignin.signInSilently();
      const tokens = await GoogleSignin.getTokens();
      return tokens.accessToken ?? null;
    } catch {
      return null;
    }
  }
}

export async function disconnectGoogleCalendar() {
  try {
    await GoogleSignin.revokeAccess();
  } catch {}

  try {
    await GoogleSignin.signOut();
  } catch {}

  await SecureStore.deleteItemAsync(STORAGE_KEY_ACCESS_TOKEN);

  await AsyncStorage.multiRemove([
    STORAGE_KEY_CONNECTED,
    STORAGE_KEY_CONNECTED_AT,
    STORAGE_KEY_SELECTED_CALENDARS,
  ]);
}

export type NextClassEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location: string | null;
};

export async function fetchNextClassEvent(
  token: string,
  calendarIds: string[],
): Promise<NextClassEvent | null> {
  if (calendarIds.length === 0) return null;

  const now = new Date();
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const allResults = await Promise.all(
    calendarIds.map(async (calendarId) => {
      const url =
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        new URLSearchParams({
          timeMin: now.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "10",
        }).toString();

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return [];

      const data = await response.json();
      const items: any[] = Array.isArray(data.items) ? data.items : [];

      return items
        .filter(
          (item) =>
            typeof item.id === "string" &&
            typeof item.start?.dateTime === "string" &&
            typeof item.end?.dateTime === "string" &&
            isClassEvent(typeof item.summary === "string" ? item.summary : ""),
        )
        .map((item) => ({
          id: `${calendarId}_${item.id}`,
          title: typeof item.summary === "string" ? item.summary : "Untitled Event",
          start: new Date(item.start.dateTime as string),
          end: new Date(item.end.dateTime as string),
          location: typeof item.location === "string" ? item.location : null,
        }));
    }),
  );

  const upcoming = allResults
    .flat()
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return upcoming[0] ?? null;
}

export async function fetchCalendars(token: string): Promise<CalendarInfo[]> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch calendars: ${errorText}`);
  }

  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .filter((item: any) => typeof item.id === "string")
    .map((item: any) => ({
      id: item.id as string,
      name: (item.summary as string) ?? (item.id as string),
    }));
}

export async function saveSelectedCalendarIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY_SELECTED_CALENDARS,
    JSON.stringify(ids),
  );
}

export async function getSelectedCalendarIds(): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_SELECTED_CALENDARS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return null;
  }
}

export function getGoogleSignInErrorMessage(error: unknown): string {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return "User cancelled sign-in";
      case statusCodes.IN_PROGRESS:
        return "Sign-in already in progress";
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return "Google Play Services not available";
      default:
        return error.message;
    }
  }

  return error instanceof Error ? error.message : "Unknown error";
}