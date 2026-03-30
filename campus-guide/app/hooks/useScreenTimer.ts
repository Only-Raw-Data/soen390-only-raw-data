import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-react-native";

/**
 * On unmount, sends screen_time with duration the user spent on this screen (seconds).
 */
export function useScreenTimer(screenName: string) {
  const posthog = usePostHog();
  const startedAt = useRef(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    return () => {
      const duration_seconds = (Date.now() - startedAt.current) / 1000;
      posthog.capture("screen_time", {
        screen_name: screenName,
        duration_seconds,
      });
    };
  }, [screenName, posthog]);
}
