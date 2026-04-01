import { useCallback, useEffect, useRef } from "react";
import { useDirections } from "@context/DirectionsContext";
import {
  USABILITY_ANALYTICS_T5,
  USABILITY_TASK_EXPLORE_TRANSPORT_MODES,
  USABILITY_TASK_GET_DIRECTIONS,
  USABILITY_TASK_T5_SHUTTLE,
} from "@/constants/usabilityTasks";
import type { TaskSessionAnalyticsProps } from "@hooks/useTaskSession";
import { useTaskSession } from "@hooks/useTaskSession";

/**
 * Task 3: directions flow through CTA. Task 4: mode exploration after route is shown.
 * Task T5: Concordia shuttle between campuses (US 2.6).
 */
export function useDirectionsUsabilityTasks() {
  const {
    route,
    transportationMode,
    startBuilding,
    destinationBuilding,
  } = useDirections();

  const t3 = useTaskSession(
    USABILITY_TASK_GET_DIRECTIONS.id,
    USABILITY_TASK_GET_DIRECTIONS.name,
  );

  const t4 = useTaskSession(
    USABILITY_TASK_EXPLORE_TRANSPORT_MODES.id,
    USABILITY_TASK_EXPLORE_TRANSPORT_MODES.name,
    { startWhen: "manual" },
  );

  const t5 = useTaskSession(
    USABILITY_TASK_T5_SHUTTLE.id,
    USABILITY_TASK_T5_SHUTTLE.name,
    {
      startWhen: "manual",
      analyticsProps: USABILITY_ANALYTICS_T5 as TaskSessionAnalyticsProps,
    },
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

  const isShuttleCrossCampus =
    transportationMode === "shuttle" &&
    !!startBuilding &&
    !!destinationBuilding &&
    startBuilding.campus !== destinationBuilding.campus;

  const { beginTask: beginT5, completeTask: completeT5 } = t5;

  useEffect(() => {
    if (!isShuttleCrossCampus) return;
    beginT5();
  }, [isShuttleCrossCampus, beginT5]);

  useEffect(() => {
    if (!route || !isShuttleCrossCampus) return;
    completeT5(true, "shuttle_cross_campus_route_displayed");
  }, [route, isShuttleCrossCampus, completeT5]);

  const onGetDirectionsCta = useCallback(() => {
    t3.completeTask(true, "get_directions_cta_tapped");
  }, [t3]);

  return { onGetDirectionsCta };
}
