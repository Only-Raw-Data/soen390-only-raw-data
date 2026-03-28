import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from "expo-web-browser";
import Constants from 'expo-constants';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { PostHogProvider } from 'posthog-react-native';

import { useColorScheme } from '@/components/useColorScheme';
import ParticipantIdentifier from '@components/ParticipantIdentifier';
import { ParticipantSessionProvider } from '@context/ParticipantSessionContext';

const isExpoGo = Constants.appOwnership === 'expo';

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

  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY!}
      options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
        enableSessionReplay: !isExpoGo,
        ...(!isExpoGo && {
          sessionReplayConfig: {
            maskAllTextInputs: false,
            maskAllImages: false,
            captureLog: true,
            captureNetworkTelemetry: true,
          },
        }),
      }}
    >
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
    </PostHogProvider>
  );
}
