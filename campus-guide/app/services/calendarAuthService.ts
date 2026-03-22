import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY_CONNECTED = 'calendar_connected';
const STORAGE_KEY_CONNECTED_AT = 'calendar_connected_at';
const STORAGE_KEY_TOKENS = 'calendar_tokens';

export function getRedirectUri(): string {
  const username = process.env.EXPO_PUBLIC_EXPO_USERNAME;
  const slug = process.env.EXPO_PUBLIC_APP_SLUG;
  return `https://auth.expo.io/@${username}/${slug}`;
}

export async function getCalendarConnectionState(): Promise<{
  isConnected: boolean;
  connectedAt: string | null;
}> {
  const isConnected = await AsyncStorage.getItem(STORAGE_KEY_CONNECTED);
  const connectedAt = await AsyncStorage.getItem(STORAGE_KEY_CONNECTED_AT);
  return {
    isConnected: isConnected === 'true',
    connectedAt,
  };
}

export async function completeAuthSession(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<{ isConnected: boolean; connectedAt: string | null }> {
  const connectedAt = new Date().toISOString();
  await AsyncStorage.setItem(STORAGE_KEY_CONNECTED, 'true');
  await AsyncStorage.setItem(STORAGE_KEY_CONNECTED_AT, connectedAt);
  return { isConnected: true, connectedAt };
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_CONNECTED);
  await AsyncStorage.removeItem(STORAGE_KEY_CONNECTED_AT);
  await AsyncStorage.removeItem(STORAGE_KEY_TOKENS);
  await AsyncStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
}

const STORAGE_KEY_ACCESS_TOKEN = 'calendar_access_token';

export async function storeAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, token);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
}