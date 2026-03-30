import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { usePostHog } from 'posthog-react-native';

const PATHNAME_TO_SCREEN: Record<string, string> = {
  '/': 'Map',
  '/two': 'Directions',
  '/indoor': 'Indoor Navigation',
  '/schedule': 'Schedule',
  '/poi': 'Points of Interest',
};

export function usePostHogScreenTracker() {
  const pathname = usePathname();
  const posthog = usePostHog();

  useEffect(() => {
    const screenName = PATHNAME_TO_SCREEN[pathname] ?? pathname;
    posthog.screen(screenName, { path: pathname });
  }, [pathname, posthog]);
}
