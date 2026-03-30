import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from "expo-web-browser";
import Constants from 'expo-constants';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { PostHogProvider, PostHogSurveyProvider } from 'posthog-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import ParticipantIdentifier from '@components/ParticipantIdentifier';
import { ParticipantSessionProvider } from '@context/ParticipantSessionContext';

const isExpoGo = Constants.appOwnership === 'expo';

/** PostHogProvider requires a non-empty apiKey; use this when analytics are off. */
const POSTHOG_DISABLED_PLACEHOLDER_KEY = 'local-dev-posthog-off';

const posthogApiKey = (process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '').trim();
const posthogEnabled = posthogApiKey.length > 0;

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

WebBrowser.maybeCompleteAuthSession();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  const appTree = (
    <ParticipantSessionProvider>
      <ParticipantIdentifier>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="moderator"
              options={{ presentation: 'modal', title: 'Session setup' }}
            />
          </Stack>
        </ThemeProvider>
      </ParticipantIdentifier>
    </ParticipantSessionProvider>
  );

  return (
    <PostHogProvider
      apiKey={posthogEnabled ? posthogApiKey : POSTHOG_DISABLED_PLACEHOLDER_KEY}
      options={{
        disabled: !posthogEnabled,
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
        enableSessionReplay: posthogEnabled && !isExpoGo,
        ...(posthogEnabled &&
          !isExpoGo && {
            sessionReplayConfig: {
              maskAllTextInputs: false,
              maskAllImages: false,
              captureLog: true,
              captureNetworkTelemetry: true,
            },
          }),
      }}
    >
      {posthogEnabled ? (
        <PostHogSurveyProvider>{appTree}</PostHogSurveyProvider>
      ) : (
        appTree
      )}
    </PostHogProvider>
  );
}
