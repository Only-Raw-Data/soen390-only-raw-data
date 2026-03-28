import { useCallback, useEffect, useRef } from "react";
import { usePostHog } from "posthog-react-native";
import { useParticipantSession } from "@context/ParticipantSessionContext";

export type TaskSessionStartMode = "mount" | "manual";

export function useTaskSession(
  taskId: string,
  taskName: string,
  options?: { startWhen?: TaskSessionStartMode; enabled?: boolean },
) {
  const posthog = usePostHog();
  const { participantId } = useParticipantSession();
  const startWhen = options?.startWhen ?? "mount";
  const enabled = options?.enabled !== false;
  const startTimeRef = useRef(Date.now());
  const hasBegunRef = useRef(false);
  const completedRef = useRef(false);

  const beginTask = useCallback(() => {
    if (!enabled) return;
    if (hasBegunRef.current) return;
    hasBegunRef.current = true;
    startTimeRef.current = Date.now();
    posthog.capture("task_started", {
      task_id: taskId,
      task_name: taskName,
      participant_id: participantId ?? "",
    });
  }, [enabled, taskId, taskName, participantId, posthog]);

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
        task_id: taskId,
        task_name: taskName,
        success,
        reason: reason ?? "",
        duration_seconds,
        participant_id: participantId ?? "",
      });
    },
    [enabled, taskId, taskName, participantId, posthog],
  );

  const failTask = useCallback(
    (reason: string) => {
      completeTask(false, reason);
    },
    [completeTask],
  );

  return { completeTask, failTask, beginTask };
}
