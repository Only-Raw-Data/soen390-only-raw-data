import { useCallback, useRef } from "react";
import { usePostHog } from "posthog-react-native";

const DEFAULT_WINDOW_MS = 12_000;

/**
 * Call trackAction("my_action") when an action occurs; fires action_repeated
 * when the same action happens more than once within the time window.
 */
export function useActionRepeatSignal(windowMs: number = DEFAULT_WINDOW_MS) {
  const posthog = usePostHog();
  const countsRef = useRef<Record<string, number>>({});
  const windowStartRef = useRef<Record<string, number>>({});

  const trackAction = useCallback(
    (actionName: string) => {
      const now = Date.now();
      const start = windowStartRef.current[actionName];
      if (start === undefined || now - start > windowMs) {
        windowStartRef.current[actionName] = now;
        countsRef.current[actionName] = 1;
        return;
      }
      const next = (countsRef.current[actionName] ?? 0) + 1;
      countsRef.current[actionName] = next;
      if (next > 1) {
        posthog.capture("action_repeated", {
          action: actionName,
          count: next,
        });
      }
    },
    [posthog, windowMs],
  );

  return trackAction;
}
