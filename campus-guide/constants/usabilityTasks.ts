/** Named usability test tasks for use with useTaskSession */

export const USABILITY_TASK_TOGGLE_LOYOLA_CAMPUS = {
  id: "toggle_loyola_campus",
  name: "Toggle to Loyola campus on the map",
} as const;

export const USABILITY_TASK_SELECT_BUILDING_INFO = {
  id: "select_building_info",
  name: "Open building information from the map",
} as const;

export const USABILITY_TASK_GET_DIRECTIONS = {
  id: "get_directions",
  name: "Get directions between two buildings",
} as const;

export const USABILITY_TASK_EXPLORE_TRANSPORT_MODES = {
  id: "explore_transport_modes",
  name: "Explore transportation modes after a route is shown",
} as const;
