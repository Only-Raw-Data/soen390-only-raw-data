import { useEffect } from "react";
import type { Building, Campus } from "@/constants/buildings";
import {
  USABILITY_TASK_SELECT_BUILDING_INFO,
  USABILITY_TASK_TOGGLE_LOYOLA_CAMPUS,
} from "@/constants/usabilityTasks";
import { useTaskSession } from "@hooks/useTaskSession";

/**
 * Task 1: Loyola campus toggle. Task 2: building info panel.
 * Only active on the main Map tab (not the embedded map on Directions).
 */
export function useMapUsabilityTasks(
  enabled: boolean,
  selectedCampus: Campus,
  infoBuilding: Building | null,
) {
  const t1 = useTaskSession(
    USABILITY_TASK_TOGGLE_LOYOLA_CAMPUS.id,
    USABILITY_TASK_TOGGLE_LOYOLA_CAMPUS.name,
    { enabled },
  );
  const t2 = useTaskSession(
    USABILITY_TASK_SELECT_BUILDING_INFO.id,
    USABILITY_TASK_SELECT_BUILDING_INFO.name,
    { enabled },
  );

  useEffect(() => {
    if (!enabled) return;
    if (selectedCampus === "Loyola") {
      t1.completeTask(true, "loyola_campus_activated");
    }
  }, [enabled, selectedCampus, t1]);

  useEffect(() => {
    if (!enabled) return;
    if (infoBuilding) {
      t2.completeTask(true, "building_info_panel_displayed");
    }
  }, [enabled, infoBuilding, t2]);
}
