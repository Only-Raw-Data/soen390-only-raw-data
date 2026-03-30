import { useCallback, useEffect, useRef } from "react";
import { useDirections } from "@context/DirectionsContext";
import {
  USABILITY_TASK_EXPLORE_TRANSPORT_MODES,
  USABILITY_TASK_GET_DIRECTIONS,
} from "@/constants/usabilityTasks";
import { useTaskSession } from "@hooks/useTaskSession";

/**
 * Task 3: directions flow through CTA. Task 4: mode exploration after route is shown.
 */
export function useDirectionsUsabilityTasks() {
  const { route, transportationMode } = useDirections();

  const t3 = useTaskSession(
    USABILITY_TASK_GET_DIRECTIONS.id,
    USABILITY_TASK_GET_DIRECTIONS.name,
  );

  const t4 = useTaskSession(
    USABILITY_TASK_EXPLORE_TRANSPORT_MODES.id,
    USABILITY_TASK_EXPLORE_TRANSPORT_MODES.name,
    { startWhen: "manual" },
  );

  const { beginTask: beginTask4, completeTask: completeTask4 } = t4;

  const routeSeenForTask4Ref = useRef(false);
  const modeWhenRouteShownRef = useRef(transportationMode);

  useEffect(() => {
    if (!route) return;
    if (routeSeenForTask4Ref.current) return;
    routeSeenForTask4Ref.current = true;
    beginTask4();
    modeWhenRouteShownRef.current = transportationMode;
  }, [route, beginTask4, transportationMode]);

  useEffect(() => {
    if (!route || !routeSeenForTask4Ref.current) return;
    if (transportationMode === modeWhenRouteShownRef.current) return;
    completeTask4(true, "transport_mode_switched_after_route");
    modeWhenRouteShownRef.current = transportationMode;
  }, [transportationMode, route, completeTask4]);

  const onGetDirectionsCta = useCallback(() => {
    t3.completeTask(true, "get_directions_cta_tapped");
  }, [t3]);

  return { onGetDirectionsCta };
}
