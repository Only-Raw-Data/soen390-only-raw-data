import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

const STORAGE_KEY_CONNECTED = "calendar_connected";
const STORAGE_KEY_CONNECTED_AT = "calendar_connected_at";
const STORAGE_KEY_ACCESS_TOKEN = "calendar_access_token";

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
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
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
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  const tokens = await GoogleSignin.getTokens();

  if (!tokens.accessToken) {
    throw new Error("No access token received");
  }

  const connectedAt = new Date().toISOString();

  await AsyncStorage.multiSet([
    [STORAGE_KEY_CONNECTED, "true"],
    [STORAGE_KEY_CONNECTED_AT, connectedAt],
    [STORAGE_KEY_ACCESS_TOKEN, tokens.accessToken],
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
  return AsyncStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
}

export async function disconnectGoogleCalendar() {
  try {
    await GoogleSignin.revokeAccess();
  } catch {}

  try {
    await GoogleSignin.signOut();
  } catch {}

  await AsyncStorage.multiRemove([
    STORAGE_KEY_CONNECTED,
    STORAGE_KEY_CONNECTED_AT,
    STORAGE_KEY_ACCESS_TOKEN,
  ]);
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