import { useEffect, useRef } from "react";
import { useIndoorMap } from "@context/IndoorMapContext";
import type { GraphNode } from "@app/services/indoorGraphService";
import {
  USABILITY_ANALYTICS_T6,
  USABILITY_ANALYTICS_T7,
  USABILITY_TASK_T6_INDOOR_SHORTEST,
  USABILITY_TASK_T7_INDOOR_ACCESSIBLE,
} from "@/constants/usabilityTasks";
import type { TaskSessionAnalyticsProps } from "@hooks/useTaskSession";
import { useTaskSession } from "@hooks/useTaskSession";

function pathTouchesUpperFloor(path: GraphNode[]): boolean {
  if (path.length === 0) return false;
  let maxFloor = path[0]!.floor;
  let minFloor = maxFloor;
  for (const n of path) {
    maxFloor = Math.max(maxFloor, n.floor);
    minFloor = Math.min(minFloor, n.floor);
  }
  return maxFloor >= 2 || maxFloor > minFloor;
}

/**
 * T6: shortest indoor path (US 3.1–3.2). T7: accessible path to upper floor (US 3.3).
 */
export function useIndoorUsabilityTasks() {
  const { currentPath, accessible, isCrossBuilding } = useIndoorMap();

  const t6 = useTaskSession(
    USABILITY_TASK_T6_INDOOR_SHORTEST.id,
    USABILITY_TASK_T6_INDOOR_SHORTEST.name,
    {
      analyticsProps: USABILITY_ANALYTICS_T6 as TaskSessionAnalyticsProps,
    },
  );

  const t7 = useTaskSession(
    USABILITY_TASK_T7_INDOOR_ACCESSIBLE.id,
    USABILITY_TASK_T7_INDOOR_ACCESSIBLE.name,
    {
      analyticsProps: USABILITY_ANALYTICS_T7 as TaskSessionAnalyticsProps,
    },
  );

  const { completeTask: completeT6 } = t6;
  const { completeTask: completeT7 } = t7;

  const t6DoneRef = useRef(false);
  const t7DoneRef = useRef(false);

  useEffect(() => {
    if (isCrossBuilding || !currentPath || currentPath.length === 0) return;

    if (!t6DoneRef.current && !accessible) {
      t6DoneRef.current = true;
      completeT6(true, "indoor_shortest_path_displayed");
    }

    if (
      !t7DoneRef.current &&
      accessible &&
      pathTouchesUpperFloor(currentPath)
    ) {
      t7DoneRef.current = true;
      completeT7(true, "indoor_accessible_upper_floor_path_displayed");
    }
  }, [currentPath, accessible, isCrossBuilding, completeT6, completeT7]);
}
