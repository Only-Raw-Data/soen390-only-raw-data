import { useCallback, useEffect, useRef } from "react";
import { usePostHog } from "posthog-react-native";
import { useParticipantSession } from "@context/ParticipantSessionContext";

export type TaskSessionStartMode = "mount" | "manual";

export type TaskSessionAnalyticsProps = Record<
  string,
  string | number | boolean
>;

const EMPTY_TASK_ANALYTICS: TaskSessionAnalyticsProps = {};

export function useTaskSession(
  taskId: string,
  taskName: string,
  options?: {
    startWhen?: TaskSessionStartMode;
    enabled?: boolean;
    /** Extra PostHog properties on task_started / task_completed (e.g. epic, user_stories). */
    analyticsProps?: TaskSessionAnalyticsProps;
  },
) {
  const posthog = usePostHog();
  const { participantId } = useParticipantSession();
  const startWhen = options?.startWhen ?? "mount";
  const enabled = options?.enabled !== false;
  const analyticsProps = options?.analyticsProps ?? EMPTY_TASK_ANALYTICS;
  const startTimeRef = useRef(Date.now());
  const hasBegunRef = useRef(false);
  const completedRef = useRef(false);

  const beginTask = useCallback(() => {
    if (!enabled) return;
    if (hasBegunRef.current) return;
    hasBegunRef.current = true;
    startTimeRef.current = Date.now();
    posthog.capture("task_started", {
      ...analyticsProps,
      task_id: taskId,
      task_name: taskName,
      participant_id: participantId ?? "",
    });
  }, [enabled, taskId, taskName, participantId, posthog, analyticsProps]);

  useEffect(() => {
    if (!enabled) return;
    if (startWhen === "mount") {
      beginTask();
    }
  }, [enabled, startWhen, beginTask]);

  const completeTask = useCallback(
    (success: boolean, reason?: string) => {
      if (!enabled || !hasBegunRef.current) return;
      if (completedRef.current) return;
      completedRef.current = true;
      const duration_seconds = (Date.now() - startTimeRef.current) / 1000;
      posthog.capture("task_completed", {
        ...analyticsProps,
        task_id: taskId,
        task_name: taskName,
        success,
        reason: reason ?? "",
        duration_seconds,
        participant_id: participantId ?? "",
      });
    },
    [enabled, taskId, taskName, participantId, posthog, analyticsProps],
  );

  const failTask = useCallback(
    (reason: string) => {
      completeTask(false, reason);
    },
    [completeTask],
  );

  return { completeTask, failTask, beginTask };
}
