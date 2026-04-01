import { useEffect, useRef } from "react";
import {
  USABILITY_ANALYTICS_T8,
  USABILITY_TASK_T8_CALENDAR,
} from "@/constants/usabilityTasks";
import type { TaskSessionAnalyticsProps } from "@hooks/useTaskSession";
import { useTaskSession } from "@hooks/useTaskSession";

/**
 * T8: Google Calendar connected and schedule / next class visible (US 4.1, US 4.3).
 */
export function useScheduleUsabilityTask(
  isConnected: boolean,
  eventsLoading: boolean,
  selectedCalendarIds: ReadonlySet<string>,
  eventsCount: number,
  hasNextClass: boolean,
) {
  const t8 = useTaskSession(
    USABILITY_TASK_T8_CALENDAR.id,
    USABILITY_TASK_T8_CALENDAR.name,
    {
      analyticsProps: USABILITY_ANALYTICS_T8 as TaskSessionAnalyticsProps,
    },
  );

  const { completeTask: completeT8 } = t8;

  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    if (!isConnected || eventsLoading || selectedCalendarIds.size === 0) {
      return;
    }
    if (eventsCount === 0 && !hasNextClass) return;

    doneRef.current = true;
    completeT8(true, "calendar_connected_and_schedule_viewed");
  }, [
    isConnected,
    eventsLoading,
    selectedCalendarIds,
    eventsCount,
    hasNextClass,
    completeT8,
  ]);
}
